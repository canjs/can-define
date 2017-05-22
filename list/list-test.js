"use strict";
var QUnit = require("steal-qunit");
var DefineList = require("can-define/list/list");
var DefineMap = require("can-define/map/map");
var Observation = require("can-observation");
var define = require("can-define");

var assign = require("can-util/js/assign/assign");
var CID = require("can-cid");
var types = require("can-types");
var stache = require("can-stache");

QUnit.module("can-define/list/list");

QUnit.test("List is an event emitter", function(assert) {
	var Base = DefineList.extend({});
	assert.ok(Base.on, 'Base has event methods.');
	var List = Base.extend({});
	assert.ok(List.on, 'List has event methods.');
});

QUnit.test("creating an instance", function() {
	var list = new DefineList([ "a", "b", "c" ]);

	list.on("add", function(ev, newVals, index) {
		QUnit.deepEqual(newVals, [ "d" ]);
		QUnit.equal(index, 3);
	});

	list.push("d");
});

test('list attr changes length', function() {
	var l = new DefineList([
		0,
		1,
		2
	]);
	l.set(3, 3);
	equal(l.length, 4);
});
test('remove on pop', function() {
	var l = new DefineList([ 0, 1, 2 ]);
	l.pop();

	equal(l.length, 2);
	deepEqual(l.get(), [ 0, 1 ]);
});
test('list splice', function() {
	var l = new DefineList([
		0,
		1,
		2,
		3
	]);

	l.on('add', function(ev, newVals, index) {
		deepEqual(newVals, [
			'a',
			'b'
		], 'got the right newVals');
		equal(index, 1, 'adding items');
	});

	l.on('remove', function(ev, oldVals, index) {
		deepEqual(oldVals, [
			1,
			2
		], 'got the right oldVals');
		equal(index, 1, 'no new Vals');
	});

	l.splice(1, 2, 'a', 'b');
	deepEqual(l.get(), [
		0,
		'a',
		'b',
		3
	], 'serialized');
});


test('Array accessor methods', 11, function() {
	var l = new DefineList([
			'a',
			'b',
			'c'
		]),
		sliced = l.slice(2),
		joined = l.join(' | '),
		concatenated = l.concat([
			2,
			1
		], new DefineList([ 0 ]));
	ok(sliced instanceof DefineList, 'Slice is an Observable list');
	equal(sliced.length, 1, 'Sliced off two elements');
	equal(sliced[0], 'c', 'Single element as expected');
	equal(joined, 'a | b | c', 'Joined list properly');
	ok(concatenated instanceof DefineList, 'Concatenated is an Observable list');
	deepEqual(concatenated.serialize(), [
		'a',
		'b',
		'c',
		2,
		1,
		0
	], 'DefineList concatenated properly');
	l.forEach(function(letter, index) {
		ok(true, 'Iteration');
		if (index === 0) {
			equal(letter, 'a', 'First letter right');
		}
		if (index === 2) {
			equal(letter, 'c', 'Last letter right');
		}
	});
});

test('Concatenated list items Equal original', function() {
	var l = new DefineList([
			{ firstProp: "Some data" },
			{ secondProp: "Next data" }
		]),
		concatenated = l.concat([
			{ hello: "World" },
			{ foo: "Bar" }
		]);

	ok(l[0] === concatenated[0], "They are Equal");
	ok(l[1] === concatenated[1], "They are Equal");

});

test('Lists with maps concatenate properly', function() {
	var Person = DefineMap.extend();
	var People = DefineList.extend({
		'#': Person
	});
	var Genius = Person.extend();
	var Animal = DefineMap.extend();

	var me = new Person({ name: "John" });
	var animal = new Animal({ name: "Tak" });
	var genius = new Genius({ name: "Einstein" });
	var hero = { name: "Ghandi" };

	var people = new People([]);
	var specialPeople = new People([
		genius,
		hero
	]);

	people = people.concat([ me, animal, specialPeople ], specialPeople, [ 1, 2 ], 3);

	ok(people.length === 8, "List length is right");
	ok(people[0] === me, "Map in list === vars created before concat");
	ok(people[1] instanceof Person, "Animal got serialized to Person");
});

test('splice removes items in IE (#562)', function() {
	var l = new DefineList([ 'a' ]);
	l.splice(0, 1);
	ok(!l.get(0), 'all props are removed');
});


