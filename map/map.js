var Construct = require("can-construct");
var define = require("can-define");
var assign = require("can-util/js/assign/assign");
var each = require("can-util/js/each/each");
var isArray = require("can-util/js/is-array/is-array");
var isPlainObject = require("can-util/js/is-plain-object/is-plain-object")
var defineHelpers = require("../define-helpers/define-helpers");
var Observation = require("can-observation");
var CID = require("can-util/js/cid/cid");
var types = require("can-util/js/types/types");
var canBatch = require("can-event/batch/batch");

var make = define.make;



var readWithoutObserve = Observation.ignore(function(map, prop){
    return map[prop]
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
    props = assign({}, props);
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
        if( typeof curVal !== "object" ) {
            self.set(prop, newVal);
        }
        else if( ("set" in curVal) && isPlainObject(newVal) ) {
            curVal.set(newVal, remove);
        }
        else if( ("attr" in curVal) && (isPlainObject(newVal) || isArray(newVal)) ) {
            curVal.attr(newVal, remove);
        }
        else if("replace" in curVal && isArray(newVal)) {
            curVal.replace(newVal)
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
}

var DefineMap = Construct.extend("DefineMap",{
    setup: function(){
        if(DefineMap) {
            var prototype = this.prototype;
            var result = define(prototype, prototype);

            this.prototype.setup = function(props){
                define.setup.call(this, props, this.constructor.seal);
            };
        }
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

        define.setup.call(this, props, sealed === true);
    },
    /**
     * @function can-define/map/map.prototype.get get
     * @parent can-define/map/map.prototype
     *
     * @description Get a value that was not predefined.
     *
     * @signature `map.get(propName)`
     */
    get: function(prop){
        if(arguments.length) {
            defineHelpers.defineExpando(this, prop);
            return this[prop];
        } else {
            return defineHelpers.serialize(this, 'get', {});
        }
    },
    /**
     * @function can-define/map/map.prototype.set set
     * @parent can-define/map/map.prototype
     *
     * @description Set a value that was not predefined.
     *
     * @signature `map.set(propName, value)`
     *
     * @signature `map.set(props [,removeProps])`
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
     * @description Get a value that was not predefined.
     *
     * @signature `map.serialize()`
     */
    serialize: function () {
        return defineHelpers.serialize(this, 'serialize', {});
    },

    /**
     * @function can-define/map/map.prototype.each each
     * @parent can-define/map/map.prototype
     *
     * @description Get a value that was not predefined.
     *
     * @signature `map.each()`
     */
    each: function(cb, thisarg, observe){
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
    Object.defineProperty(DefineMap.prototype, prop, {
        enumerable:false,
        value: define.eventsProto[prop]
    });
}
types.DefineMap = DefineMap;
types.DefaultMap = DefineMap;

DefineMap.prototype.toObject = function(){
    console.warn("Use DefineMap::get instead of DefineMap::toObject");
    return this.get();
}

module.exports = DefineMap;
