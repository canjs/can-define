var Construct = require("can-construct");
var define = require("can-define");
var assign = require("can-util/js/assign/assign");
var isArray = require("can-util/js/is-array/is-array");
var isPlainObject = require("can-util/js/is-plain-object/is-plain-object");
var defineHelpers = require("../define-helpers/define-helpers");
var Observation = require("can-observation");
var types = require("can-types");
var canBatch = require("can-event/batch/batch");
var ns = require("can-namespace");
var canLog = require("can-util/js/log/log");

var readWithoutObserve = Observation.ignore(function(map, prop){
    return map[prop];
});

var eachDefinition = function(map, cb, thisarg, definitions, observe) {

    for(var prop in definitions) {
        var definition = definitions[prop];
        if(typeof definition !== "object" || ("serialize" in definition ? !!definition.serialize : !definition.get)) {

            var item = observe === false ? readWithoutObserve(map, prop) : map[prop];

            if (cb.call(thisarg || item, item, prop, map) === false) {
                return false;
            }
        }
    }
};

var setProps = function(props, remove) {
	props = defineHelpers.removeSpecialKeys(assign({}, props));
    var prop,
        self = this,
        newVal;

    // Batch all of the change events until we are done.
    canBatch.start();
    // Merge current properties with the new ones.
    this.each(function(curVal, prop) {
        // You can not have a _cid property; abort.
        if (prop === "_cid") {
            return;
        }
        newVal = props[prop];

        // If we are merging, remove the property if it has no value.
        if (newVal === undefined) {
            if (remove) {
                self[prop] = undefined;
            }
            return;
        }
        if( typeof curVal !== "object" || curVal === null ) {
            self.set(prop, newVal);
        }
        else if( ("replace" in curVal) && isArray(newVal)) {
            curVal.replace(newVal);
        }        
        else if( ("set" in curVal) && (isPlainObject(newVal) || isArray(newVal))) {
            curVal.set(newVal, remove);
        }
        else if( ("attr" in curVal) && (isPlainObject(newVal) || isArray(newVal)) ) {
            curVal.attr(newVal, remove);
        }
        else if(curVal !== newVal) {
            self.set(prop, newVal);
        }
        delete props[prop];
    }, this, false);
    // Add remaining props.
    for (prop in props) {
        // Ignore _cid.
        if (prop !== "_cid") {
            newVal = props[prop];
            this.set(prop, newVal);
        }

    }
    canBatch.stop();
    return this;
};