test('reverse triggers add/remove events (#851)', function() {
	expect(4);
	var l = new DefineList([ 1, 2, 3 ]);

	l.on('add', function() {
		ok(true, 'add called');
	});
	l.on('remove', function() {
		ok(true, 'remove called');
	});
	l.on('length', function() {
		ok(true, 'length should be called');
	});

	l.reverse();

	deepEqual(l.get(), [ 3, 2, 1 ], "reversed");
});

test('filter', function() {
	var l = new DefineList([ { id: 1, name: "John" }, { id: 2, name: "Mary" } ]);

	var filtered = l.filter(function(item) {
		return item.name === "Mary";
	});

	notEqual(filtered._cid, l._cid, "not same object");

	equal(filtered.length, 1, "one item");
	equal(filtered[0].name, "Mary", "filter works");
});

test('No Add Events if DefineList Splice adds the same items that it is removing. (#1277, #1399)', function() {
	var list = new DefineList([ "a", "b" ]);

	list.bind('add', function() {
		ok(false, 'Add callback should not be called.');
	});

	list.bind('remove', function() {
		ok(false, 'Remove callback should not be called.');
	});

	var result = list.splice(0, 2, "a", "b");

	deepEqual(result, [ "a", "b" ]);
});

test("add event always returns an array as the value (#998)", function() {
	var list = new DefineList([]),
		msg;
	list.bind("add", function(ev, newElements, index) {
		deepEqual(newElements, [ 4 ], msg);
	});
	msg = "works on push";
	list.push(4);
	list.pop();
	msg = "works on attr()";
	list.set(0, 4);
	list.pop();
	msg = "works on replace()";
	list.replace([ 4 ]);
});

test("Setting with .set() out of bounds of length triggers add event with leading undefineds", function() {
	var list = new DefineList([ 1 ]);
	list.bind("add", function(ev, newElements, index) {
		deepEqual(newElements, [ undefined, undefined, 4 ],
			"Leading undefineds are included");
		equal(index, 1, "Index takes into account the leading undefineds from a .set()");
	});
	list.set(3, 4);
});

test("No events should fire if removals happened on empty arrays", function() {
	var list = new DefineList([]),
		msg;
	list.bind("remove", function(ev, removed, index) {
		ok(false, msg);
	});
	msg = "works on pop";
	list.pop();
	msg = "works on shift";
	list.shift();
	ok(true, "No events were fired.");
});

test('setting an index out of bounds does not create an array', function() {
	expect(1);
	var l = new DefineList();

	l.set('1', 'foo');
	equal(l.get('1'), 'foo');
});

test('splice with similar but less items works (#1606)', function() {
	var list = new DefineList([ 'aa', 'bb', 'cc' ]);

	list.splice(0, list.length, 'aa', 'cc', 'dd');
	deepEqual(list.get(), [ 'aa', 'cc', 'dd' ]);

	list.splice(0, list.length, 'aa', 'cc');
	deepEqual(list.get(), [ 'aa', 'cc' ]);
});

test('filter returns same list type (#1744)', function() {
	var ParentList = DefineList.extend();
	var ChildList = ParentList.extend();

	var children = new ChildList([ 1, 2, 3 ]);

	ok(children.filter(function() {}) instanceof ChildList);
});

test('reverse returns the same list instance (#1744)', function() {
	var ParentList = DefineList.extend();
	var ChildList = ParentList.extend();

	var children = new ChildList([ 1, 2, 3 ]);
	ok(children.reverse() === children);
});


test("slice and join are observable by a compute (#1884)", function() {
	expect(2);

	var list = new DefineList([ 1, 2, 3 ]);

	var sliced = new Observation(function() {
		return list.slice(0, 1);
	}, null, {
		updater: function(newVal) {
			deepEqual(newVal.get(), [ 2 ], "got a new DefineList");
		}
	});
	sliced.start();

	var joined = new Observation(function() {
		return list.join(",");
	}, null, {
		updater: function(newVal) {
			equal(newVal, "2,3", "joined is observable");
		}
	});
	joined.start();


	list.shift();


});

