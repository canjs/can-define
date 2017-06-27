
var assign = require("can-util/js/assign/assign");
var CID = require("can-cid");
var define = require("can-define");
var canBatch = require("can-event/batch/batch");
var canEvent = require("can-event");
var canReflect = require("can-reflect");

var defineHelpers = {
	extendedSetup: function(props){
		assign(this, props);
	},
	toObject: function(map, props, where, Type){
		if(props instanceof Type) {
			props.each(function(value, prop){
				where[prop] = value;
			});
			return where;
		} else {
			return props;
		}
	},
	removeSpecialKeys: function(map) {
		if(map) {
			["_data", "constructor", "_cid", "__bindEvents"].forEach(function(key) {
				delete map[key];
			});
		}
		return map;
	},
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
	// ## getValue
	// If `val` is an observable, calls `how` on it; otherwise
	// returns the value of `val`.
	/*getValue: function(map, name, val, how){
		// check if there's a serialize
		if(how === "serialize") {
			var constructorDefinitions = map._define.definitions;
			var propDef = constructorDefinitions[name];
			if(propDef && typeof propDef.serialize === "function") {
				return propDef.serialize.call(map, val, name);
			}
			var defaultDefinition = map._define.defaultDefinition;
			if(defaultDefinition && typeof defaultDefinition.serialize === "function") {
				return defaultDefinition.serialize.call(map, val, name);
			}
		}

		if(canReflect.isObservableLike(val)) {
			return val[how]();
		} else {
			return val;
		}
	},*/
	// ### mapHelpers.serialize
	// Serializes a Map or Map.List by recursively calling the `how`
	// method on any child objects. This is able to handle
	// cycles.
	// `map` - the map or list to serialize.
	// `how` - the method to call recursively.
	// `where` - the target Object or Array that becomes the serialized result.
	/*serialize: (function(){

		// A temporary mapping of map cids to the serialized result.
		var serializeMap = null;

		return function (map, how, where) {
			var cid = CID(map),
				firstSerialize = false;

			// If there isn't an existing serializeMap, this means
			// this is the initial non-recursive call to this function.
			// We mark this  as the first call, and then setup the serializeMap.
			// The serialize map is further devided into `how` because
			// `.serialize` might call `.attr`.
			if(!serializeMap) {
				firstSerialize = true;
				serializeMap = {
					get: {},
					serialize: {}
				};
			}

			serializeMap[how][cid] = where;
			// Go through each property.
			map.each(function (val, name) {
				// If the value is an `object`, and has an `attr` or `serialize` function.

				var result,
					isObservable = canReflect.isObservableLike(val),
					serialized = isObservable && serializeMap[how][CID(val)];

				if( serialized ) {
					result = serialized;
				} else {
					// special attr or serializer
					result = defineHelpers.getValue(map, name, val, how);
				}
				// this is probably removable
				if(result !== undefined) {
					where[name] = result;
				}


			});

			if(firstSerialize) {
				serializeMap = null;
			}
			return where;
		};
	})()*/
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
				val = canReflect.unwrap(val);
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
