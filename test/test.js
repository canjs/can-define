require("../list/list-test");
require("../map/map-test");
require("../define-test");
var DefineMap = require("can-define/map/map");
var DefineList = require("can-define/list/list");
var isPlainObject = require("can-util/js/is-plain-object/is-plain-object");
var types = require("can-types");
var Observation = require("can-observation");
var canReflect = require("can-reflect");
var define = require("can-define");

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

QUnit.test("basic type", function() {

	QUnit.expect(6);

	var Typer = function(arrayWithAddedItem, listWithAddedItem) {
		this.arrayWithAddedItem = arrayWithAddedItem;
		this.listWithAddedItem = listWithAddedItem;
	};

	define(Typer.prototype, {
		arrayWithAddedItem: {
			type: function(value) {
				if (value && value.push) {
					value.push("item");
				}
				return value;
			}
		},
		listWithAddedItem: {
			type: function(value) {
				if (value && value.push) {
					value.push("item");
				}
				return value;
			},
			Type: DefineList
		}
	});




	var t = new Typer();
	deepEqual(Object.keys(t), [], "no keys");

	var array = [];
	t.arrayWithAddedItem = array;

	deepEqual(array, ["item"], "updated array");
	QUnit.equal(t.arrayWithAddedItem, array, "leave value as array");

	t.listWithAddedItem = [];

	QUnit.ok(t.listWithAddedItem instanceof DefineList, "convert to CanList");
	QUnit.equal(t.listWithAddedItem[0], "item", "has item in it");

    var observation = new Observation(function() {
		return t.listWithAddedItem.attr("length");
	});
    canReflect.onValue(observation, function(newVal) {
		QUnit.equal(newVal, 2, "got a length change");
	});

	t.listWithAddedItem.push("another item");

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


test("Value generator can read other properties", function() {
	var Map = define.Constructor({
		letters: {
			value: "ABC"
		},
		numbers: {
			value: [1, 2, 3]
		},
		definedLetters: {
			value: 'DEF'
		},
		definedNumbers: {
			value: [4, 5, 6]
		},
		generatedLetters: {
			value: function() {
				return 'GHI';
			}
		},
		generatedNumbers: {
			value: function() {
				return new DefineList([7, 8, 9]);
			}
		},

		// Get prototype defaults
		firstLetter: {
			value: function() {
				return this.letters.substr(0, 1);
			}
		},
		firstNumber: {
			value: function() {
				return this.numbers[0];
			}
		},

		// Get defined simple `value` defaults
		middleLetter: {
			value: function() {
				return this.definedLetters.substr(1, 1);
			}
		},
		middleNumber: {
			value: function() {
				return this.definedNumbers[1];
			}
		},

		// Get defined `value` function defaults
		lastLetter: {
			value: function() {
				return this.generatedLetters.substr(2, 1);
			}
		},
		lastNumber: {
			value: function() {
				return this.generatedNumbers[2];
			}
		}
	});

	var map = new Map();
	var prefix = 'Was able to read dependent value from ';

	equal(map.firstLetter, 'A',
		prefix + 'traditional can.Map style property definition');
	equal(map.firstNumber, 1,
		prefix + 'traditional can.Map style property definition');

	equal(map.middleLetter, 'E',
		prefix + 'define plugin style default property definition');
	equal(map.middleNumber, 5,
		prefix + 'define plugin style default property definition');

	equal(map.lastLetter, 'I',
		prefix + 'define plugin style generated default property definition');
	equal(map.lastNumber, 9,
		prefix + 'define plugin style generated default property definition');
});

test('value and get (#1521)', function() {
	// problem here is that previously, can.Map would set `size:1` on
	// the map. This would effectively set the "lastSetValue".

	// in this new version, default values are not set.  They
	// are only present. later.
	// one option is that there's a "read-mode" for last-set.  Until it's
	// been set, it should get it's value from any default value?

	var MyMap = define.Constructor({
		data: {
			value: function() {
				return new DefineList(['test']);
			}
		},
		size: {
			value: 1,
			get: function(val) {
				var list = this.data;
				var length = list.attr('length');
				return val + length;
			}
		}
	});

	var map = new MyMap({});
	equal(map.size, 2);
});

QUnit.test('Assign value on map', function() {
	var MyConstruct = DefineMap.extend({
		list: DefineList,
		name: 'string'
	});

	var obj = new MyConstruct({
		list: ['data', 'data', 'data'],
		name: 'CanJS',
		foo: {
			bar: 'bar',
			zoo: 'say'
		}
	});


	obj.assign({
		list: ['another'],
		foo: {
			bar: 'zed'
		}
	});

	QUnit.equal(obj.list.length, 1, 'list length should be 1');
	QUnit.propEqual(obj.foo, { bar: 'zed' }, 'foo.bar is set correctly');
	QUnit.equal(obj.name, 'CanJS', 'name is unchanged');

});

QUnit.test('Update value on a map', function() {
	var MyConstruct = DefineMap.extend({
		list: DefineList,
		name: 'string'
	});

	var obj = new MyConstruct({
		list: ['data', 'data', 'data'],
		name: 'CanJS',
		foo: {
			bar: 'bar'
		}
	});

	obj.update({
		list: ['another'],
		foo: {
			bar: 'zed'
		}
	});

	QUnit.equal(obj.list.length, 1, 'list length should be 1');
	QUnit.equal(obj.foo.bar, 'zed', 'foo.bar is set correctly');
	QUnit.equal(obj.name, undefined, 'name is removed');

});


QUnit.test('Deep assign a map', function() {
	var MyConstruct = DefineMap.extend({
		list: DefineList,
		name: 'string'
	});

	var obj = new MyConstruct({
		list: ['data', 'data', 'data'],
		name: 'Test Name'
	});

	QUnit.equal(obj.list.length, 3, 'list length should be 3');


	obj.assignDeep({
		list: ['something']
	});

	QUnit.equal(obj.name, 'Test Name', 'Name property is still intact');
	QUnit.equal(obj.list[0], 'something', 'the first element in the list should be updated');

});


QUnit.test('Deep updating a map', function() {
	var MyConstruct = DefineMap.extend({
		list: DefineList,
		name: 'string'
	});

	var obj = new MyConstruct({
		list: ['data', 'data', 'data'],
		name: 'Test Name'
	});

	QUnit.equal(obj.list.length, 3, 'list length should be 3');


	obj.updateDeep({
		list: ['something']
	});

	QUnit.equal(obj.name, undefined, 'Name property has been reset');
	QUnit.equal(obj.list[0], 'something', 'the first element of the list should be updated');

});
