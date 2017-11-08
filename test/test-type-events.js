"use strict";
var QUnit = require("steal-qunit");
var DefineList = require("can-define/list/list");
var DefineMap = require("can-define/map/map");
var define = require("can-define");
var canSymbol = require("can-symbol");


// Tests events directly on the Constructor function for define.Constructor, DefineMap and DefineList
QUnit.module("can-define Type events");


QUnit.test("define can.onInstancePatches basics", function(){

    var Person = define.Constructor({
        first: "any",
        last: "any"
    });

    var calls = [];
    function handler(obj, patches) {
        calls.push([obj, patches]);
    }

    Person[canSymbol.for("can.onInstancePatches")](handler);

    var person = new Person({first: "Justin", last: "Meyer"});
    person.first = "Payal";
    person.last = "Shah";
    Person[canSymbol.for("can.offInstancePatches")](handler);
    person.first = "Ramiya";
    person.last = "Mayer";

    QUnit.deepEqual(calls,[
        [person,  [{type: "set",    key: "first", value: "Payal"} ] ],
        [person, [{type: "set",    key: "last", value: "Shah"} ] ]
    ]);
});

QUnit.test("DefineMap can.onInstancePatches basics", function(){

    var Person = DefineMap.extend({seal: false},{
        first: "any",
        last: "any"
    });

    var calls = [];
    function handler(obj, patches) {
        calls.push([obj, patches]);
    }

    Person[canSymbol.for("can.onInstancePatches")](handler);

    var person = new Person({first: "Justin", last: "Meyer"});
    person.first = "Payal";
    person.last = "Shah";
    person.set("middle","p");
    Person[canSymbol.for("can.offInstancePatches")](handler);
    person.first = "Ramiya";
    person.last = "Mayer";
    person.set("middle","P");

    QUnit.deepEqual(calls,[
        [person,  [{type: "set",    key: "first", value: "Payal"} ] ],
        [person, [{type: "set",    key: "last", value: "Shah"} ] ],
        [person, [{type: "set",    key: "middle", value: "p"} ] ]
    ]);
});


QUnit.test("DefineList can.onInstancePatches basics", function(){
    var People = DefineList.extend({
        count: "number"
    });

    var calls = [];
    function handler(obj, patches) {
        calls.push([obj, patches]);
    }

    People[canSymbol.for("can.onInstancePatches")](handler);

    var list = new People([1,2]);
    list.push(3);
    list.count = 8;
    People[canSymbol.for("can.offInstancePatches")](handler);
    list.push(4);
    list.count = 7;

    QUnit.deepEqual(calls,[
        [list,  [{type: "splice", index: 2, deleteCount: 0, insert: [3]} ] ],
        [list, [{type: "set",    key: "count", value: 8} ] ]
    ]);
});

QUnit.test("define can.onInstanceBoundChange basics", function(){

    var Person = define.Constructor({
        first: "any",
        last: "any"
    });

    var calls = [];
    function handler(obj, patches) {
        calls.push([obj, patches]);
    }

    Person[canSymbol.for("can.onInstanceBoundChange")](handler);

    var person = new Person({first: "Justin", last: "Meyer"});
    var bindHandler = function(){};
    person.on("first", bindHandler);
    person.off("first", bindHandler);

    Person[canSymbol.for("can.offInstanceBoundChange")](handler);
    person.on("first", bindHandler);
    person.off("first", bindHandler);

    QUnit.deepEqual(calls,[
        [person,  true ],
        [person, false ]
    ]);
});
