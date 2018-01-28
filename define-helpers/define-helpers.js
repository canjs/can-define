var define = require("can-define");
var canReflect = require("can-reflect");
var queues = require("can-queues");


var defineHelpers = {
	// returns `true` if the value was defined and set
	defineExpando: function(map, prop, value) {
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
	}
};
module.exports = defineHelpers;
