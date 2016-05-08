var Construct = require("can-construct");
var define = require("can-define");
var assign = require("can-util/js/assign/assign");
var each = require("can-util/js/each/each");
var isArray = require("can-util/js/is-array/is-array");
var isPlainObject = require("can-util/js/is-plain-object/is-plain-object")
var defineHelpers = require("../define-helpers/define-helpers");
var ObserveInfo = require("can-observe-info");
var CID = require("can-util/js/cid/cid");
var types = require("can-util/js/types/types");
var canBatch = require("can-event/batch/batch");

var make = define.make;

var defineExpando = function(map, prop, value) {
    // first check if it's already a constructor define
    var constructorDefines = map.constructor.definitions;
    if(constructorDefines && constructorDefines[prop]) {
        return;
    }
    // next if it's already on this instances
    var instanceDefines = map._definitions;
    if(!instanceDefines) {
        instanceDefines = map._definitions = {};
    }
    if(!instanceDefines[prop]) {
        var defaultDefinition = map.constructor.defaultDefinition || {type: defineHelpers.simpleTypeConvert};
        define.property(map, prop, defaultDefinition, {},{});
        // possibly convert value to List or DefineMap
        map._data[prop] = defaultDefinition.type ? defaultDefinition.type(value) : defineHelpers.simpleTypeConvert(value);
        instanceDefines[prop] = {};

        canBatch.trigger.call(map, {
            type: "__keys",
            target: map
        });
    }
};

var readWithoutObserve = ObserveInfo.notObserve(function(map, prop){
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
        if( (typeof curVal !== "object") && curVal) {
            self.set(prop, newVal);
        }
        else if( ("set" in curVal) && isPlainObject(obj) ) {
            curVal.set(obj, remove);
        }
        else if( ("attr" in curVal) && (isPlainObject(obj) || isArray(obj)) ) {
            curVal.attr(obj, remove);
        }
        else if("replace" in curVal && isArray(obj)) {
            curVal.replace(obj)
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

            this.definitions = result.definitions;
            this.defaultDefinition = result.defaultDefinition;

            this.prototype.setup = function(props){
                define.setup.call(this, props, this.constructor.seal)
            };
        }
    }
},{
    // setup for only dynamic DefineMap instances
    setup: function(props, sealed){
        CID(this);
        var data = this._data = {};
        var map = this;
        this._definitions = {};
        each(props, function(value, prop){
            Object.defineProperty(map, prop, defineHelpers.makeSimpleGetterSetter(prop));
            // possibly convert value to List or DefineMap
            data[prop] = defineHelpers.simpleTypeConvert(value);
            map._definitions[prop] = {};
        });
        //!steal-remove-start
        this.__bindEvents= {};
        this._bindings = 0;
        if(sealed){
            Object.seal(this);
        }
    	//!steal-remove-end
    },
    get: function(prop){
        defineExpando(this, prop);
        return this[prop];
    },
    set: function(prop, value){
        if(typeof prop === "object") {
            return setProps.call(this, prop, value);
        }
        defineExpando(this, prop);
        this[prop] = value;
        return this;
    },
    serialize: function () {
        return defineHelpers.serialize(this, 'serialize', {});
    },
    toObject: function () {
        return defineHelpers.serialize(this, 'toObject', {});
    },
    each: function(cb, thisarg, observe){
        if(observe !== false) {
            ObserveInfo.observe(this, '__keys');
        }
        var res;
        var constructorDefinitions = this.constructor.definitions;
        if(constructorDefinitions) {
            res = eachDefinition(this, cb, thisarg, constructorDefinitions, observe);
        }
        if(res === false) {
            return this;
        }
        if(this._definitions) {
            eachDefinition(this, cb, thisarg, this._definitions, observe);
        }

        return this;
    },
    "*": {
        type: defineHelpers.simpleTypeConvert
    }
});

// Add necessary event methods to this object.
for(var prop in define.eventsProto) {
    Object.defineProperty(DefineMap.prototype, prop, {
        enumerable:false,
        value: define.eventsProto[prop]
    });
}
defineHelpers.DefineMap = DefineMap;

types.DefaultMap = DefineMap;

module.exports = DefineMap;
