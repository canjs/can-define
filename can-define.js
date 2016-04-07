"format cjs";

var can = require("can/util/");
var event = require("can/event/");

require("can/map/map_helpers");
require("can/compute/");

var behaviors, eventsProto, getPropDefineBehavior, define,
	make, makeDefinition, replaceWith;

module.exports = define = function(objPrototype, defines) {

	// default property definitions on _data
	var dataInitializers = {},
		// computed property definitions on _computed
		computedInitializers = {};

    // Goes through each property definition and creates
    // a `getter` and `setter` function for `Object.defineProperty`.
    can.each(defines, function(d, prop){

		// Figure out the `definition` object.
		var definition;
		if(typeof d === "string") {
			definition = {type: d};
		} else {
			definition = makeDefinition(prop, defines);
		}
		if(can.isEmptyObject(definition)) {
			definition = {type: "*"};
		}

		var type = definition.type;
		delete definition.type;

		// Special case definitions that have only `type: "*"`.
		if(type && can.isEmptyObject(definition) && type === "*") {
			Object.defineProperty(objPrototype, prop, {
				get: make.get.data(prop),
				set: make.set.events(prop, make.get.data(prop), make.set.data(prop), make.eventType.data(prop) ),
				enumerable: true
			});
			return;
		}
		definition.type = type;

		// Where the value is stored.  If there is a `get` the source of the value
		// will be a compute in `this._computed[prop]`.  If not, the source of the
		// value will be in `this._data[prop]`.
		var dataProperty = definition.get ? "computed" : "data",

			// simple functions that all read/get/set to the right place.
			// - reader - reads the value but does not observe.
			// - getter - reads the value and notifies observers.
			// - setter - sets the value.
			reader = make.read[dataProperty](prop),
			getter = make.get[dataProperty](prop),
			setter = make.set[dataProperty](prop),
			getInitialValue;


		// Determine the type converter
		var typeConvert = function(val){ return val; };

		if(definition.Type) {
			typeConvert =  make.set.Type(prop, definition.Type, typeConvert);
		}
		if(type) {
			typeConvert =  make.set.type(prop, type, typeConvert);
		}

		// Determine a function that will provide the initial property value.
		if( (definition.value !== undefined || definition.Value !== undefined) ) {
			getInitialValue = make.get.defaultValue(prop, definition, typeConvert);
		}
		// If property has a getter, create the compute that stores its data.
		if(definition.get) {
			computedInitializers[prop] = make.compute(prop, definition.get, getInitialValue);
		}
		// If the property isn't a getter, but has an initial value, setup a
		// default value on `this._data[prop]`.
		else if(getInitialValue) {
			dataInitializers[prop] = getInitialValue;
		}


		// Define setter behavior.

		// If there's a `get` and `set`, make the setter get the `lastSetValue` on the
		// `get`'s compute.
		if(definition.get && definition.set) {
			setter = make.set.setter(prop, definition.set, make.read.lastSet(prop), setter, true);
		}
		// If there's a `set` and no `get`,
		else if(definition.set) {
			// make a set that produces events.
			setter = make.set.events(prop, reader, setter, make.eventType[dataProperty](prop) );
			// Add `set` functionality to the setter.
			setter = make.set.setter(prop, definition.set, reader, setter, false);
		}
		// If there's niether `set` or `get`,
		else if(!definition.get){
			// make a set that produces events.
			setter = make.set.events(prop, reader, setter, make.eventType[dataProperty](prop) );
		}

		// Add type behavior to the setter.
		if(definition.Type) {
			setter =  make.set.Type(prop, definition.Type, setter);
		}
		if(type) {
			setter =  make.set.type(prop, type, setter);
		}

		// Define the property.
		Object.defineProperty(objPrototype, prop, {
			get:getter,
			set: setter,
			enumerable: !definition.get
		});
    });

    // Places a `_data` on the prototype that when first called replaces itself
    // with a `_data` object local to the instance.  It also defines getters
    // for any value that has a default value.
    replaceWith(objPrototype, "_data", function(){
		var map = this;
		var data = {};
		for(var prop in dataInitializers) {
			replaceWith(data, prop, dataInitializers[prop].bind(map), true);
		}
		return data;
	});

    // Places a `_computed` on the prototype that when first called replaces itself
    // with a `_computed` object local to the instance.  It also defines getters
    // that will create the property's compute when read.
    replaceWith(objPrototype, "_computed", function(){
		var map = this;
		var data = {};
		for(var prop in computedInitializers) {
			replaceWith(data, prop, computedInitializers[prop].bind(map));
		}
		return data;
	});


	// Add necessary event methods to this object.
    for(var prop in eventsProto) {
    	Object.defineProperty(objPrototype, prop, {
    		enumerable:false,
    		value: eventsProto[prop]
    	});
    }


    return objPrototype;
};