var DefineMap = Construct.extend("DefineMap",{
    setup: function(base){
		var key,
			prototype = this.prototype;
        if(DefineMap) {
            define(prototype, prototype, base.prototype._define);
			for(key in DefineMap.prototype) {
				define.defineConfigurableAndNotEnumerable(prototype, key, prototype[key]);
			}

            this.prototype.setup = function(props){
				define.setup.call(
					this, 
					defineHelpers.removeSpecialKeys(defineHelpers.toObject(this, props,{}, DefineMap)),
					this.constructor.seal
				);
            };
		} else {
			for(key in prototype) {
				define.defineConfigurableAndNotEnumerable(prototype, key, prototype[key]);
        }
    }
		define.defineConfigurableAndNotEnumerable(prototype, "constructor", this);
	}
},{
    // setup for only dynamic DefineMap instances
    setup: function(props, sealed){
        if(!this._define) {
            Object.defineProperty(this,"_define",{
                enumerable: false,
                value: {
                    definitions: {}
                }
            });
            Object.defineProperty(this,"_data",{
                enumerable: false,
                value: {}
            });
        }
		define.setup.call(
			this,
			defineHelpers.removeSpecialKeys(defineHelpers.toObject(this, props,{}, DefineMap)),
			sealed === true
		);
    },
    /**
     * @function can-define/map/map.prototype.get get
     * @parent can-define/map/map.prototype
     *
     * @description Get a value or all values from a DefineMap.
     *
     * @signature `map.get()`
     *
     * Returns a plain JavaScript object that contains the properties and values of the map instance.  Any property values
     * that also have a `get` method will have their `get` method called and the resulting value will be used as
     * the property value.  This can be used to recursively convert a map instance to an object of other plain
     * JavaScript objects.  Cycles are supported and only create one object.
     *
     * `.get()` can still return other non plain JS objects like Date.
     * Use [can-define/map/map.prototype.serialize] when a form proper for `JSON.stringify` is needed.
     *
     * ```js
     * var map = new DefineMap({foo: new DefineMap({bar: "zed"})});
     * map.get() //-> {foo: {bar: "zed"}};
     * ```
     *
     *   @return {Object} A plain JavaScript `Object` that contains all the properties and values of the map instance.
     *
     * @signature `map.get(propName)`
     *
     * Get a single property on a DefineMap instance.
     *
     * `.get(propName)` only should be used when reading properties that might not have been defined yet, but
     * will be later via [can-define/map/map.prototype.set].
     *
     * ```js
     * var map = new DefineMap();
     * map.get("name") //-> undefined;
     * ```
     *
     *   @param {String} propName The property name of a property that may not have been defined yet.
     *   @return {*} The value of that property.
     */
    get: function(prop){
        if(prop) {
            var value = this[prop];
            if(value !== undefined || prop in this || Object.isSealed(this)) {
                return value;
            } else {
                Observation.add(this, prop);
                return this[prop];
            }

        } else {
            return defineHelpers.serialize(this, 'get', {});
        }
    },
    /**
     * @function can-define/map/map.prototype.set set
     * @parent can-define/map/map.prototype
     *
     * @description Sets multiple properties on a map instance or a property that wasn't predefined.
     *
     * @signature `map.set(props [,removeProps])`
     *
     * Assigns each value in `props` to a property on this map instance named after the
     * corresponding key in `props`, effectively merging `props` into the Map. If `removeProps` is true, properties not in
     * `props` will be set to `undefined`.
     *
     *   @param {Object} props A collection of key-value pairs to set.
     *   If any properties already exist on the map, they will be overwritten.
     *
     *   @param {Boolean} [removeProps=false] Whether to set keys not present in `props` to `undefined`.
     *
     *   @return {can-define/map/map} The map instance for chaining.
     *
     * @signature `map.set(propName, value)`
     *
     * Assigns _value_ to a property on this map instance called _propName_.  This will define
     * the property if it hasn't already been predefined.
     *
     *   @param {String} propName The property to set.
     *   @param {*} value The value to assign to `propName`.
     *   @return {can-define/map/map} This map instance, for chaining.
     */
    set: function(prop, value){
        if(typeof prop === "object") {
            return setProps.call(this, prop, value);
        }
        var defined = defineHelpers.defineExpando(this, prop, value);
        if(!defined) {
            this[prop] = value;
        }
        return this;
    },
    /**
     * @function can-define/map/map.prototype.serialize serialize
     * @parent can-define/map/map.prototype
     *
     * @description Get a serialized representation of the map instance and its children.
     *
     * @signature `map.serialize()`
     *
     * Get the serialized Object form of the map.  Serialized
     * data is typically used to send back to a server.  Use [can-define.types.serialize]
     * to customize a property's serialized value or if the property should be added to
     * the result or not.
     *
     * `undefined` serialized values are not added to the result.
     *
     * ```js
     * var MyMap = DefineMap.extend({
     *   date: {
     *     type: "date",
     *     serialize: function(date){
     *       return date.getTime()
     *     }
     *   }
     * });
     *
     * var myMap = new MyMap({date: new Date(), count: 5});
     * myMap.serialize() //-> {date: 1469566698504, count: 5}
     * ```
     *
     *   @return {Object} A JavaScript Object that can be serialized with `JSON.stringify` or other methods.
     *
     */
    serialize: function () {
        return defineHelpers.serialize(this, 'serialize', {});
    },

    forEach: function(cb, thisarg, observe){
        if(observe !== false) {
            Observation.add(this, '__keys');
        }
        var res;
        var constructorDefinitions = this._define.definitions;
        if(constructorDefinitions) {
            res = eachDefinition(this, cb, thisarg, constructorDefinitions, observe);
        }
        if(res === false) {
            return this;
        }
        if(this._instanceDefinitions) {
            eachDefinition(this, cb, thisarg, this._instanceDefinitions, observe);
        }

        return this;
    },
    "*": {
        type: define.types.observable
    }
});

// Add necessary event methods to this object.
for(var prop in define.eventsProto) {
	DefineMap[prop] = define.eventsProto[prop];
    Object.defineProperty(DefineMap.prototype, prop, {
        enumerable:false,
        value: define.eventsProto[prop],
        writable: true
    });
}
types.DefineMap = DefineMap;
types.DefaultMap = DefineMap;

DefineMap.prototype.toObject = function(){
    canLog.warn("Use DefineMap::get instead of DefineMap::toObject");
    return this.get();
};
DefineMap.prototype.each = DefineMap.prototype.forEach;

var oldIsMapLike = types.isMapLike;
types.isMapLike = function(obj){
	return obj instanceof DefineMap || oldIsMapLike.apply(this, arguments);
};

module.exports = ns.DefineMap = DefineMap;
