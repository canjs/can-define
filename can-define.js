"use strict";
"format cjs";


var event = require("can-event");
var eventLifecycle = require("can-event/lifecycle/lifecycle");
var canBatch = require("can-event/batch/batch");
var canEvent = require("can-event");

var compute = require("can-compute");
var Observation = require("can-observation");

var isEmptyObject = require("can-util/js/is-empty-object/is-empty-object");
var assign = require("can-util/js/assign/assign");
var dev = require("can-util/js/dev/dev");
var CID = require("can-cid");
var isPlainObject = require("can-util/js/is-plain-object/is-plain-object");
var isArray = require("can-util/js/is-array/is-array");
var types = require("can-types");
var each = require("can-util/js/each/each");
var defaults = require("can-util/js/defaults/defaults");
var stringToAny = require("can-util/js/string-to-any/string-to-any");
var ns = require("can-namespace");

var eventsProto, define,
	make, makeDefinition, replaceWith, getDefinitionsAndMethods,
	isDefineType, getDefinitionOrMethod;

var defineConfigurableAndNotEnumerable = function(obj, prop, value) {
	Object.defineProperty(obj, prop, {
		configurable: true,
		enumerable: false,
		writable: true,
		value: value
	});
};

var defineNotWritable = function(obj, prop, value) {
	Object.defineProperty(obj, prop, {
		configurable: true,
		enumerable: false,
		writable: false,
		value: value
	});
};

var eachPropertyDescriptor = function(map, cb){
	for(var prop in map) {
		if(map.hasOwnProperty(prop)) {
			cb(prop, Object.getOwnPropertyDescriptor(map,prop));
		}
	}
};


module.exports = define = ns.define = function(objPrototype, defines, baseDefine) {
	// default property definitions on _data
	var dataInitializers = Object.create(baseDefine ? baseDefine.dataInitializers : null),
		// computed property definitions on _computed
		computedInitializers = Object.create(baseDefine ? baseDefine.computedInitializers : null);

	var result = getDefinitionsAndMethods(defines, baseDefine);
	result.dataInitializers = dataInitializers;
	result.computedInitializers = computedInitializers;


	// Goes through each property definition and creates
	// a `getter` and `setter` function for `Object.defineProperty`.
	each(result.definitions, function(definition, property){
		define.property(objPrototype, property, definition, dataInitializers, computedInitializers);
	});

	// Places a `_data` on the prototype that when first called replaces itself
	// with a `_data` object local to the instance.  It also defines getters
	// for any value that has a default value.
	replaceWith(objPrototype, "_data", function() {
		var map = this;
		var data = {};
		for (var prop in dataInitializers) {
			replaceWith(data, prop, dataInitializers[prop].bind(map), true);
		}
		return data;
	});

	// Places a `_computed` on the prototype that when first called replaces itself
	// with a `_computed` object local to the instance.  It also defines getters
	// that will create the property's compute when read.
	replaceWith(objPrototype, "_computed", function() {
		var map = this;
		var data = Object.create(null);
		for (var prop in computedInitializers) {
			replaceWith(data, prop, computedInitializers[prop].bind(map));
		}
		return data;
	});


	// Add necessary event methods to this object.
	for (var prop in eventsProto) {
		Object.defineProperty(objPrototype, prop, {
			enumerable: false,
			value: eventsProto[prop],
			configurable: true,
			writable: true
		});
	}
	// add so instance defs can be dynamically added
	Object.defineProperty(objPrototype,"_define",{
		enumerable: false,
		value: result,
		configurable: true,
		writable: true
	});

	// Places Symbol.iterator or @@iterator on the prototype
	// so that this can be iterated with for/of and can-util/js/each/each
	if(!objPrototype[types.iterator]) {
		defineConfigurableAndNotEnumerable(objPrototype, types.iterator, function(){
			return new define.Iterator(this);
		});
	}

	return result;
};

define.extensions = function () {};

var onlyType = function(obj){
	for(var prop in obj) {
		if(prop !== "type") {
			return false;
		}
	}
	return true;
};