test('list.replace', function() {
	var firstArray = [
		{ id: 1, name: "Marshall" },
		{ id: 2, name: "Austin" },
		{ id: 3, name: "Hyrum" }
	];
	var myList = new DefineList(firstArray);
	var newArray = [
		{ id: 4, name: "Aubree" },
		{ id: 5, name: "Leah" },
		{ id: 6, name: 'Lily' }
	];
	myList.replace(newArray);
	equal(myList.length, 3);
	equal(myList[0].name, "Aubree");
	equal(myList[1].name, "Leah");
	equal(myList[2].name, "Lily", "Can replace a List with an Array.");

	myList.replace(firstArray);
	equal(myList.length, 3);
	equal(myList[0].name, "Marshall");
	equal(myList[1].name, "Austin");
	equal(myList[2].name, "Hyrum", "Can replace a List with another List.");
});

test('list.map', function() {
	var myArray = [
		{ id: 1, name: "Marshall" },
		{ id: 2, name: "Austin" },
		{ id: 3, name: "Hyrum" }
	];
	var myList = new DefineList(myArray);
	var newList = myList.map(function(person) {
		person.lastName = "Thompson";
		return person;
	});

	equal(newList.length, 3);
	equal(newList[0].name, "Marshall");
	equal(newList[0].lastName, "Thompson");
	equal(newList[1].name, "Austin");
	equal(newList[1].lastName, "Thompson");
	equal(newList[2].name, "Hyrum");
	equal(newList[2].lastName, "Thompson");

	var ExtendedList = DefineList.extend({
		testMe: function() {
			return "It Worked!";
		}
	});
	var myExtendedList = new ExtendedList(myArray);
	var newExtendedList = myExtendedList.map(function(person) {
		person.lastName = "Thompson";
		return person;
	});

	try {
		newExtendedList.testMe();
	} catch(err) {
		QUnit.ok(err.message.match(/testMe/));
	}
});


test('list.sort a simple list', function() {
	var myList = new DefineList([
		"Marshall",
		"Austin",
		"Hyrum"
	]);

	myList.sort();

	equal(myList.length, 3);
	equal(myList[0], "Austin");
	equal(myList[1], "Hyrum");
	equal(myList[2], "Marshall", "Basic list was properly sorted.");
});

test('list.sort a list of objects', function() {
	var objList = new DefineList([
		{ id: 1, name: "Marshall" },
		{ id: 2, name: "Austin" },
		{ id: 3, name: "Hyrum" }
	]);

	objList.sort(function(a, b) {
		if (a.name < b.name) {
			return -1;
		} else if (a.name > b.name) {
			return 1;
		} else {
			return 0;
		}
	});

	equal(objList.length, 3);
	equal(objList[0].name, "Austin");
	equal(objList[1].name, "Hyrum");
	equal(objList[2].name, "Marshall", "List of objects was properly sorted.");
});

test('list.sort a list of DefineMaps', function() {
	var Account = DefineMap.extend({
		name: "string",
		amount: "number",
		slug: {
			serialize: true,
			get: function() {
				return this.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
			}
		}
	});
	Account.List = DefineList.extend({
		"*": Account,
		limit: "number",
		skip: "number",
		total: "number"
	});

	var accounts = new Account.List([
		{
			name: "Savings",
			amount: 20.00
		},
		{
			name: "Checking",
			amount: 103.24
		},
		{
			name: "Kids Savings",
			amount: 48155.13
		}
	]);
	accounts.limit = 3;

	var template = stache('{{#each accounts}}{{name}},{{/each}}')({ accounts: accounts });
	equal(template.textContent, "Savings,Checking,Kids Savings,", "template rendered properly.");

	accounts.sort(function(a, b) {
		if (a.name < b.name) {
			return -1;
		} else if (a.name > b.name) {
			return 1;
		} else {
			return 0;
		}
	});
	equal(accounts.length, 3);
	equal(template.textContent, "Checking,Kids Savings,Savings,", "template updated properly.");

	// Try sorting in reverse on the dynamic `slug` property
	accounts.sort(function(a, b) {
		if (a.slug < b.slug) {
			return 1;
		} else if (a.slug > b.slug) {
			return -1;
		} else {
			return 0;
		}
	});

	equal(accounts.length, 3);
	equal(accounts.limit, 3, "expandos still present after sorting/replacing.");
	equal(template.textContent, "Savings,Kids Savings,Checking,", "template updated properly.");
});

