require("../list/list-test");
require("../map/map-test");
require("../define-test");
var DefineMap = require("can-define/map/map");
var DefineList = require("can-define/list/list");
var isPlainObject = require("can-util/js/is-plain-object/is-plain-object");
var types = require("can-types");

var QUnit = require("steal-qunit");

QUnit.module("can-define: map and list combined");

QUnit.test("basics", function(){
    var items = new DefineMap({ people: [{name: "Justin"},{name: "Brian"}], count: 1000 });

    QUnit.ok(items.people instanceof types.DefineList, "people is list");
    QUnit.ok(items.people.item(0) instanceof types.DefineMap, "1st object is Map");
    QUnit.ok(items.people.item(1) instanceof types.DefineMap, "2nd object is Map");
    QUnit.equal(items.people.item(1).name, "Brian", "2nd object's name is right");
    QUnit.equal(items.count, 1000, "count is number");
});

QUnit.test("serialize works", function(){
    var Person = DefineMap.extend({
        first: "string",
        last: "string"
    });
    var People = DefineList.extend({
        "*": Person
    });

    var people = new People([{first: "j", last: "m"}]);
    QUnit.deepEqual(people.serialize(), [{first: "j", last: "m"}]);

});

QUnit.test("Extended Map with empty def converts to default Observables", function(){
    var School = DefineMap.extend({
        students: {},
        teacher: {}
    });

    var school = new School();

    school.students = [{name: "J"}];
    school.teacher = {name: "M"};

    ok(school.students instanceof types.DefineList, "converted to DefineList");
    ok(school.teacher instanceof types.DefineMap, "converted to DefineMap");

});

QUnit.test("default 'observable' type prevents Type from working (#29)", function(){
    var M = DefineMap.extend("M",{
        id: "number"
    });
    var L = DefineList.extend("L",{
        "*": M
    });

    var MyMap = DefineMap.extend({
        l: L
    });

    var m = new MyMap({
        l: [{id: 5}]
    });

    QUnit.ok( m.l[0] instanceof M, "is instance" );
    QUnit.equal(m.l[0].id, 5, "correct props");
});

QUnit.test("inline DefineList Type", function(){
    var M = DefineMap.extend("M",{
        id: "number"
    });

    var MyMap = DefineMap.extend({
        l: {Type: [M]}
    });

    var m = new MyMap({
        l: [{id: 5}]
    });

    QUnit.ok( m.l[0] instanceof M, "is instance" );
    QUnit.equal(m.l[0].id, 5, "correct props");
});

QUnit.test("recursively `get`s (#31)", function(){
    var M = DefineMap.extend("M",{
        id: "number"
    });

    var MyMap = DefineMap.extend({
        l: {Type: [M]}
    });

    var m = new MyMap({
        l: [{id: 5}]
    });

    var res = m.get();
    QUnit.ok( Array.isArray(res.l), "is a plain array");
    QUnit.ok( isPlainObject(res.l[0]), "plain object");
});

QUnit.test("DefineList trigger deprecation warning when set with Map.set (#93)", 0, function(){
	var map = new DefineMap({
		things: [{ foo: 'bar' }]
	});
	map.things.attr = function(){
		ok(false, "attr should not be called");
	};

	map.assign({ things: [{ baz: 'luhrmann' }] });
});
