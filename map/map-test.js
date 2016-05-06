"use strict";
var QUnit = require("steal-qunit");
var DefineMap = require("can-define/map/map");


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