test('list.sort a list of objects without losing reference (#137)', function() {
	var unSorted = new DefineList([ { id: 3 }, { id: 2 }, { id: 1 } ]);
	var sorted = unSorted.slice(0).sort(function(a, b) {
		return a.id > b.id ? 1 : (a.id < b.id ? -1 : 0);
	});
	equal(unSorted[0], sorted[2], 'items should be equal');
});

test("list defines", 6, function() {
	var Todo = function(props) {
		assign(this, props);
		CID(this);
	};
	define(Todo.prototype, {
		completed: "boolean",
		destroyed: {
			value: false
		}
	});
	Todo.prototype.destroy = function() {
		this.destroyed = true;
	};

	var TodoList = DefineList.extend({

		"*": Todo,
		remaining: {
			get: function() {
				return this.filter({
					completed: false
				});
			}
		},
		completed: {
			get: function() {
				return this.filter({
					completed: true
				});
			}
		},

		destroyCompleted: function() {
			this.completed.forEach(function(todo) {
				todo.destroy();
			});
		},
		setCompletedTo: function(value) {
			this.forEach(function(todo) {
				todo.completed = value;
			});
		}
	});

	var todos = new TodoList([ { completed: true }, { completed: false } ]);

	ok(todos.item(0) instanceof Todo, "correct instance");
	equal(todos.completed.length, 1, "only one todo");

	todos.on("completed", function(ev, newVal, oldVal) {
		ok(newVal instanceof TodoList, "right type");
		equal(newVal.length, 2, "all items");
		ok(oldVal instanceof TodoList, "right type");
		equal(oldVal.length, 1, "all items");
	});

	todos.setCompletedTo(true);

});

QUnit.test("extending the base supports overwriting _eventSetup", function() {
	var L = DefineList.extend({});
	Object.getOwnPropertyDescriptor(DefineMap.prototype, "_eventSetup");
	L.prototype.arbitraryProp = true;
	ok(true, "set arbitraryProp");
	L.prototype._eventSetup = function() {};
	ok(true, "worked");
});

QUnit.test("setting expandos on a DefineList", function() {
	var DL = DefineList.extend({
		count: "number"
	});

	var dl = new DL();
	dl.set({ count: 5, skip: 2 });

	QUnit.equal(dl.get("count"), 5, "read with .get defined"); //-> 5
	QUnit.equal(dl.count, 5, "read with . defined");

	QUnit.equal(dl.get("skip"), 2, "read with .get expando");
	QUnit.equal(dl.skip, 2, "read with . expando");

	QUnit.equal(dl.get("limit"), undefined, "read with .get undefined");
});

QUnit.test("passing a DefineList to DefineList (#33)", function() {
	var m = new DefineList([ {}, {} ]);

	var m2 = new DefineList(m);
	QUnit.deepEqual(m.get(), m2.get());
	QUnit.ok(m[0] === m2[0], "index the same");
	QUnit.ok(m[1] === m2[1], "index the same");

});

QUnit.test("reading and setting expandos", function() {
	var list = new DefineList();
	var countObservation = new Observation(function() {
		return list.get("count");
	}, null, function(newValue) {
		QUnit.equal(newValue, 1000, "got new value");
	});
	countObservation.start();

	list.set("count", 1000);

	QUnit.equal(countObservation.value, 1000);


	var list2 = new DefineList();
	list2.on("count", function(ev, newVal) {
		QUnit.equal(newVal, 5);
	});
	list2.set("count", 5);
});

QUnit.test("is list like", function() {
	var list = new DefineList();
	QUnit.ok(types.isListLike(list));
});

QUnit.test("extending DefineList constructor functions (#61)", function() {
	var AList = DefineList.extend('AList', { aProp: {}, aMethod: function() {} });
	var BList = AList.extend('BList', { bProp: {}, bMethod: function() {} });
	var CList = BList.extend('CList', { cProp: {}, cMethod: function() {} });

	var list = new CList([ {}, {} ]);

	list.on("aProp", function(ev, newVal, oldVal) {
		QUnit.equal(newVal, "PROP");
		QUnit.equal(oldVal, undefined);
	});
	list.on("bProp", function(ev, newVal, oldVal) {
		QUnit.equal(newVal, "FOO");
		QUnit.equal(oldVal, undefined);
	});
	list.on("cProp", function(ev, newVal, oldVal) {
		QUnit.equal(newVal, "BAR");
		QUnit.equal(oldVal, undefined);
	});

	list.aProp = "PROP";
	list.bProp = 'FOO';
	list.cProp = 'BAR';

	QUnit.ok(list.aMethod);
	QUnit.ok(list.bMethod);
	QUnit.ok(list.cMethod);
});

