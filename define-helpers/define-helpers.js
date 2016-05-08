var simpleGetterSetters = {};
var make = require("can-define").make;
var isArray = require("can-util/js/is-array/is-array");
var isPlainObject = require("can-util/js/is-plain-object/is-plain-object");
var CID = require("can-util/js/cid/cid");
var each = require("can-util/js/each/each");


var hasMethod = function(obj, method){
    return obj && typeof obj == "object" && (method in obj);
}

var defineHelpers = {
    extendedSetup: function(props){
        assign(this, props)
    },
    simpleTypeConvert: function(newVal) {
        if(isArray(newVal)) {
            newVal = new defineHelpers.DefineList(newVal);
        }
        else if(isPlainObject(newVal)) {
            newVal = new defineHelpers.DefineMap(newVal);
        }
        return newVal;
    },
    makeSimpleGetterSetter: function(prop){
        if(!simpleGetterSetters[prop]) {

            var setter = make.set.events(prop, make.get.data(prop), make.set.data(prop), make.eventType.data(prop) );

            simpleGetterSetters[prop] = {
                get: make.get.data(prop),
                set: function(newVal){
                    return setter.call(this, defineHelpers.simpleTypeConvert(newVal));
                },
                enumerable: true
            }
        }
        return simpleGetterSetters[prop];
    },
    // ## getValue
	// If `val` is an observable, calls `how` on it; otherwise
	// returns the value of `val`.
	getValue: function(map, name, val, how){
		if( hasMethod(val, how) ) {
			return val[how]();
		} else {
			return val;
		}
	},
    // ### mapHelpers.serialize
	// Serializes a Map or Map.List by recursively calling the `how`
	// method on any child objects. This is able to handle
	// cycles.
	// `map` - the map or list to serialize.
	// `how` - the method to call recursively.
	// `where` - the target Object or Array that becomes the serialized result.
	serialize: (function(){

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
					toObject: {},
					serialize: {}
				};
			}

			serializeMap[how][cid] = where;
			// Go through each property.
			map.each(function (val, name) {
				// If the value is an `object`, and has an `attr` or `serialize` function.

                var result,
					isObservable =   hasMethod(val, how),
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
	})()
};
module.exports = defineHelpers;