// Makes a simple constructor function.
define.Constructor = function(defines){
    var constructor = function(props){
		can.simpleExtend(this, props);
	};
    define(constructor.prototype, defines);
    return constructor;
};

// A bunch of helper functions that are used to create various behaviors.
make = {
	// Returns a function that creates the `_computed` prop.
	compute: function(prop, get, defaultValue){
		return function(){
			var map = this;
			return {
				compute: can.compute.async(defaultValue && defaultValue(), get, map),
				count: 0,
				handler: function (ev, newVal, oldVal) {
					can.batch.trigger(map, {
						type: prop,
						target: map
					}, [newVal, oldVal]);
				}
			};
		};
	},
	// Set related helpers.
	set: {
		data: function(prop){
			return function(newVal){
				this._data[prop] = newVal;
			};
		},
		computed: function(prop){
			return function(val){
				this._computed[prop].compute(val);
			};
		},
		events: function(prop, getCurrent, setData, eventType){
			return function(newVal){
				var current = getCurrent.call(this);
				if(newVal !== current) {
					setData.call(this, newVal);

					can.batch.trigger(this, {
						type: prop,
						target: this
					}, [newVal, current]);
				}
			};
		},
		setter: function (prop, setter, getCurrent, setEvents, hasGetter) {
			return function(value){
				//!steal-remove-start
				var asyncTimer;
				//!steal-remove-end

				var self = this;

				// call the setter, if returned value is undefined,
				// this means the setter is async so we
				// do not call update property and return right away

				can.batch.start();
				var setterCalled = false,
					current = getCurrent.call(this),
					setValue = setter.call(this, value, function (value) {
						setEvents.call(self, value);

						setterCalled = true;
						//!steal-remove-start
						clearTimeout(asyncTimer);
						//!steal-remove-end
					}, current);

				if(setterCalled) {
					can.batch.stop();
				} else {
					if(hasGetter) {
						// we got a return value
						if(setValue !== undefined) {
							// if the current `set` value is returned, don't set
							// because current might be the `lastSetVal` of the internal compute.
							if(current !== setValue) {
								setEvents.call(this, setValue);
							}
							can.batch.stop();
						}
						// this is a side effect, it didn't take a value
						// so use the original set value
						else if(setter.length === 0) {
							setEvents.call(this, value);
							can.batch.stop();
							return;
						}
						// it took a value
						else if(setter.length === 1) {
							// if we have a getter, and undefined was returned,
							// we should assume this is setting the getters properties
							// and we shouldn't do anything.
							can.batch.stop();
						}
						// we are expecting something
						else {
							//!steal-remove-start
							asyncTimer = setTimeout(function () {
								can.dev.warn('can/map/setter.js: Setter "' + prop + '" did not return a value or call the setter callback.');
							}, can.dev.warnTimeout);
							//!steal-remove-end
							can.batch.stop();
							return;
						}
					}
					else {
						// we got a return value
						if(setValue !== undefined) {
							// if the current `set` value is returned, don't set
							// because current might be the `lastSetVal` of the internal compute.
							setEvents.call(this, setValue);
							can.batch.stop();
						}
						// this is a side effect, it didn't take a value
						// so use the original set value
						else if(setter.length === 0) {
							setEvents.call(this, value);
							can.batch.stop();
							return;
						}
						// it took a value
						else if(setter.length === 1) {
							// if we don't have a getter, we should probably be setting the
							// value to undefined
							setEvents.call(this, undefined);
							can.batch.stop();
						}
						// we are expecting something
						else {
							//!steal-remove-start
							asyncTimer = setTimeout(function () {
								can.dev.warn('can/map/setter.js: Setter "' + prop + '" did not return a value or call the setter callback.');
							}, can.dev.warnTimeout);
							//!steal-remove-end
							can.batch.stop();
							return;
						}
					}


				}
			};
		},
		type: function(prop, type, set){
			if (typeof type === "string") {
				type = define.types[type];
			}

			if(typeof type === "object") {

				var SubType = define.Constructor(type);

				return function(newValue){
					if(newValue instanceof SubType) {
						return set.call(this, newValue);
					} else {
						return set.call(this, new SubType(newValue));
					}
				};

			} else {
				return function(newValue){
					return set.call(this, type.call(this, newValue, prop) );
				};
			}
		},
		Type: function(prop, Type, set){
			// `type`: {foo: "string"}
			if(typeof Type === "object") {
				Type = define.constructor(Type);
			}
			return function(newValue){
				if(newValue instanceof Type) {
					return set.call(this, newValue);
				} else {
					return set.call(this, new Type(newValue));
				}
			};
		}
	},
	// Helpes that indicate what the event type should be.  These probably aren't needed.
	eventType: {
		data: function(prop){
			return function(newVal, oldVal){
				return oldVal !== undefined || this._data.hasOwnProperty(prop) ? "set" : "add";
			};
		},
		computed: function(){
			return function(){
				return "set";
			};
		}
	},
	// Helpers that read the data in a non-observable way.
	read: {
		data: function(prop){
			return function(){
				return this._data[prop];
			};
		},
		computed: function(prop){
			// might want to protect this
			return function(){
				return this._computed[prop].compute();
			};
		},
		lastSet: function(prop){
			return function(){
				return this._computed[prop].compute.computeInstance.lastSetValue.get();
			};
		}
	},
	// Helpers that read the data in an observable way.
	get: {
		// uses the default value
		defaultValue: function(prop, definition, typeConvert){
			return function(){
				var value = definition.value;
                if (value !== undefined) {
                    if (typeof value === "function") {
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
		data: function(prop){
			return function(){
				can.__observe(this, prop);
				return this._data[prop];
			};
		},
		computed: function(prop){
			return function(){
				return this._computed[prop].compute();
			};
		}
	}
};

behaviors = ["get","set","value","Value", "type","Type","serialize"];

getPropDefineBehavior = function(behavior, prop, defines) {
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

makeDefinition = function(prop, defines){
	var definition = {};
	behaviors.forEach(function(behavior){
		var behaviorDef = getPropDefineBehavior(behavior, prop, defines);
		if(behaviorDef != null) {
			definition[behavior] = behaviorDef;
		}
	});
	return definition;
};

replaceWith = function(obj, prop, cb, writable) {
	Object.defineProperty(obj, prop, {
		configurable: true,
		get: function(){
			var value = cb.call(this, obj, prop);
			Object.defineProperty(this, prop,{
				value: value,
				writable: !!writable
			});
			return value;
		}
	});
};

eventsProto = can.simpleExtend({}, event);
can.simpleExtend(eventsProto, {
	bind: function (eventName, handler) {

		var computedBinding = this._computed && this._computed[eventName];
		if (computedBinding && computedBinding.compute) {
			if (!computedBinding.count) {
				computedBinding.count = 1;
				computedBinding.compute.bind("change", computedBinding.handler);
			} else {
				computedBinding.count++;
			}

		}

		return can.bindAndSetup.apply(this, arguments);
	},

	// ### unbind
	// Stops listening to an event.
	// If this is the last listener of a computed property,
	// stop forwarding events of the computed property to this map.
	unbind: function (eventName, handler) {
		var computedBinding = this._computed && this._computed[eventName];
		if (computedBinding) {
			if (computedBinding.count === 1) {
				computedBinding.count = 0;
				computedBinding.compute.unbind("change", computedBinding.handler);
			} else {
				computedBinding.count--;
			}

		}

		return can.unbindAndTeardown.apply(this, arguments);

	},
	props: function(){
		var obj = {};
		for(var prop in this) {
			obj[prop] = this[prop];
		}
		return obj;
	}
});
delete eventsProto.one;




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
		if(val == null) {
			return val;
		}
		return +(val);
	},
	'boolean': function (val) {
		if (val === 'false' || val === '0' || !val) {
			return false;
		}
		return true;
	},
	/**
	 * Implements HTML-style boolean logic for attribute strings, where
	 * any string, including "", is truthy.
	 */
	'htmlbool': function(val) {
		return typeof val === "string" || !!val;
	},
	'*': function (val) {
		return val;
	},
	'string': function (val) {
		if(val == null) {
			return val;
		}
		return '' + val;
	},
	'compute': {
		set: function(newValue, setVal, setErr, oldValue){
			if(newValue.isComputed) {
				return newValue;
			}
			if(oldValue && oldValue.isComputed) {
				oldValue(newValue);
				return oldValue;
			}
			return newValue;
		},
		get: function(value){
			return value && value.isComputed ? value() : value;
		}
	}
};