QUnit.test("extending DefineList constructor functions more than once (#61)", function() {
	var AList = DefineList.extend("AList", { aProp: {}, aMethod: function() {} });

	var BList = AList.extend("BList", { bProp: {}, bMethod: function() {} });

	var CList = AList.extend("CList", { cProp: {}, cMethod: function() {} });

	var list1 = new BList([ {}, {} ]);
	var list2 = new CList([ {}, {}, {} ]);

	list1.on("aProp", function(ev, newVal, oldVal) {
		QUnit.equal(newVal, "PROP", "aProp newVal on list1");
		QUnit.equal(oldVal, undefined);
	});
	list1.on("bProp", function(ev, newVal, oldVal) {
		QUnit.equal(newVal, "FOO", "bProp newVal on list1");
		QUnit.equal(oldVal, undefined);
	});

	list2.on("aProp", function(ev, newVal, oldVal) {
		QUnit.equal(newVal, "PROP", "aProp newVal on list2");
		QUnit.equal(oldVal, undefined);
	});
	list2.on("cProp", function(ev, newVal, oldVal) {
		QUnit.equal(newVal, "BAR", "cProp newVal on list2");
		QUnit.equal(oldVal, undefined);
	});

	list1.aProp = "PROP";
	list1.bProp = 'FOO';
	list2.aProp = "PROP";
	list2.cProp = 'BAR';
	QUnit.ok(list1.aMethod, "list1 aMethod");
	QUnit.ok(list1.bMethod);
	QUnit.ok(list2.aMethod);
	QUnit.ok(list2.cMethod, "list2 cMethod");
});

QUnit.test("extending DefineList constructor functions - value (#61)", function() {
	var AList = DefineList.extend("AList", { aProp: { value: 1 } });

	var BList = AList.extend("BList", { });

	var CList = BList.extend("CList", { });

	var c = new CList([]);
	QUnit.equal(c.aProp, 1, "got initial value");
});

QUnit.test("'*' inheritance works (#61)", function() {
	var Account = DefineMap.extend({
		name: "string",
		amount: "number",
		slug: {
			serialize: true,
			get: function() {
				return this.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
			}
		}
	});

	var BaseList = DefineList.extend({
		"*": Account
	});

	var ExtendedList = BaseList.extend({});

	var xl = new ExtendedList([ {} ]);

	QUnit.ok(xl[0] instanceof Account);

});

QUnit.test("shorthand getter setter (#56)", function() {

	var People = DefineList.extend({
		first: "*",
		last: "*",
		get fullName() {
			return this.first + " " + this.last;
		},
		set fullName(newVal) {
			var parts = newVal.split(" ");
			this.first = parts[0];
			this.last = parts[1];
		}
	});

	var p = new People([]);
	p.fullName = "Mohamed Cherif";

	p.on("fullName", function(ev, newVal, oldVal) {
		QUnit.equal(oldVal, "Mohamed Cherif");
		QUnit.equal(newVal, "Justin Meyer");
	});

	equal(p.fullName, "Mohamed Cherif", "fullName initialized right");

	p.fullName = "Justin Meyer";
});

