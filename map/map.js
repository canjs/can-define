var Construct = require("can-construct");
var define = require("can-define");
var assign = require("can-util/js/assign/assign");
var each = require("can-util/js/each/each");
var isArray = require("can-util/js/is-array/is-array");
var isPlainObject = require("can-util/js/is-plain-object/is-plain-object")
var defineHelpers = require("../define-helpers/define-helpers");
var CID = require("can-util/js/cid/cid");
var types = require("can-util/js/types/types");

var make = define.make;



var DefineMap = Construct.extend("DefineMap",{
    setup: function(){
        if(DefineMap) {
            this.defines = defineHelpers.getDefine(this.prototype)
            define(this.prototype, this.defines );
            this.prototype.setup = define.setup;
        }
    }
},{
    // setup for only dynamic DefineMap instances
    setup: function(props){
        CID(this);
        var data = this._data = {};
        var map = this;
        each(props, function(value, prop){
            Object.defineProperty(map, prop, defineHelpers.makeSimpleGetterSetter(prop));
            // possibly convert value to List or DefineMap
            data[prop] = defineHelpers.simpleTypeConvert(value);
        });
        //!steal-remove-start
        this.__bindEvents= {};
        this._bindings = 0;
        Object.seal(this);
    	//!steal-remove-end
    },
    serialize: function () {
        return defineHelpers.serialize(this, 'serialize', {});
    },
    toObject: function () {
        return defineHelpers.serialize(this, 'toObject', {});
    },
    each: function(cb, thisarg){
        for(var prop in this.constructor.defines) {
            var definition = this.constructor.defines[prop];
            if(typeof definition !== "object" || ("serialize" in definition ? !!definition.serialize : !definition.get)) {
                var item = this[prop];
                if (cb.call(thisarg || item, item, prop, this) === false) {
                    break;
                }
            }
        }
        return this;
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
