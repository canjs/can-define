var define = require("can-define");
var canBatch = require("can-event/batch/batch");
var canEvent = require("can-event");
var canReflect = require("can-reflect");


var defineHelpers = {
	defineExpando: function(map, prop, value) {
		// first check if it's already a constructor define
		var constructorDefines = map._define.definitions;
		if(constructorDefines && constructorDefines[prop]) {
			return;
		}
		// next if it's already on this instances
		var instanceDefines = map._instanceDefinitions;
		if(!instanceDefines) {
			Object.defineProperty(map, "_instanceDefinitions", {
				configurable: true,
				enumerable: false,
				value: {}
			});
			instanceDefines = map._instanceDefinitions;
		}
		if(!instanceDefines[prop]) {
			var defaultDefinition = map._define.defaultDefinition || {type: define.types.observable};
			define.property(map, prop, defaultDefinition, {},{});
			// possibly convert value to List or DefineMap
			map._data[prop] = defaultDefinition.type ? defaultDefinition.type(value) : define.types.observable(value);
			instanceDefines[prop] = defaultDefinition;
			canBatch.start();
			canEvent.dispatch.call(map, {
				type: "__keys",
				target: map
			});
			if(map._data[prop] !== undefined) {
				canEvent.dispatch.call(map, {
					type: prop,
					target: map
				},[map._data[prop], undefined]);
			}
			canBatch.stop();
			return true;
		}
	},
	reflectSerialize: function(unwrapped){
		var constructorDefinitions = this._define.definitions;
		var defaultDefinition = this._define.defaultDefinition;
		this.each(function(val, name){
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
	}
};
module.exports = defineHelpers;