QUnit.test("added and removed are called after items are added/removed (#14)", function() {

	var Person = DefineMap.extend({
		id: "number",
		name: "string"
	});

	var addedFuncCalled, removedFuncCalled, theList;

	var People = DefineList.extend({
		"#": {
			added: function(items, index) {
				addedFuncCalled = true;
				ok(items, "items added got passed to added");
				ok(typeof index === 'number', "index of items was passed to added and is a number");
				ok(items[0].name === 'John', "Name was correct");
				theList = this;
			},
			removed: function(items, index) {
				removedFuncCalled = true;
				ok(items, "items added got passed to removed");
				ok(typeof index === 'number', "index of items was passed to removed and is a number");
				theList = this;
			},
			Type: Person
		},
		outsideProp: {
			type: "boolean",
			value: true
		}
	});

	var people = new People([]);
	var me = new Person();
	me.name = "John";
	me.id = "1234";

	ok(!addedFuncCalled, "added function has not been called yet");
	people.push(me);
	ok(addedFuncCalled, "added function was called");
	ok(theList.outsideProp === true && theList instanceof People,
		"the list was passed correctly as this to added");
	theList = null;
	ok(!removedFuncCalled, "removed function has not been called yet");
	people.splice(people.indexOf(me), 1);
	ok(removedFuncCalled, "removed function was called");
	ok(theList.outsideProp === true && theList instanceof People,
		"the list was passed correctly as this to removed");
});

QUnit.test("* vs # (#78)", function() {

	var MyList = DefineList.extend({
		"*": "number",
		"#": {
			added: function() {
				ok(true, "called on init");
			},
			removed: function() {},
			type: "string"
		}
	});

	var list = new MyList([ 1, 2, 3 ]);

	QUnit.ok(list[0] === "1", "converted to string");
	list.set("prop", "4");
	QUnit.ok(list.prop === 4, "type converted");

});

QUnit.test("Array shorthand uses #", function() {
	var MyMap = DefineMap.extend({
		"numbers": [ "number" ]
	});

	var map = new MyMap({ numbers: [ "1", "2" ] });
	QUnit.ok(map.numbers[0] === 1, "converted to number");

	map.numbers.set("prop", "4");
	QUnit.ok(map.numbers.prop === "4", "type left alone");
});

QUnit.test("replace-with-self lists are diffed properly (can-view-live#10)", function() {
	var a = new DefineMap({ name: "A" });
	var b = new DefineMap({ name: "B" });
	var c = new DefineMap({ name: "C" });
	var d = new DefineMap({ name: "D" });
	expect(4);

	var list1 = new DefineList([ a, b ]);
	list1.on("add", function(ev, newVals, where) {
		throw new Error("list1 should not add.");
	});
	list1.on("remove", function(ev, oldVals, where) {
		throw new Error("list1 should not remove.");
	});
	list1.replace([ a, b ]);

	var list2 = new DefineList([ a, b, c ]);
	list2.on("add", function(ev, newVals, where) {
		equal(newVals.length, 1, "list2 added length");
		equal(where, 2, "list2 added location");
	});
	list2.on("remove", function(ev, oldVals, where) {
		equal(oldVals.length, 1, "list2 removed length");
		equal(where, 2, "list2 removed location");
	});
	list2.replace([ a, b, d ]);
});

QUnit.test("set >= length - triggers length event (#152)", function() {
	var l = new DefineList([ 1, 2, 3 ]);
	var batchNum = null;

	l.on("add", function(e) {
		ok(true, "add called");

		if (batchNum === null) {
			batchNum = e.batchNum;
		}
		else {
			equal(batchNum, e.batchNum, "batch numbers match");
		}
	});
	l.on("remove", function(e) {
		ok(false, "remove called");

		if (batchNum === null) {
			batchNum = e.batchNum;
		}
		else {
			equal(batchNum, e.batchNum, "batch numbers match");
		}
	});
	l.on("length", function(e) {
		ok(true, "length called");

		if (batchNum === null) {
			batchNum = e.batchNum;
		}
		else {
			equal(batchNum, e.batchNum, "batch numbers match");
		}
	});

	expect(4);
	l.set(3, 5);

	deepEqual(l.get(), [ 1, 2, 3, 5 ], "updated list");
});

QUnit.test("set < length - triggers length event (#150)", function() {
	var l = new DefineList([ 1, 2, 3 ]);
	var batchNum = null;

	l.on("add", function(e) {
		ok(true, "add called");

		if (batchNum === null) {
			batchNum = e.batchNum;
		}
		else {
			equal(batchNum, e.batchNum, "batch numbers match");
		}
	});
	l.on("remove", function(e) {
		ok(true, "remove called");

		if (batchNum === null) {
			batchNum = e.batchNum;
		}
		else {
			equal(batchNum, e.batchNum, "batch numbers match");
		}
	});
	l.on("length", function(e) {
		ok(true, "length called");

		if (batchNum === null) {
			batchNum = e.batchNum;
		}
		else {
			equal(batchNum, e.batchNum, "batch numbers match");
		}
	});

	expect(6);
	l.set(2, 4);

	deepEqual(l.get(), [ 1, 2, 4 ], "updated list");
});

