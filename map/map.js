var Construct = require("can-construct");
var define = require("can-define");
var assign = require("can-util/js/assign/assign");
var each = require("can-util/js/each/each");
var isArray = require("can-util/js/is-array/is-array");
var isPlainObject = require("can-util/js/is-plain-object/is-plain-object")

var make = define.make;

var extendedSetup = function(props){
    assign(this, props)
}

var simpleTypeConvert = function(newVal) {
    if(isArray(newVal)) {
        newVal = new List(newVal);
    }
    else if(isPlainObject(newVal)) {
        newVal = new DefineMap(newVal);
    }
    return newVal;
};
// Cache getter / setters so we don't have to repeat a name
var simpleGetterSetters = {};
var makeSimpleGetterSetter = function(prop){
    if(!simpleGetterSetters[prop]) {

        var setter = make.set.events(prop, make.get.data(prop), make.set.data(prop), make.eventType.data(prop) );

        simpleGetterSetters[prop] = {
            get: make.get.data(prop),
            set: function(newVal){
                return setter.call(this, simpleTypeConvert(newVal));
            },
            enumerable: true
        }
    }
    return simpleGetterSetters[prop];
}


var DefineMap = Construct.extend({
    setup: function(){
        if(DefineMap) {
            define(this.prototype, this.prototype.define);
            this.prototype.setup = extendedSetup;
        }
    }
},{
    // setup for only dynamic DefineMap instances
    setup: function(props){
        var data = this._data = {};
        var map = this;
        each(props, function(value, prop){
            Object.defineProperty(map, prop, makeSimpleGetterSetter(prop));
            // possibly convert value to List or DefineMap
            data[prop] = simpleTypeConvert(value);
        });
    }
});


// Add necessary event methods to this object.
for(var prop in define.eventsProto) {
    Object.defineProperty(DefineMap.prototype, prop, {
        enumerable:false,
        value: define.eventsProto[prop]
    });
}

module.exports = DefineMap;
