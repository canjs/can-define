"use strict";
var QUnit = require("steal-qunit");
var DefineMap = require("can-define/map/map");
var ObserveInfo = require("can-observe-info");

QUnit.module("can-define/map");

QUnit.test("creating an instance", function(){
    var map = new DefineMap({prop: "foo"});
    map.on("prop", function(ev, newVal, oldVal){
        QUnit.equal(newVal, "BAR");
        QUnit.equal(oldVal, "foo");
    });

    map.prop ="BAR";
});

QUnit.test("creating an instance with nested prop", function(){

    var map = new DefineMap({name: {first: "Justin"}});

    map.name.on("first", function(ev, newVal, oldVal){
        QUnit.equal(newVal, "David");
        QUnit.equal(oldVal, "Justin");
    });

    map.name.first ="David";
});


QUnit.test("extending", function(){
    var MyMap = DefineMap.extend({
        prop: {}
    });

    var map = new MyMap();
    map.on("prop", function(ev, newVal, oldVal){
        QUnit.equal(newVal, "BAR");
        QUnit.equal(oldVal, undefined);
    });

    map.prop = "BAR";
});

QUnit.test("setting not defined property", function(){
    "use strict";
    var MyMap = DefineMap.extend({
        prop: {}
    });
    var mymap = new MyMap();

    try {
        mymap.notdefined = "value"
        ok(false, "no error")
    } catch(e) {
        ok(true, "error thrown")
    }
});

QUnit.test("loop only through defined serializable props", function(){
    var MyMap = DefineMap.extend({
        propA: {},
        propB: {serialize: false},
        propC: {
            get: function(){
                return propA
            }
        }
    });
    var inst = new MyMap();
    QUnit.deepEqual(Object.keys(inst.toObject()), ["propA"]);

});

QUnit.test("get and set can setup expandos", function(){
    var map = new DefineMap();
    var oi = new ObserveInfo(function(){
        return map.get("foo");
    },null,{
        updater: function(newVal){
            QUnit.equal(newVal, "bar", "updated to bar");
        }
    })
    oi.getValueAndBind();

    map.set("foo","bar")

});

QUnit.test("default settings", function(){
    var MyMap = DefineMap.extend({
        "*": "string",
        foo: {}
    });

    var m = new MyMap();
    m.set("foo",123);
    QUnit.ok(m.get("foo") === "123");

});

QUnit.test("default settings on unsealed", function(){
    var MyMap = DefineMap.extend({
        seal: false
    },{
        "*": "string"
    });

    var m = new MyMap();
    m.set("foo",123);
    QUnit.ok(m.get("foo") === "123");

});

QUnit.test("toObject with dynamically added properties", function(){
    var map = new DefineMap();
    map.set("a",1);
    map.set("b",2);
    QUnit.deepEqual(map.toObject(), {a: 1, b:2});
});
