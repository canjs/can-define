require("list/list-test");
require("map/map-test");
require("define-test");
var DefineMap = require("./map/map");
var DefineList = require("./list/list");

var QUnit = require("steal-qunit");

QUnit.module("map and list combined");

QUnit.test("basics", function(){
    var items = new DefineMap({ people: [{name: "Justin"},{name: "Brian"}], count: 1000 });
    QUnit.ok(items.people instanceof DefineList, "people is list");
    QUnit.ok(items.people.item(0) instanceof DefineMap, "1st object is Map");
    QUnit.ok(items.people.item(1) instanceof DefineMap, "2nd object is Map");
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

    ok(school.students instanceof DefineList, "converted to DefineList");
    ok(school.teacher instanceof DefineMap, "converted to DefineMap");

});
