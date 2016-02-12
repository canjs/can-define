var can = require("can/util/");
var event = require("can/event/");
var compute = require("can/compute/");
var Map = require("can/map/");
var mapHelpers = require("can/map/map_helpers");
require("can/map/define/");


module.exports = function(objPrototype, defines) {
    var getPropDefineBehavior = function(behavior, attr, define) {
        var prop, defaultProp;

        if (define) {
            prop = define[attr];
            defaultProp = define['*'];

            if (prop && prop[behavior] !== undefined) {
                return prop[behavior];
            } else if (defaultProp && defaultProp[behavior] !== undefined) {
                return defaultProp[behavior];
            }
        }
    };
    // Copy every method on Map
    can.each(Map.prototype, function(value, prop) {
        objPrototype[prop] = value;
    });

    objPrototype.___set = function(prop, val) {
        var computedAttr = this._computedAttrs[prop];
        if (computedAttr) {
            computedAttr.compute(val);
        } else {
            this._data[prop] = val;
        }
    };
    // this has to be here for the existing define plugin to find it.
    objPrototype.define = defines;


    Object.defineProperty(objPrototype, "_computedAttrs", {
        get: function() {
            if (!this.__computeAttrs) {
                 Object.defineProperty(this,'__computeAttrs',{
                    value: {},
                    enumerable:false
                });
                for (var attr in defines) {
                    var def = defines[attr],
                        get = def.get;
                    if (get) {
                        mapHelpers.addComputedAttr(this, attr, can.compute.async(undefined, get, this));
                    }

                }

            }
            return this.__computeAttrs;
        }
    });
    Object.defineProperty(objPrototype, "_data", {
        get: function() {
            if (!this.__data) {
                Object.defineProperty(this,'__data',{
                    value: {},
                    enumerable:false
                });
            }
            return this.__data;
        }
    });

    Object.defineProperty(objPrototype,"_meta", {
        get:function() {
            if(!this.__meta) {
                Object.defineProperty(this,'__meta',{
                    value: {},
                    enumerable:false
                });
            }
            return this.__meta;
        }
    });



    can.each(defines, function(value, prop) {
        Object.defineProperty(objPrototype, prop, {
            get: function() {
                var meta = this._meta[prop];
                if (!meta) {
                    meta = this._meta[prop] = {};
                }
                if (meta.hasBeenSet) {
                    return this._get(prop);
                } else {
                    if (meta.defaultValueRetrieved) {
                        return meta.defaultValue;
                    }
                    meta.defaultValueRetrieved = true;
                    var value = getPropDefineBehavior("value", prop, defines);
                    if (value) {
                        if (typeof value === "function") {
                            value = value.call(this);
                        }
                        return meta.defaultValue = value;
                    }
                    var Value = getPropDefineBehavior("Value", prop, defines);
                    if (Value) {
                        return meta.defaultValue = new Value();
                    }
                }
            },
            set: function(val) {
                var meta = this._meta[prop];
                if (!meta) {
                    meta = this._meta[prop] = {};
                }

                meta.hasBeenSet = true;
                return this._set(prop, val);
            }
        });
    });



    return objPrototype;
};