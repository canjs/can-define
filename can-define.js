"use strict";
"format cjs";

var ns = require("can-namespace");
var canSymbol = require("can-symbol");
var canReflect = require("can-reflect");

var Observation = require("can-observation");
var ObservationRecorder = require("can-observation-recorder");
var AsyncObservable = require("can-simple-observable/async/async");
var SettableObservable = require("can-simple-observable/settable/settable");
var ResolverObservable = require("can-simple-observable/resolver/resolver");

var eventQueue = require("can-event-queue/map/map");
var addTypeEvents = require("can-event-queue/type/type");
var queues = require("can-queues");

var isEmptyObject = require("can-util/js/is-empty-object/is-empty-object");
var assign = require("can-util/js/assign/assign");
var canLogDev = require("can-log/dev/dev");

var isPlainObject = require("can-util/js/is-plain-object/is-plain-object");
var each = require("can-util/js/each/each");
var defaults = require("can-util/js/defaults/defaults");
var stringToAny = require("can-util/js/string-to-any/string-to-any");
var defineLazyValue = require("can-define-lazy-value");


var eventsProto, define,
	make, makeDefinition, getDefinitionsAndMethods,
	isDefineType, getDefinitionOrMethod;

var peek = ObservationRecorder.ignore(canReflect.getValue.bind(canReflect));

var Object_defineNamedPrototypeProperty = Object.defineProperty;
//!steal-remove-start
Object_defineNamedPrototypeProperty = function(obj, prop, definition) {
	if (definition.get) {
		Object.defineProperty(definition.get, "name", {
			value: "get "+canReflect.getName(obj) + "."+prop,
			writable: true
		});
	}
	if (definition.set) {
		Object.defineProperty(definition.set, "name", {
			value:  "set "+canReflect.getName(obj) + "."+prop
		});
	}
	return Object.defineProperty(obj, prop, definition);
};
//!steal-remove-end


var defineConfigurableAndNotEnumerable = function(obj, prop, value) {
	Object.defineProperty(obj, prop, {
		configurable: true,
		enumerable: false,
		writable: true,
		value: value
	});
};

var eachPropertyDescriptor = function(map, cb){
	for(var prop in map) {
		if(map.hasOwnProperty(prop)) {
			cb.call(map, prop, Object.getOwnPropertyDescriptor(map,prop));
		}
	}
};


function cleanUpDefinition(prop, definition, shouldWarn){
	// cleanup `value` -> `default`
	if(definition.value !== undefined && ( typeof definition.value !== "function" || definition.value.length === 0) ){

		//!steal-remove-start
		if(shouldWarn) {
			canLogDev.warn(
				"can-define: Change the 'value' definition for " + prop + " to 'default'."
			);
		}
		//!steal-remove-end

		definition.default = definition.value;
		delete definition.value;
	}
	// cleanup `Value` -> `DEFAULT`
	if(definition.Value !== undefined  ){
		//!steal-remove-start
		if(shouldWarn) {
			canLogDev.warn(
				"can-define: Change the 'Value' definition for " + prop + " to 'Default'."
			);
		}
		//!steal-remove-end
		definition.Default = definition.Value;
		delete definition.Value;
	}
}

