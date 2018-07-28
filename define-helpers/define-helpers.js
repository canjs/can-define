"use strict";
var define = require("can-define");
var canReflect = require("can-reflect");
var queues = require("can-queues");
var dev = require("can-log/dev/dev");
var ensureMeta = require("../ensure-meta");

var returnFirstArg = function(arg){
	return arg;
};
var defineHelpers = {
	// returns `true` if the value was defined and set
	defineExpando: function(map, prop, value) {
		if(define._specialKeys[prop]) {
			// ignores _data and _computed
			return true;
		}
		// first check if it's already a constructor define
		var constructorDefines = map._define.definitions;
		if(constructorDefines && constructorDefines[prop]) {
			return;
		}
		// next if it's already on this instances
		var instanceDefines = map._instanceDefinitions;
		if(!instanceDefines) {
			if(Object.isSealed(map)) {
				return;
			}
			Object.defineProperty(map, "_instanceDefinitions", {
				configurable: true,
				enumerable: false,
				writable: true,
				value: {}
			});
			instanceDefines = map._instanceDefinitions;
		}
		if(!instanceDefines[prop]) {
			var defaultDefinition = map._define.defaultDefinition || {type: define.types.observable};
			define.property(map, prop, defaultDefinition, {},{});
			// possibly convert value to List or DefineMap
			if(defaultDefinition.type) {
				map._data[prop] = define.make.set.type(prop, defaultDefinition.type, returnFirstArg).call(map, value);
			} else {
				map._data[prop] = define.types.observable(value);
			}

			instanceDefines[prop] = defaultDefinition;
			queues.batch.start();
			map.dispatch({
				type: "can.keys",
				target: map
			});
			if(map._data[prop] !== undefined) {
				map.dispatch({
					type: prop,
					target: map,
					patches: [{type: "set", key: prop, value: map._data[prop]}],
				},[map._data[prop], undefined]);
			}
			queues.batch.stop();
			return true;
		}
	},
	reflectSerialize: function(unwrapped){
		var constructorDefinitions = this._define.definitions;
		var defaultDefinition = this._define.defaultDefinition;
		this.forEach(function(val, name){
			var propDef = constructorDefinitions[name];

			if(propDef && typeof propDef.serialize === "function") {
				val = propDef.serialize.call(this, val, name);
			}
			else if(defaultDefinition && typeof defaultDefinition.serialize === "function") {
				val =  defaultDefinition.serialize.call(this, val, name);
			} else {
				val = canReflect.serialize(val);
			}
			if(val !== undefined) {
				unwrapped[name] = val;
			}
		}, this);
		return unwrapped;
	},
	reflectUnwrap: function(unwrapped){
		this.forEach(function(value, key){
			if(value !== undefined) {
				unwrapped[key] = canReflect.unwrap(value);
			}
		});
		return unwrapped;
	},
	log: function(key) {
		var instance = this;

		var quoteString = function quoteString(x) {
			return typeof x === "string" ? JSON.stringify(x) : x;
		};

		var meta = ensureMeta(instance);
		var allowed = meta.allowedLogKeysSet || new Set();
		meta.allowedLogKeysSet = allowed;

		if (key) {
			allowed.add(key);
		}

		meta._log = function(event, data) {
			var type = event.type;

			if (
				type === "can.onPatches" || (key && !allowed.has(type)) ||
				type === "can.keys" || (key && !allowed.has(type))
				) {
				return;
			}

			if (type === "add" || type === "remove") {
				dev.log(
					canReflect.getName(instance),
					"\n how   ", quoteString(type),
					"\n what  ", quoteString(data[0]),
					"\n index ", quoteString(data[1])
				);
			} else {
				// log `length` and `propertyName` events
				dev.log(
					canReflect.getName(instance),
					"\n key ", quoteString(type),
					"\n is  ", quoteString(data[0]),
					"\n was ", quoteString(data[1])
				);
			}
		};
	},
	deleteKey: function(prop){
		var instanceDefines = this._instanceDefinitions;
		if(instanceDefines && Object.prototype.hasOwnProperty.call(instanceDefines, prop) && !Object.isSealed(this)) {
			delete instanceDefines[prop];
			queues.batch.start();
			this.dispatch({
				type: "can.keys",
				target: this
			});
			var oldValue = this._data[prop];
			if(oldValue !== undefined) {
				delete this._data[prop];
				delete this[prop];
				this.dispatch({
					type: prop,
					target: this,
					patches: [{type: "delete", key: prop}],
				},[undefined,oldValue]);
			}
			queues.batch.stop();
		} else {
			this.set(prop, undefined);
		}
		return this;
	}
};
module.exports = defineHelpers;
