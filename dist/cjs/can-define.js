/*can-define@0.6.4#can-define*/
'use strict';
'format cjs';
var event = require('can-event');
var eventLifecycle = require('can-event/lifecycle/lifecycle');
var canBatch = require('can-event/batch/batch');
var compute = require('can-compute');
var ObserveInfo = require('can-observe-info');
var canEach = require('can-util/js/each/each');
var isEmptyObject = require('can-util/js/is-empty-object/is-empty-object');
var assign = require('can-util/js/assign/assign');
var dev = require('can-util/js/dev/dev');
var CID = require('can-util/js/cid/cid');
var behaviors, eventsProto, getPropDefineBehavior, define, make, makeDefinition, replaceWith;
module.exports = define = function (objPrototype, defines) {
    var dataInitializers = {}, computedInitializers = {};
    canEach(defines, function (d, prop) {
        var definition;
        if (typeof d === 'string') {
            definition = { type: d };
        } else {
            definition = makeDefinition(prop, defines);
        }
        if (isEmptyObject(definition)) {
            definition = { type: '*' };
        }
        var type = definition.type;
        delete definition.type;
        if (type && isEmptyObject(definition) && type === '*') {
            Object.defineProperty(objPrototype, prop, {
                get: make.get.data(prop),
                set: make.set.events(prop, make.get.data(prop), make.set.data(prop), make.eventType.data(prop)),
                enumerable: true
            });
            return;
        }
        definition.type = type;
        var dataProperty = definition.get ? 'computed' : 'data', reader = make.read[dataProperty](prop), getter = make.get[dataProperty](prop), setter = make.set[dataProperty](prop), getInitialValue;
        var typeConvert = function (val) {
            return val;
        };
        if (definition.Type) {
            typeConvert = make.set.Type(prop, definition.Type, typeConvert);
        }
        if (type) {
            typeConvert = make.set.type(prop, type, typeConvert);
        }
        if (definition.value !== undefined || definition.Value !== undefined) {
            getInitialValue = make.get.defaultValue(prop, definition, typeConvert);
        }
        if (definition.get) {
            computedInitializers[prop] = make.compute(prop, definition.get, getInitialValue);
        } else if (getInitialValue) {
            dataInitializers[prop] = getInitialValue;
        }
        if (definition.get && definition.set) {
            setter = make.set.setter(prop, definition.set, make.read.lastSet(prop), setter, true);
        } else if (definition.set) {
            setter = make.set.events(prop, reader, setter, make.eventType[dataProperty](prop));
            setter = make.set.setter(prop, definition.set, reader, setter, false);
        } else if (!definition.get) {
            setter = make.set.events(prop, reader, setter, make.eventType[dataProperty](prop));
        }
        if (definition.Type) {
            setter = make.set.Type(prop, definition.Type, setter);
        }
        if (type) {
            setter = make.set.type(prop, type, setter);
        }
        Object.defineProperty(objPrototype, prop, {
            get: getter,
            set: setter,
            enumerable: 'serialize' in definition ? !!definition.serialize : !definition.get
        });
    });
    replaceWith(objPrototype, '_data', function () {
        var map = this;
        var data = {};
        for (var prop in dataInitializers) {
            replaceWith(data, prop, dataInitializers[prop].bind(map), true);
        }
        return data;
    });
    replaceWith(objPrototype, '_computed', function () {
        var map = this;
        var data = {};
        for (var prop in computedInitializers) {
            replaceWith(data, prop, computedInitializers[prop].bind(map));
        }
        return data;
    });
    for (var prop in eventsProto) {
        Object.defineProperty(objPrototype, prop, {
            enumerable: false,
            value: eventsProto[prop],
            configurable: true,
            writable: true
        });
    }
    return objPrototype;
};
define.Constructor = function (defines) {
    var constructor = function (props) {
        define.setup.call(this, props);
    };
    define(constructor.prototype, defines);
    return constructor;
};
make = {
    compute: function (prop, get, defaultValue) {
        return function () {
            var map = this;
            return {
                compute: compute.async(defaultValue && defaultValue(), get, map),
                count: 0,
                handler: function (ev, newVal, oldVal) {
                    canBatch.trigger.call(map, {
                        type: prop,
                        target: map
                    }, [
                        newVal,
                        oldVal
                    ]);
                }
            };
        };
    },
    set: {
        data: function (prop) {
            return function (newVal) {
                this._data[prop] = newVal;
            };
        },
        computed: function (prop) {
            return function (val) {
                this._computed[prop].compute(val);
            };
        },
        events: function (prop, getCurrent, setData, eventType) {
            return function (newVal) {
                var current = getCurrent.call(this);
                if (newVal !== current) {
                    setData.call(this, newVal);
                    canBatch.trigger.call(this, {
                        type: prop,
                        target: this
                    }, [
                        newVal,
                        current
                    ]);
                }
            };
        },
        setter: function (prop, setter, getCurrent, setEvents, hasGetter) {
            return function (value) {
                var self = this;
                canBatch.start();
                var setterCalled = false, current = getCurrent.call(this), setValue = setter.call(this, value, function (value) {
                        setEvents.call(self, value);
                        setterCalled = true;
                    }, current);
                if (setterCalled) {
                    canBatch.stop();
                } else {
                    if (hasGetter) {
                        if (setValue !== undefined) {
                            if (current !== setValue) {
                                setEvents.call(this, setValue);
                            }
                            canBatch.stop();
                        } else if (setter.length === 0) {
                            setEvents.call(this, value);
                            canBatch.stop();
                            return;
                        } else if (setter.length === 1) {
                            canBatch.stop();
                        } else {
                            canBatch.stop();
                            return;
                        }
                    } else {
                        if (setValue !== undefined) {
                            setEvents.call(this, setValue);
                            canBatch.stop();
                        } else if (setter.length === 0) {
                            setEvents.call(this, value);
                            canBatch.stop();
                            return;
                        } else if (setter.length === 1) {
                            setEvents.call(this, undefined);
                            canBatch.stop();
                        } else {
                            canBatch.stop();
                            return;
                        }
                    }
                }
            };
        },
        type: function (prop, type, set) {
            if (typeof type === 'string') {
                type = define.types[type];
            }
            if (typeof type === 'object') {
                var SubType = define.Constructor(type);
                return function (newValue) {
                    if (newValue instanceof SubType) {
                        return set.call(this, newValue);
                    } else {
                        return set.call(this, new SubType(newValue));
                    }
                };
            } else {
                return function (newValue) {
                    return set.call(this, type.call(this, newValue, prop));
                };
            }
        },
        Type: function (prop, Type, set) {
            if (typeof Type === 'object') {
                Type = define.constructor(Type);
            }
            return function (newValue) {
                if (newValue instanceof Type) {
                    return set.call(this, newValue);
                } else {
                    return set.call(this, new Type(newValue));
                }
            };
        }
    },
    eventType: {
        data: function (prop) {
            return function (newVal, oldVal) {
                return oldVal !== undefined || this._data.hasOwnProperty(prop) ? 'set' : 'add';
            };
        },
        computed: function () {
            return function () {
                return 'set';
            };
        }
    },
    read: {
        data: function (prop) {
            return function () {
                return this._data[prop];
            };
        },
        computed: function (prop) {
            return function () {
                return this._computed[prop].compute();
            };
        },
        lastSet: function (prop) {
            return function () {
                return this._computed[prop].compute.computeInstance.lastSetValue.get();
            };
        }
    },
    get: {
        defaultValue: function (prop, definition, typeConvert) {
            return function () {
                var value = definition.value;
                if (value !== undefined) {
                    if (typeof value === 'function') {
                        value = value.call(this);
                    }
                    return typeConvert(value);
                }
                var Value = definition.Value;
                if (Value) {
                    return typeConvert(new Value());
                }
            };
        },
        data: function (prop) {
            return function () {
                ObserveInfo.observe(this, prop);
                return this._data[prop];
            };
        },
        computed: function (prop) {
            return function () {
                return this._computed[prop].compute();
            };
        }
    }
};
behaviors = [
    'get',
    'set',
    'value',
    'Value',
    'type',
    'Type',
    'serialize'
];
getPropDefineBehavior = function (behavior, prop, defines) {
    var defaultProp;
    if (defines) {
        prop = defines[prop];
        defaultProp = defines['*'];
        if (prop && prop[behavior] !== undefined) {
            return prop[behavior];
        } else if (defaultProp && defaultProp[behavior] !== undefined) {
            return defaultProp[behavior];
        }
    }
};
makeDefinition = function (prop, defines) {
    var definition = {};
    behaviors.forEach(function (behavior) {
        var behaviorDef = getPropDefineBehavior(behavior, prop, defines);
        if (behaviorDef != null) {
            definition[behavior] = behaviorDef;
        }
    });
    return definition;
};
replaceWith = function (obj, prop, cb, writable) {
    Object.defineProperty(obj, prop, {
        configurable: true,
        get: function () {
            var value = cb.call(this, obj, prop);
            Object.defineProperty(this, prop, {
                value: value,
                writable: !!writable
            });
            return value;
        }
    });
};
eventsProto = assign({}, event);
assign(eventsProto, {
    _eventSetup: function () {
    },
    _eventTeardown: function () {
    },
    addEventListener: function (eventName, handler) {
        var computedBinding = this._computed && this._computed[eventName];
        if (computedBinding && computedBinding.compute) {
            if (!computedBinding.count) {
                computedBinding.count = 1;
                computedBinding.compute.addEventListener('change', computedBinding.handler);
            } else {
                computedBinding.count++;
            }
        }
        return eventLifecycle.addAndSetup.apply(this, arguments);
    },
    removeEventListener: function (eventName, handler) {
        var computedBinding = this._computed && this._computed[eventName];
        if (computedBinding) {
            if (computedBinding.count === 1) {
                computedBinding.count = 0;
                computedBinding.compute.removeEventListener('change', computedBinding.handler);
            } else {
                computedBinding.count--;
            }
        }
        return eventLifecycle.removeAndTeardown.apply(this, arguments);
    },
    props: function () {
        var obj = {};
        for (var prop in this) {
            obj[prop] = this[prop];
        }
        return obj;
    }
});
eventsProto.on = eventsProto.bind = eventsProto.addEventListener;
eventsProto.off = eventsProto.unbind = eventsProto.removeEventListener;
delete eventsProto.one;
var defineConfigurableAndNotEnumerable = function (obj, prop, value) {
    Object.defineProperty(obj, prop, {
        configurable: true,
        enumerable: false,
        writable: true,
        value: value
    });
};
define.setup = function (props) {
    defineConfigurableAndNotEnumerable(this, '_cid');
    defineConfigurableAndNotEnumerable(this, '__bindEvents', {});
    defineConfigurableAndNotEnumerable(this, '_bindings', 0);
    CID(this);
    assign(this, props);
};
define.replaceWith = replaceWith;
define.eventsProto = eventsProto;
define.defineConfigurableAndNotEnumerable = defineConfigurableAndNotEnumerable;
define.make = make;
define.types = {
    'date': function (str) {
        var type = typeof str;
        if (type === 'string') {
            str = Date.parse(str);
            return isNaN(str) ? null : new Date(str);
        } else if (type === 'number') {
            return new Date(str);
        } else {
            return str;
        }
    },
    'number': function (val) {
        if (val == null) {
            return val;
        }
        return +val;
    },
    'boolean': function (val) {
        if (val === 'false' || val === '0' || !val) {
            return false;
        }
        return true;
    },
    'htmlbool': function (val) {
        return typeof val === 'string' || !!val;
    },
    '*': function (val) {
        return val;
    },
    'string': function (val) {
        if (val == null) {
            return val;
        }
        return '' + val;
    },
    'compute': {
        set: function (newValue, setVal, setErr, oldValue) {
            if (newValue.isComputed) {
                return newValue;
            }
            if (oldValue && oldValue.isComputed) {
                oldValue(newValue);
                return oldValue;
            }
            return newValue;
        },
        get: function (value) {
            return value && value.isComputed ? value() : value;
        }
    }
};