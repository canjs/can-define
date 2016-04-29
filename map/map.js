var Construct = require("can-construct");
var define = require("can-define");
var assign = require("can-util/js/assign/assign");
var each = require("can-util/js/each/each");
var isArray = require("can-util/js/is-array/is-array");
var isPlainObject = require("can-util/js/is-plain-object/is-plain-object")
var defineHelpers = require("../define-helpers/define-helpers");
var CID = require("can-util/js/cid/cid");
var make = define.make;



var DefineMap = Construct.extend("DefineMap",{
    setup: function(){
        if(DefineMap) {
            define(this.prototype, defineHelpers.getDefine(this.prototype) );
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
module.exports = DefineMap;