module.exports = define = ns.define = function(objPrototype, defines, baseDefine) {
	// default property definitions on _data
	var prop,
		dataInitializers = Object.create(baseDefine ? baseDefine.dataInitializers : null),
		// computed property definitions on _computed
		computedInitializers = Object.create(baseDefine ? baseDefine.computedInitializers : null);

	var result = getDefinitionsAndMethods(defines, baseDefine);
	result.dataInitializers = dataInitializers;
	result.computedInitializers = computedInitializers;


	// Goes through each property definition and creates
	// a `getter` and `setter` function for `Object.defineProperty`.
	each(result.definitions, function(definition, property){
		define.property(objPrototype, property, definition, dataInitializers, computedInitializers, result.defaultDefinition);
	});

	// Places a `_data` on the prototype that when first called replaces itself
	// with a `_data` object local to the instance.  It also defines getters
	// for any value that has a default value.
	if(objPrototype.hasOwnProperty("_data")) {
		for (prop in dataInitializers) {
			defineLazyValue(objPrototype._data, prop, dataInitializers[prop].bind(objPrototype), true);
		}
	} else {
		defineLazyValue(objPrototype, "_data", function() {
			var map = this;
			var data = {};
			for (var prop in dataInitializers) {
				defineLazyValue(data, prop, dataInitializers[prop].bind(map), true);
			}
			return data;
		});
	}

	// Places a `_computed` on the prototype that when first called replaces itself
	// with a `_computed` object local to the instance.  It also defines getters
	// that will create the property's compute when read.
	if(objPrototype.hasOwnProperty("_computed")) {
		for (prop in computedInitializers) {
			defineLazyValue(objPrototype._computed, prop, computedInitializers[prop].bind(objPrototype));
		}
	} else {
		defineLazyValue(objPrototype, "_computed", function() {
			var map = this;
			var data = Object.create(null);
			for (var prop in computedInitializers) {
				defineLazyValue(data, prop, computedInitializers[prop].bind(map));
			}
			return data;
		});
	}

	// Add necessary event methods to this object.
	for (prop in eventsProto) {
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
	var iteratorSymbol = canSymbol.iterator || canSymbol.for("iterator");
	if(!objPrototype[iteratorSymbol]) {
		defineConfigurableAndNotEnumerable(objPrototype, iteratorSymbol, function(){
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

function isValueResolver(definition) {
	// there's a function and it has one argument
	return typeof definition.value === "function" && definition.value.length;
}


define.property = function(objPrototype, prop, definition, dataInitializers, computedInitializers, defaultDefinition) {
	var propertyDefinition = define.extensions.apply(this, arguments);

	if (propertyDefinition) {
		definition = makeDefinition(prop, propertyDefinition, defaultDefinition || {});
	}

	var type = definition.type;

	//!steal-remove-start
	if (type && canReflect.isConstructorLike(type)) {
		canLogDev.warn(
			"can-define: the definition for " +
			prop +
			(objPrototype.constructor.shortName ? " on " + objPrototype.constructor.shortName : "") +
			" uses a constructor for \"type\". Did you mean \"Type\"?"
		);
	}
	//!steal-remove-end

	// Special case definitions that have only `type: "*"`.
	if (type && onlyType(definition) && type === define.types["*"]) {
		Object_defineNamedPrototypeProperty(objPrototype, prop, {
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
	var dataProperty = definition.get || isValueResolver(definition) ? "computed" : "data",

		// simple functions that all read/get/set to the right place.
		// - reader - reads the value but does not observe.
		// - getter - reads the value and notifies observers.
		// - setter - sets the value.
		reader = make.read[dataProperty](prop),
		getter = make.get[dataProperty](prop),
		setter = make.set[dataProperty](prop),
		getInitialValue;

	//!steal-remove-start
	if (definition.get) {
		Object.defineProperty(definition.get, "name", {
			value: canReflect.getName(objPrototype) + "'s " + prop + " getter",
		});
	}
	if (definition.set) {
		Object.defineProperty(definition.set, "name", {
			value: canReflect.getName(objPrototype) + "'s " + prop + " setter",
		});
	}
	if(isValueResolver(definition)) {
		Object.defineProperty(definition.value, "name", {
			value: canReflect.getName(objPrototype) + "'s " + prop + " value",
		});
	}
	//!steal-remove-end

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
	if(isValueResolver(definition)) {
		computedInitializers[prop] = make.valueResolver(prop, definition, typeConvert);
	}
	// Determine a function that will provide the initial property value.
	else if ((definition.default !== undefined || definition.Default !== undefined)) {

		//!steal-remove-start
		// If value is an object or array, give a warning
		if (definition.default !== null && typeof definition.default === 'object') {
			canLogDev.warn("can-define: The value for " + prop + " is set to an object. This will be shared by all instances of the DefineMap. Use a function that returns the object instead.");
		}
		// If value is a constructor, give a warning
		if (definition.default && canReflect.isConstructorLike(definition.default)) {
			canLogDev.warn("can-define: The \"value\" for " + prop + " is set to a constructor. Did you mean \"Value\" instead?");
		}
		//!steal-remove-end

		getInitialValue = ObservationRecorder.ignore(make.get.defaultValue(prop, definition, typeConvert, eventsSetter));
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
	// If there's neither `set` or `get` or `value` (resolver)
	else if (dataProperty === "data") {
		// make a set that produces events.
		setter = eventsSetter;
	}
	// If there's zero-arg `get` but not `set`, warn on all sets in dev mode
	else if (definition.get && definition.get.length < 1) {
		setter = function() {
			//!steal-remove-start
			canLogDev.warn("can-define: Set value for property " +
				prop +
				(objPrototype.constructor.shortName ? " on " + objPrototype.constructor.shortName : "") +
				" ignored, as its definition has a zero-argument getter and no setter");
			//!steal-remove-end
		};
	}


	// Add type behavior to the setter.
	if (type) {
		setter = make.set.type(prop, type, setter);
	}
	if (definition.Type) {
		setter = make.set.Type(prop, definition.Type, setter);
	}

	// Define the property.
	Object_defineNamedPrototypeProperty(objPrototype, prop, {
		get: getter,
		set: setter,
		enumerable: "serialize" in definition ? !!definition.serialize : !definition.get,
		configurable: true
	});
};
define.makeDefineInstanceKey = function(constructor) {
	constructor[canSymbol.for("can.defineInstanceKey")] = function(property, value) {
		var defineResult = this.prototype._define;
		if(typeof value === "object") {
			// change `value` to default.
			cleanUpDefinition(property, value, false);
		}
		var definition = getDefinitionOrMethod(property, value, defineResult.defaultDefinition);
		if(definition && typeof definition === "object") {
			define.property(constructor.prototype, property, definition, defineResult.dataInitializers, defineResult.computedInitializers, defineResult.defaultDefinition);
			defineResult.definitions[property] = definition;
		} else {
			defineResult.methods[property] = definition;
		}
	};
};

// Makes a simple constructor function.
define.Constructor = function(defines, sealed) {
	var constructor = function(props) {
		Object.defineProperty(this,"__inSetup",{
			configurable: true,
			enumerable: false,
			value: true,
			writable: true
		});
		define.setup.call(this, props, sealed);
		this.__inSetup = false;
	};
	var result = define(constructor.prototype, defines);
	addTypeEvents(constructor);
	define.makeDefineInstanceKey(constructor, result);
	return constructor;
};

// A bunch of helper functions that are used to create various behaviors.
make = {

	computeObj: function(map, prop, observable) {
		var computeObj = {
			oldValue: undefined,
			compute: observable,
			count: 0,
			handler: function(newVal) {
				var oldValue = computeObj.oldValue;
				computeObj.oldValue = newVal;

				map.dispatch({
					type: prop,
					target: map
				}, [newVal, oldValue]);
			}
		};
		return computeObj;
	},
	valueResolver: function(prop, definition, typeConvert) {
		return function(){
			var map = this;
			var computeObj = make.computeObj(map, prop, new ResolverObservable(definition.value, map));
			//!steal-remove-start
			Object.defineProperty(computeObj.handler, "name", {
				value: canReflect.getName(definition.value).replace('value', 'event emitter')
			});
			//!steal-remove-end
			return computeObj;
		};
	},
	// Returns a function that creates the `_computed` prop.
	compute: function(prop, get, defaultValueFn) {

		return function() {
			var map = this,
				defaultValue = defaultValueFn && defaultValueFn.call(this),
				observable, computeObj;

			if(get.length === 0) {
				observable = new Observation(get, map);
			} else if(get.length === 1) {
				observable = new SettableObservable(get, map, defaultValue);
			} else {
				observable = new AsyncObservable(get, map, defaultValue);
			}

			computeObj = make.computeObj(map, prop, observable);

			//!steal-remove-start
			Object.defineProperty(computeObj.handler, "name", {
				value: canReflect.getName(get).replace('getter', 'event emitter')
			});
			//!steal-remove-end

			return computeObj;
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
				canReflect.setValue( this._computed[prop].compute, val );
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

						this.dispatch({
							patches: [{type: "set", key: prop, value: newVal}],
							type: prop,
							target: this,
							//!steal-remove-start
							reasonLog: [ canReflect.getName(this) + "'s", prop, "changed to", newVal, "from", current ],
							//!steal-remove-end
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

				queues.batch.start();
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
					queues.batch.stop();
				} else {
					if (hasGetter) {
						// we got a return value
						if (setValue !== undefined) {
							// if the current `set` value is returned, don't set
							// because current might be the `lastSetVal` of the internal compute.
							if (current !== setValue) {
								setEvents.call(this, setValue);
							}
							queues.batch.stop();
						}
						// this is a side effect, it didn't take a value
						// so use the original set value
						else if (setter.length === 0) {
							setEvents.call(this, value);
							queues.batch.stop();
							return;
						}
						// it took a value
						else if (setter.length === 1) {
							// if we have a getter, and undefined was returned,
							// we should assume this is setting the getters properties
							// and we shouldn't do anything.
							queues.batch.stop();
						}
						// we are expecting something
						else {
							//!steal-remove-start
							asyncTimer = setTimeout(function() {
								canLogDev.warn('can/map/setter.js: Setter "' + prop + '" did not return a value or call the setter callback.');
							}, canLogDev.warnTimeout);
							//!steal-remove-end
							queues.batch.stop();
							return;
						}
					} else {
						// we got a return value
						if (setValue !== undefined) {
							// if the current `set` value is returned, don't set
							// because current might be the `lastSetVal` of the internal compute.
							setEvents.call(this, setValue);
							queues.batch.stop();
						}
						// this is a side effect, it didn't take a value
						// so use the original set value
						else if (setter.length === 0) {
							setEvents.call(this, value);
							queues.batch.stop();
							return;
						}
						// it took a value
						else if (setter.length === 1) {
							// if we don't have a getter, we should probably be setting the
							// value to undefined
							setEvents.call(this, undefined);
							queues.batch.stop();
						}
						// we are expecting something
						else {
							//!steal-remove-start
							asyncTimer = setTimeout(function() {
								canLogDev.warn('can/map/setter.js: Setter "' + prop + '" did not return a value or call the setter callback.');
							}, canLogDev.warnTimeout);
							//!steal-remove-end
							queues.batch.stop();
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
			if(Array.isArray(Type) && define.DefineList) {
				Type = define.DefineList.extend({
					"#": Type[0]
				});
			} else if (typeof Type === "object") {
				if(define.DefineMap) {
					Type = define.DefineMap.extend(Type);
				} else {
					Type = define.Constructor(Type);
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
				return canReflect.getValue( this._computed[prop].compute );
			};
		},
		lastSet: function(prop) {
			return function() {
				var observable = this._computed[prop].compute;
				if(observable.lastSetValue) {
					return canReflect.getValue(observable.lastSetValue);
				}
			};
		}
	},
	// Helpers that read the data in an observable way.
	get: {
		// uses the default value
		defaultValue: function(prop, definition, typeConvert, callSetter) {
			return function() {
				var value = definition.default;
				if (value !== undefined) {
					if (typeof value === "function") {
						value = value.call(this);
					}
					value = typeConvert(value);
				}
				else {
					var Default = definition.Default;
					if (Default) {
						value = typeConvert(new Default());
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
					ObservationRecorder.add(this, prop);
				}

				return this._data[prop];
			};
		},
		computed: function(prop) {
			return function(val) {
				var compute = this._computed[prop].compute;
				if (ObservationRecorder.isRecording()) {
					ObservationRecorder.add(this, prop);
					if (!canReflect.isBound(compute)) {
						Observation.temporarilyBind(compute);
					}
				}

				return peek(compute);
			};
		}
	}
};

define.behaviors = ["get", "set", "value", "Value", "type", "Type", "serialize"];

// This cleans up a particular behavior and adds it to the definition
var addBehaviorToDefinition = function(definition, behavior, value) {
	if(behavior === "enumerable") {
		// treat enumerable like serialize
		definition.serialize = !!value;
	}
	else if(behavior === "type") {
		var behaviorDef = value;
		if(typeof behaviorDef === "string") {
			behaviorDef = define.types[behaviorDef];
			if(typeof behaviorDef === "object") {
				assign(definition, behaviorDef);
				behaviorDef = behaviorDef[behavior];
			}
		}
		if (typeof behaviorDef !== 'undefined') {
			definition[behavior] = behaviorDef;
		}
	}
	else {
		definition[behavior] = value;
	}
};

makeDefinition = function(prop, def, defaultDefinition) {
	var definition = {};

	each(def, function(value, behavior) {
		addBehaviorToDefinition(definition, behavior, value);
	});
	// only add default if it doesn't exist
	each(defaultDefinition, function(value, prop){
		if(definition[prop] === undefined) {
			if(prop !== "type" && prop !== "Type") {
				definition[prop] = value;
			}
		}
	});
	// We only want to add a defaultDefinition if def.type is not a string
	// if def.type is a string it is handled in addDefinition
	if(typeof def.type !== 'string') {
		// if there's no type definition, take it from the defaultDefinition
		if(!definition.type && !definition.Type) {
			defaults(definition, defaultDefinition);
		}

		if( isEmptyObject(definition) ) {
			definition.type = define.types["*"];
		}
	}
	cleanUpDefinition(prop, definition, true);
	return definition;
};

getDefinitionOrMethod = function(prop, value, defaultDefinition){
	// Clean up the value to make it a definition-like object
	var definition;
	if(typeof value === "string") {
		definition = {type: value};
	}
	else if(typeof value === "function") {
		if(canReflect.isConstructorLike(value)) {
			definition = {Type: value};
		} else if(isDefineType(value)) {
			definition = {type: value};
		}
		// or leaves as a function
	} else if( Array.isArray(value) ) {
		definition = {Type: value};
	} else if( isPlainObject(value) ){
		definition = value;
	}

	if(definition) {
		return makeDefinition(prop, definition, defaultDefinition);
	}
	else {
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
			if(result && typeof result === "object" && !isEmptyObject(result)) {
				definitions[prop] = result;
			}
			else {
				// Removed adding raw values that are not functions
				if (typeof result === 'function') {
					methods[prop] = result;
				}
				//!steal-remove-start
				else if (typeof result !== 'undefined') {
					canLogDev.error(prop + (this.constructor.shortName ? " on " + this.constructor.shortName : "") + " does not match a supported propDefinition. See: https://canjs.com/doc/can-define.types.propDefinition.html");
				}
				//!steal-remove-end
			}
		}
	});
	if(defaults) {
		defines["*"] = defaults;
	}
	return {definitions: definitions, methods: methods, defaultDefinition: defaultDefinition};
};

eventsProto = eventQueue({});

function setupComputed(instance, eventName) {
	var computedBinding = instance._computed && instance._computed[eventName];
	if (computedBinding && computedBinding.compute) {
		if (!computedBinding.count) {
			computedBinding.count = 1;
			canReflect.onValue(computedBinding.compute, computedBinding.handler, "notify");
			computedBinding.oldValue = canReflect.getValue(computedBinding.compute);
		} else {
			computedBinding.count++;
		}

	}
}
function teardownComputed(instance, eventName){
	var computedBinding = instance._computed && instance._computed[eventName];
	if (computedBinding) {
		if (computedBinding.count === 1) {
			computedBinding.count = 0;
			canReflect.offValue(computedBinding.compute, computedBinding.handler,"notify");
		} else {
			computedBinding.count--;
		}
	}
}

var canMetaSymbol = canSymbol.for("can.meta");
assign(eventsProto, {
	_eventSetup: function() {},
	_eventTeardown: function() {},
	addEventListener: function(eventName, handler, queue) {
		setupComputed(this, eventName);
		return eventQueue.addEventListener.apply(this, arguments);
	},

	// ### unbind
	// Stops listening to an event.
	// If this is the last listener of a computed property,
	// stop forwarding events of the computed property to this map.
	removeEventListener: function(eventName, handler) {
		teardownComputed(this, eventName);
		return eventQueue.removeEventListener.apply(this, arguments);

	}
});
eventsProto.on = eventsProto.bind = eventsProto.addEventListener;
eventsProto.off = eventsProto.unbind = eventsProto.removeEventListener;


var onKeyValueSymbol = canSymbol.for("can.onKeyValue");
var offKeyValueSymbol = canSymbol.for("can.offKeyValue");

canReflect.assignSymbols(eventsProto,{
	"can.onKeyValue": function(key){
		setupComputed(this, key);
		return eventQueue[onKeyValueSymbol].apply(this, arguments);
	},
	"can.offKeyValue": function(key){
		teardownComputed(this, key);
		return eventQueue[offKeyValueSymbol].apply(this, arguments);
	}
});

/*canReflect.set(eventsProto, canSymbol.for("can.onKeyValue"), function(key, handler, queue){
	var translationHandler = function(ev, newValue, oldValue){
		handler(newValue, oldValue);
	};
	singleReference.set(handler, this, translationHandler, key);

	this.addEventListener(key, translationHandler, queue);
});

canReflect.set(eventsProto, canSymbol.for("can.offKeyValue"), function(key, handler, queue){
	this.removeEventListener(key, singleReference.getAndDelete(handler, this, key), queue );
});*/

delete eventsProto.one;

define.setup = function(props, sealed) {
	Object.defineProperty(this,"constructor", {value: this.constructor, enumerable: false, writable: false});
	Object.defineProperty(this,canMetaSymbol, {value: Object.create(null), enumerable: false, writable: false});

	/* jshint -W030 */

	var definitions = this._define.definitions;
	var instanceDefinitions = Object.create(null);
	var map = this;
	canReflect.eachKey(props, function(value, prop){
		if(definitions[prop] !== undefined) {
			map[prop] = value;
		} else {
			var def = define.makeSimpleGetterSetter(prop);
			instanceDefinitions[prop] = {};
			Object_defineNamedPrototypeProperty(map, prop, def);
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
define.replaceWith = defineLazyValue;
define.eventsProto = eventsProto;
define.defineConfigurableAndNotEnumerable = defineConfigurableAndNotEnumerable;
define.make = make;
define.getDefinitionOrMethod = getDefinitionOrMethod;
var simpleGetterSetters = {};
define.makeSimpleGetterSetter = function(prop){
	if(simpleGetterSetters[prop] === undefined) {

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

function isObservableValue(obj){
	return canReflect.isValueLike(obj) && canReflect.isObservableLike(obj);
}

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
			if(Array.isArray(newVal) && define.DefineList) {
					newVal = new define.DefineList(newVal);
			}
			else if(isPlainObject(newVal) &&  define.DefineMap) {
					newVal = new define.DefineMap(newVal);
			}
			return newVal;
	},
	'stringOrObservable': function(newVal) {
		if(Array.isArray(newVal)) {
			return new define.DefaultList(newVal);
		}
		else if(isPlainObject(newVal)) {
			return new define.DefaultMap(newVal);
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
			if (isObservableValue(newValue) ) {
				return newValue;
			}
			if (isObservableValue(oldValue)) {
				canReflect.setValue(oldValue,newValue);
				return oldValue;
			}
			return newValue;
		},
		get: function(value) {
			return isObservableValue(value) ? canReflect.getValue(value) : value;
		}
	}
};