define.property = function(objPrototype, prop, definition, dataInitializers, computedInitializers) {
	var propertyDefinition = define.extensions.apply(this, arguments);

	if (propertyDefinition) {
		definition = propertyDefinition;
	}

	var type = definition.type;

	// Special case definitions that have only `type: "*"`.
	if (type && onlyType(definition) && type === define.types["*"]) {
		Object.defineProperty(objPrototype, prop, {
			get: make.get.data(prop),
			set: make.set.events(prop, make.get.data(prop), make.set.data(prop), make.eventType.data(prop)),
			enumerable: true,
			configurable: true
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
	var typeConvert = function(val) {
		return val;
	};

	if (definition.Type) {
		typeConvert = make.set.Type(prop, definition.Type, typeConvert);
	}
	if (type) {
		typeConvert = make.set.type(prop, type, typeConvert);
	}

	// make a setter that's going to fire of events
	var eventsSetter = make.set.events(prop, reader, setter, make.eventType[dataProperty](prop));

	// Determine a function that will provide the initial property value.
	if ((definition.value !== undefined || definition.Value !== undefined)) {
		getInitialValue = Observation.ignore(make.get.defaultValue(prop, definition, typeConvert, eventsSetter));
	}

	// If property has a getter, create the compute that stores its data.
	if (definition.get) {
		computedInitializers[prop] = make.compute(prop, definition.get, getInitialValue);
	}
	// If the property isn't a getter, but has an initial value, setup a
	// default value on `this._data[prop]`.
	else if (getInitialValue) {
		dataInitializers[prop] = getInitialValue;
	}


	// Define setter behavior.

	// If there's a `get` and `set`, make the setter get the `lastSetValue` on the
	// `get`'s compute.
	if (definition.get && definition.set) {
		// the compute will set off events, so we can use the basic setter
		setter = make.set.setter(prop, definition.set, make.read.lastSet(prop), setter, true);
	}
	// If there's a `set` and no `get`,
	else if (definition.set) {
		// Add `set` functionality to the eventSetter.
		setter = make.set.setter(prop, definition.set, reader, eventsSetter, false);
	}
	// If there's niether `set` or `get`,
	else if (!definition.get) {
		// make a set that produces events.
		setter = eventsSetter;
	}

	// Add type behavior to the setter.
	if (type) {
		setter = make.set.type(prop, type, setter);
	}
	if (definition.Type) {
		setter = make.set.Type(prop, definition.Type, setter);
	}

	// Define the property.
	Object.defineProperty(objPrototype, prop, {
		get: getter,
		set: setter,
		enumerable: "serialize" in definition ? !!definition.serialize : !definition.get,
		configurable: true
	});
};


// Makes a simple constructor function.
define.Constructor = function(defines) {
	var constructor = function(props) {
		define.setup.call(this, props);
	};
	define(constructor.prototype, defines);
	return constructor;
};

// A bunch of helper functions that are used to create various behaviors.
make = {
	// Returns a function that creates the `_computed` prop.
	compute: function(prop, get, defaultValueFn) {
		return function() {
			var map = this,
				defaultValue = defaultValueFn && defaultValueFn.call(this),
				computeFn;

			if (defaultValue) {
				computeFn = defaultValue.isComputed ?
					defaultValue :
					compute.async(defaultValue, get, map);
			} else {
				computeFn = compute.async(defaultValue, get, map);
			}

			return {
				compute: computeFn,
				count: 0,
				handler: function(ev, newVal, oldVal) {
					canEvent.dispatch.call(map, {
						type: prop,
						target: map
					}, [newVal, oldVal]);
				}
			};
		};
	},
	// Set related helpers.
	set: {
		data: function(prop) {
			return function(newVal) {
				this._data[prop] = newVal;
			};
		},
		computed: function(prop) {
			return function(val) {
				this._computed[prop].compute(val);
			};
		},
		events: function(prop, getCurrent, setData, eventType) {
			return function(newVal) {
				if (this.__inSetup) {
					setData.call(this, newVal);
				}
				else {
					var current = getCurrent.call(this);
					if (newVal !== current) {
						setData.call(this, newVal);

						canEvent.dispatch.call(this, {
							type: prop,
							target: this
						}, [newVal, current]);
					}
				}
			};
		},
		setter: function(prop, setter, getCurrent, setEvents, hasGetter) {
			return function(value) {
				//!steal-remove-start
				var asyncTimer;
				//!steal-remove-end

				var self = this;

				// call the setter, if returned value is undefined,
				// this means the setter is async so we
				// do not call update property and return right away

				canBatch.start();
				var setterCalled = false,
					current = getCurrent.call(this),
					setValue = setter.call(this, value, function(value) {
						setEvents.call(self, value);

						setterCalled = true;
						//!steal-remove-start
						clearTimeout(asyncTimer);
						//!steal-remove-end
					}, current);

				if (setterCalled) {
					canBatch.stop();
				} else {
					if (hasGetter) {
						// we got a return value
						if (setValue !== undefined) {
							// if the current `set` value is returned, don't set
							// because current might be the `lastSetVal` of the internal compute.
							if (current !== setValue) {
								setEvents.call(this, setValue);
							}
							canBatch.stop();
						}
						// this is a side effect, it didn't take a value
						// so use the original set value
						else if (setter.length === 0) {
							setEvents.call(this, value);
							canBatch.stop();
							return;
						}
						// it took a value
						else if (setter.length === 1) {
							// if we have a getter, and undefined was returned,
							// we should assume this is setting the getters properties
							// and we shouldn't do anything.
							canBatch.stop();
						}
						// we are expecting something
						else {
							//!steal-remove-start
							asyncTimer = setTimeout(function() {
								dev.warn('can/map/setter.js: Setter "' + prop + '" did not return a value or call the setter callback.');
							}, dev.warnTimeout);
							//!steal-remove-end
							canBatch.stop();
							return;
						}
					} else {
						// we got a return value
						if (setValue !== undefined) {
							// if the current `set` value is returned, don't set
							// because current might be the `lastSetVal` of the internal compute.
							setEvents.call(this, setValue);
							canBatch.stop();
						}
						// this is a side effect, it didn't take a value
						// so use the original set value
						else if (setter.length === 0) {
							setEvents.call(this, value);
							canBatch.stop();
							return;
						}
						// it took a value
						else if (setter.length === 1) {
							// if we don't have a getter, we should probably be setting the
							// value to undefined
							setEvents.call(this, undefined);
							canBatch.stop();
						}
						// we are expecting something
						else {
							//!steal-remove-start
							asyncTimer = setTimeout(function() {
								dev.warn('can/map/setter.js: Setter "' + prop + '" did not return a value or call the setter callback.');
							}, dev.warnTimeout);
							//!steal-remove-end
							canBatch.stop();
							return;
						}
					}


				}
			};
		},
		type: function(prop, type, set) {

			if (typeof type === "object") {

				return make.set.Type(prop, type, set);

			} else {
				return function(newValue) {
					return set.call(this, type.call(this, newValue, prop));
				};
			}
		},
		Type: function(prop, Type, set) {
			// `type`: {foo: "string"}
			if(isArray(Type) && types.DefineList) {
				Type = types.DefineList.extend({
					"#": Type[0]
				});
			} else if (typeof Type === "object") {
				if(types.DefineMap) {
					Type = types.DefineMap.extend(Type);
				} else {
					Type = define.constructor(Type);
				}
			}
			return function(newValue) {
				if (newValue instanceof Type || newValue == null) {
					return set.call(this, newValue);
				} else {
					return set.call(this, new Type(newValue));
				}
			};
		}
	},
	// Helpes that indicate what the event type should be.  These probably aren't needed.
	eventType: {
		data: function(prop) {
			return function(newVal, oldVal) {
				return oldVal !== undefined || this._data.hasOwnProperty(prop) ? "set" : "add";
			};
		},
		computed: function() {
			return function() {
				return "set";
			};
		}
	},
	// Helpers that read the data in a non-observable way.
	read: {
		data: function(prop) {
			return function() {
				return this._data[prop];
			};
		},
		computed: function(prop) {
			// might want to protect this
			return function() {
				return this._computed[prop].compute();
			};
		},
		lastSet: function(prop) {
			return function() {
				var lastSetValue = this._computed[prop].compute.computeInstance.lastSetValue;
				return lastSetValue && lastSetValue.get();
			};
		}
	},
	// Helpers that read the data in an observable way.
	get: {
		// uses the default value
		defaultValue: function(prop, definition, typeConvert, callSetter) {
			return function() {
				var value = definition.value;
				if (value !== undefined) {
					if (typeof value === "function") {
						value = value.call(this);
					}
					value = typeConvert(value);
				}
				else {
					var Value = definition.Value;
					if (Value) {
						value = typeConvert(new Value());
					}
				}
				if(definition.set) {
					// TODO: there's almost certainly a faster way of making this happen
					// But this is maintainable.

					var VALUE;
					var sync = true;

					var setter = make.set.setter(prop, definition.set, function(){}, function(value){
						if(sync) {
							VALUE = value;
						} else {
							callSetter.call(this, value);
						}
					}, definition.get);

					setter.call(this,value);
					sync= false;

					// VALUE will be undefined if the callback is never called.
					return VALUE;


				}
				return value;
			};
		},
		data: function(prop) {
			return function() {
				if (!this.__inSetup) {
					Observation.add(this, prop);
				}

				return this._data[prop];
			};
		},
		computed: function(prop) {
			return function() {
				return this._computed[prop].compute();
			};
		}
	}
};

define.behaviors = ["get", "set", "value", "Value", "type", "Type", "serialize"];

var addDefinition = function(definition, behavior, value) {
	if(behavior === "type") {
		var behaviorDef = value;
		if(typeof behaviorDef === "string") {
			behaviorDef = define.types[behaviorDef];
			if(typeof behaviorDef === "object") {
				assign(definition, behaviorDef);
				behaviorDef = behaviorDef[behavior];
			}
		}
		definition[behavior] = behaviorDef;
	}
	else {
		definition[behavior] = value;
	}
};

makeDefinition = function(prop, def, defaultDefinition) {
	var definition = {};

	each(def, function(value, behavior) {
		addDefinition(definition, behavior, value);
	});
	// only add default if it doesn't exist
	each(defaultDefinition, function(value, prop){
		if(definition[prop] === undefined) {
			if(prop !== "type" && prop !== "Type") {
				definition[prop] = value;
			}
		}
	});
	// if there's no type definition, take it from the defaultDefinition
	if(!definition.type && !definition.Type) {
		defaults(definition, defaultDefinition);
	}


	if( isEmptyObject(definition) ) {
		definition.type = define.types["*"];
	}
	return definition;
};

getDefinitionOrMethod = function(prop, value, defaultDefinition){
	var definition;
	if(typeof value === "string") {
		definition = {type: value};
	}
	else if(typeof value === "function") {
		if(types.isConstructor(value)) {
			definition = {Type: value};
		} else if(isDefineType(value)) {
			definition = {type: value};
		}
		// or leaves as a function
	} else if( isArray(value) ) {
		definition = {Type: value};
	} else if( isPlainObject(value) ){
		definition = value;
	}

	if(definition) {
		return makeDefinition(prop, definition, defaultDefinition);
	} else {
		return value;
	}
};
getDefinitionsAndMethods = function(defines, baseDefines) {
	// make it so the definitions include base definitions on the proto
	var definitions = Object.create(baseDefines ? baseDefines.definitions : null);
	var methods = {};
	// first lets get a default if it exists
	var defaults = defines["*"],
		defaultDefinition;
	if(defaults) {
		delete defines["*"];
		defaultDefinition = getDefinitionOrMethod("*", defaults, {});
	} else {
		defaultDefinition = Object.create(null);
	}

	eachPropertyDescriptor(defines, function( prop, propertyDescriptor ) {

		var value;
		if(propertyDescriptor.get || propertyDescriptor.set) {
			value = {get: propertyDescriptor.get, set: propertyDescriptor.set};
		} else {
			value = propertyDescriptor.value;
		}

		if(prop === "constructor") {
			methods[prop] = value;
			return;
		} else {
			var result = getDefinitionOrMethod(prop, value, defaultDefinition);
			if(result && typeof result === "object") {
				definitions[prop] = result;
			} else {
				methods[prop] = result;
			}
		}
	});
	if(defaults) {
		defines["*"] = defaults;
	}
	return {definitions: definitions, methods: methods, defaultDefinition: defaultDefinition};
};

replaceWith = function(obj, prop, cb, writable) {
	Object.defineProperty(obj, prop, {
		configurable: true,
		get: function() {
			Object.defineProperty(this, prop, {
				value: undefined,
				writable: true
			});
			var value = cb.call(this, obj, prop);
			Object.defineProperty(this, prop, {
				value: value,
				writable: !!writable
			});
			return value;
		},
		set: function(value){
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
	_eventSetup: function() {},
	_eventTeardown: function() {},
	addEventListener: function(eventName, handler) {

		var computedBinding = this._computed && this._computed[eventName];
		if (computedBinding && computedBinding.compute) {
			if (!computedBinding.count) {
				computedBinding.count = 1;
				computedBinding.compute.addEventListener("change", computedBinding.handler);
			} else {
				computedBinding.count++;
			}

		}

		return eventLifecycle.addAndSetup.apply(this, arguments);
	},

	// ### unbind
	// Stops listening to an event.
	// If this is the last listener of a computed property,
	// stop forwarding events of the computed property to this map.
	removeEventListener: function(eventName, handler) {
		var computedBinding = this._computed && this._computed[eventName];
		if (computedBinding) {
			if (computedBinding.count === 1) {
				computedBinding.count = 0;
				computedBinding.compute.removeEventListener("change", computedBinding.handler);
			} else {
				computedBinding.count--;
			}

		}

		return eventLifecycle.removeAndTeardown.apply(this, arguments);

	}
});
eventsProto.on = eventsProto.bind = eventsProto.addEventListener;
eventsProto.off = eventsProto.unbind = eventsProto.removeEventListener;

delete eventsProto.one;

define.setup = function(props, sealed) {
	defineNotWritable(this, "__bindEvents", Object.create(null));
	defineNotWritable(this, "constructor", this.constructor);
	/* jshint -W030 */
	CID(this);
	defineNotWritable(this, "_cid", this._cid);
	var definitions = this._define.definitions;
	var instanceDefinitions = Object.create(null);
	var map = this;
	each(props, function(value, prop){
		if(definitions[prop]) {
			map[prop] = value;
		} else {
			var def = define.makeSimpleGetterSetter(prop);
			instanceDefinitions[prop] = {};
			Object.defineProperty(map, prop, def);
			// possibly convert value to List or DefineMap
			map[prop] = define.types.observable(value);
		}
	});
	if(!isEmptyObject(instanceDefinitions)) {
		defineConfigurableAndNotEnumerable(this, "_instanceDefinitions", instanceDefinitions);
	}
	// only seal in dev mode for performance reasons.
	//!steal-remove-start
	this._data;
	this._computed;
	if(sealed !== false) {
		Object.seal(this);
	}
	//!steal-remove-end
};
define.replaceWith = replaceWith;
define.eventsProto = eventsProto;
define.defineConfigurableAndNotEnumerable = defineConfigurableAndNotEnumerable;
define.make = make;
define.getDefinitionOrMethod = getDefinitionOrMethod;
var simpleGetterSetters = {};
define.makeSimpleGetterSetter = function(prop){
	if(!simpleGetterSetters[prop]) {

		var setter = make.set.events(prop, make.get.data(prop), make.set.data(prop), make.eventType.data(prop) );

		simpleGetterSetters[prop] = {
			get: make.get.data(prop),
			set: function(newVal){
				return setter.call(this, define.types.observable(newVal));
			},
			enumerable: true
		};
	}
	return simpleGetterSetters[prop];
};

define.Iterator = function(obj){
  this.obj = obj;
  this.definitions = Object.keys(obj._define.definitions);
  this.instanceDefinitions = obj._instanceDefinitions ?
    Object.keys(obj._instanceDefinitions) :
    Object.keys(obj);
  this.hasGet = typeof obj.get === "function";
};

define.Iterator.prototype.next = function(){
  var key;
  if(this.definitions.length) {
    key = this.definitions.shift();

    // Getters should not be enumerable
    var def = this.obj._define.definitions[key];
    if(def.get) {
      return this.next();
    }
  } else if(this.instanceDefinitions.length) {
    key = this.instanceDefinitions.shift();
  } else {
    return {
      value: undefined,
      done: true
    };
  }

  return {
    value: [
      key,
      this.hasGet ? this.obj.get(key) : this.obj[key]
    ],
    done: false
  };
};

isDefineType = function(func){
	return func && func.canDefineType === true;
};

define.types = {
	'date': function(str) {
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
	'number': function(val) {
		if (val == null) {
			return val;
		}
		return +(val);
	},
	'boolean': function(val) {
		if(val == null) {
			return val;
		}
		if (val === 'false' || val === '0' || !val) {
			return false;
		}
		return true;
	},
	'observable': function(newVal) {
				if(isArray(newVal) && types.DefineList) {
						newVal = new types.DefineList(newVal);
				}
				else if(isPlainObject(newVal) &&  types.DefineMap) {
						newVal = new types.DefineMap(newVal);
				}
				return newVal;
		},
	'stringOrObservable': function(newVal) {
		if(isArray(newVal)) {
			return new types.DefaultList(newVal);
		}
		else if(isPlainObject(newVal)) {
			return new types.DefaultMap(newVal);
		}
		else {
			return define.types.string(newVal);
		}
	},
	/**
	 * Implements HTML-style boolean logic for attribute strings, where
	 * any string, including "", is truthy.
	 */
	'htmlbool': function(val) {
		if (val === '') {
			return true;
		}
		return !!stringToAny(val);
	},
	'*': function(val) {
		return val;
	},
	'any': function(val) {
		return val;
	},
	'string': function(val) {
		if (val == null) {
			return val;
		}
		return '' + val;
	},

	'compute': {
		set: function(newValue, setVal, setErr, oldValue) {
			if (newValue && newValue.isComputed) {
				return newValue;
			}
			if (oldValue && oldValue.isComputed) {
				oldValue(newValue);
				return oldValue;
			}
			return newValue;
		},
		get: function(value) {
			return value && value.isComputed ? value() : value;
		}
	}
};