QUnit.test("set/splice are observable", function() {
	var list = new DefineList([ 1, 2, 3, 4, 5 ]);

	var count = new Observation(function() {
		var count = 0;
		for (var i = 0; i < list.length; i++) {
			count += (list[i] % 2) ? 1 : 0;
		}
		return count;
	}, null, {
		updater: function() {
			ok(true);
		}
	});
	count.start();

	expect(3);
	list.set(3, 5);
	list.set(2, 4);
	list.splice(1, 1, 1);
});

QUnit.test("setting length > current (#147)", function() {
	var list = new DefineList([ 1, 2 ]);

	list.length = 5;

	equal(list.length, 5);
	equal(list.hasOwnProperty(0), true);
	equal(list.hasOwnProperty(1), true);
	equal(list.hasOwnProperty(2), true);
	equal(list.hasOwnProperty(3), true);
	equal(list.hasOwnProperty(4), true);
	equal(list.hasOwnProperty(5), false);
});

QUnit.test("setting length < current (#147)", function() {
	var list = new DefineList([ 1, 2, 3, 4, 5 ]);

	list.length = 3;

	equal(list.length, 3);
	equal(list.hasOwnProperty(0), true);
	equal(list.hasOwnProperty(1), true);
	equal(list.hasOwnProperty(2), true);
	equal(list.hasOwnProperty(3), false);
	equal(list.hasOwnProperty(4), false);
	equal(list.hasOwnProperty(5), false);
});

test('every', function() {
	var l = new DefineList([ { id: 1, name: "Bob" }, { id: 2, name: "Bob" } ]);

	var allBobs = l.every(function(item) {
		return item.name === "Bob";
	});
	ok(allBobs, "Every works in true case");
	var idOne = l.every(function(item) {
		return item.id === 1;
	});
	ok(!idOne, "Every works in false case");

	allBobs = l.every({
		name : "Bob"
	});
	ok(allBobs, "Every works in true case");
	idOne = l.every({
		name : "Bob",
		id : 1
	});
	ok(!idOne, "Every works in false case");

});

test('some', function() {
	var l = new DefineList([ { id: 1, name: "Alice" }, { id: 2, name: "Bob" } ]);

	var allBobs = l.some(function(item) {
		return item.name === "Bob";
	});
	ok(allBobs, "Some works in true case");
	var idOne = l.some(function(item) {
		return item.name === "Charlie";
	});
	ok(!idOne, "Some works in false case");

	allBobs = l.some({
		name : "Bob"
	});
	ok(allBobs, "Some works in true case");
	idOne = l.some({
		name : "Bob",
		id : 1
	});
	ok(!idOne, "Some works in false case");

});

test('lastIndexOf', function() {
	var l = new DefineList([ { id: 1, name: "Alice" }, { id: 2, name: "Bob" } ]);

	var bobIdx = l.lastIndexOf(l[1]);
	equal(bobIdx, 1, "lastIndexOf found object");
	var charlieIdx = l.lastIndexOf({ id : 3, name: "Charlie" });
	equal(charlieIdx, -1, "lastIndexOf not found object");

	// make a new reference to [1] at [2]
	l.push(l[1]);

	bobIdx = l.lastIndexOf(l[1]);
	equal(bobIdx, 2, "lastIndexOf found last index of duped object");

});

test('reduce', function() {
	var l = new DefineList([
		{ id: 1, name: "Alice", score: 10 },
		{ id: 2, name: "Bob", score: 20 }
	]);

	var totalScores = l.reduce(function(total, player) {
		return total + player.score;
	}, 0);

	equal(totalScores, 30, "Reduce works over list");
});

test('reduceRight', function() {
	var l = new DefineList([
		{ id: 1, name: "Alice"},
		{ id: 2, name: "Bob"}
	]);

	var concatenatedNames = l.reduceRight(function(string, person) {
		return string + person.name;
	}, "");

	equal(concatenatedNames, "BobAlice", "ReduceRight works over list");
});
