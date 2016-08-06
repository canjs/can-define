"use strict";
var QUnit = require("steal-qunit");
var DefineList = require("can-define/list/list");
var DefineMap = require("can-define/map/map");
var Observation = require("can-observation");
var define = require("can-define");

var assign = require("can-util/js/assign/assign");
var CID = require("can-util/js/cid/cid");
var types = require("can-util/js/types/types");

QUnit.module("can-define/list/list");

QUnit.test("creating an instance", function(){
    var list = new DefineList(["a","b","c"]);

    list.on("add", function(ev, newVals, index){
        QUnit.deepEqual(newVals, ["d"]);
        QUnit.equal(index, 3);
    });

    list.push("d");
});

test('list attr changes length', function () {
	var l = new DefineList([
		0,
		1,
		2
	]);
	l.set(3, 3);
	equal(l.length, 4);
});
test('remove on pop', function() {
	var l = new DefineList([0, 1, 2]);
    l.pop();

	equal(l.length, 2);
	deepEqual(l.get(), [0, 1]);
});
test('list splice', function () {
	var l = new DefineList([
		0,
		1,
		2,
		3
	]);

    l.on('add', function(ev, newVals, index){
        deepEqual(newVals, [
            'a',
            'b'
        ], 'got the right newVals');
        equal(index, 1, 'adding items');
    });

    l.on('remove', function(ev, oldVals, index){
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


test('Array accessor methods', 11, function () {
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
		], new DefineList([0]));
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
	l.forEach(function (letter, index) {
		ok(true, 'Iteration');
		if (index === 0) {
			equal(letter, 'a', 'First letter right');
		}
		if (index === 2) {
			equal(letter, 'c', 'Last letter right');
		}
	});
});
test('splice removes items in IE (#562)', function () {
	var l = new DefineList(['a']);
	l.splice(0, 1);
	ok(!l.get(0), 'all props are removed');
});


test('reverse triggers add/remove events (#851)', function() {
	expect(5);
	var l = new DefineList([1,2,3]);

	l.on('add', function() { ok(true, 'add called'); });
	l.on('remove', function() { ok(true, 'remove called'); });
	l.on('length', function() { ok(true, 'length should be called'); });

	l.reverse();

    deepEqual(l.get(), [3,2,1], "reversed");
});

test('filter', function(){
	var l = new DefineList([{id: 1, name: "John"}, {id: 2, name: "Mary"}]);

	var filtered = l.filter(function(item){
		return item.name === "Mary";
	});

	notEqual(filtered._cid, l._cid, "not same object");

	equal(filtered.length, 1, "one item");
	equal(filtered[0].name, "Mary", "filter works");
});

test('No Add Events if DefineList Splice adds the same items that it is removing. (#1277, #1399)', function() {
	var list = new DefineList(["a","b"]);

	list.bind('add', function() {
		ok(false, 'Add callback should not be called.');
	});

	list.bind('remove', function() {
		ok(false, 'Remove callback should not be called.');
	});

  var result = list.splice(0, 2, "a", "b");

  deepEqual(result, ["a", "b"]);
});

test("add event always returns an array as the value (#998)", function() {
	var list = new DefineList([]),
		msg;
	list.bind("add", function(ev, newElements, index) {
		deepEqual(newElements, [4], msg);
	});
	msg = "works on push";
	list.push(4);
	list.pop();
	msg = "works on attr()";
	list.set(0, 4);
	list.pop();
	msg = "works on replace()";
	list.replace([4]);
});

test("Setting with .set() out of bounds of length triggers add event with leading undefineds", function() {
	var list = new DefineList([1]);
	list.bind("add", function(ev, newElements, index) {
		deepEqual(newElements, [undefined, undefined, 4],
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
	var list = new DefineList([ 'aa', 'bb', 'cc']);

	list.splice(0, list.length, 'aa', 'cc', 'dd');
	deepEqual(list.get(), ['aa', 'cc', 'dd']);

	list.splice(0, list.length, 'aa', 'cc');
	deepEqual(list.get(), ['aa', 'cc']);
});

test('filter returns same list type (#1744)', function() {
	var ParentList = DefineList.extend();
	var ChildList = ParentList.extend();

	var children = new ChildList([1,2,3]);

	ok(children.filter(function() {}) instanceof ChildList);
});

test('reverse returns the same list instance (#1744)', function() {
	var ParentList = DefineList.extend();
	var ChildList = ParentList.extend();

	var children = new ChildList([1,2,3]);
	ok(children.reverse() === children);
});


test("slice and join are observable by a compute (#1884)", function(){
	expect(2);

	var list = new DefineList([1,2,3]);

	var sliced = new Observation(function(){
		return list.slice(0,1);
	}, null, {
		updater: function(newVal){
			deepEqual(newVal.get(), [2], "got a new DefineList");
		}
	});
	sliced.getValueAndBind();

	var joined = new Observation(function(){
		return list.join(",");
	}, null, {
		updater: function(newVal){
			equal(newVal, "2,3", "joined is observable");
		}
	});
	joined.getValueAndBind();


	list.shift();


});

test('list.replace', function(){
    var firstArray = [
        {id: 1, name: "Marshall"},
        {id: 2, name: "Austin"},
        {id: 3, name: "Hyrum"}
    ];
    var myList = new DefineList(firstArray);
    var newArray = [
        {id: 4, name: "Aubree"},
        {id: 5, name: "Leah"},
        {id: 6, name: 'Lily'}
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

test('list.map', function(){
	var myArray = [
	    {id: 1, name: "Marshall"},
	    {id: 2, name: "Austin"},
	    {id: 3, name: "Hyrum"}
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
		testMe: function(){
			return "It Worked!";
		}
	});
	var myExtendedList = new ExtendedList(myArray);
	var newExtendedList = myExtendedList.map(function(person) {
    person.lastName = "Thompson";
	    return person;
	});
	QUnit.equal("It Worked!", newExtendedList.testMe(), 'Returns the same type of list.');
});


test('list.sort a simple list', function(){
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

test('list.sort a list of objects', function(){
	var objList = new DefineList([
		{id: 1, name: "Marshall"},
		{id: 2, name: "Austin"},
		{id: 3, name: "Hyrum"}
	]);

	objList.sort(function(a, b){
		if (a.name < b.name) {
			return -1;
		} else if (a.name > b.name){
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

test('list.sort a list of DefineMaps', function(){
	var Account = DefineMap.extend({
		name: "string",
		amount: "number",
		slug: {
			serialize: true,
			get: function(){
				return this.name.toLowerCase().replace(/ /g,'-').replace(/[^\w-]+/g,'');
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
	accounts.sort(function(a, b){
		if (a.name < b.name) {
			return -1;
		} else if (a.name > b.name){
			return 1;
		} else {
			return 0;
		}
	});
	equal(accounts.length, 3);
	equal(accounts[0].name, "Checking");
	equal(accounts[1].name, "Kids Savings");
	equal(accounts[2].name, "Savings", "List of DefineMaps was properly sorted.");

	// Try sorting in reverse on the dynamic `slug` property
	accounts.sort(function(a, b){
		if (a.slug < b.slug) {
			return 1;
		} else if (a.slug > b.slug){
			return -1;
		} else {
			return 0;
		}
	});

	equal(accounts.length, 3);
	equal(accounts[0].name, "Savings");
	equal(accounts[1].name, "Kids Savings");
	equal(accounts[2].name, "Checking", "List of DefineMaps was properly sorted by a dynamic property.");
});

test("list defines", 6, function(){
    var Todo = function(props){
        assign(this, props);
        CID(this);
    };
    define(Todo.prototype,{
        completed: "boolean",
        destroyed: {
            value: false
        }
    });
    Todo.prototype.destroy = function(){
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

    var todos = new TodoList([{completed: true},{completed: false}]);

    ok(todos.item(0) instanceof Todo, "correct instance");
    equal(todos.completed.length, 1, "only one todo");

    todos.on("completed", function(ev, newVal, oldVal){
        ok(newVal instanceof TodoList, "right type");
        equal(newVal.length, 2, "all items");
        ok(oldVal instanceof TodoList, "right type");
        equal(oldVal.length, 1, "all items");
    });

    todos.setCompletedTo(true);

});

QUnit.test("extending the base supports overwriting _eventSetup", function(){
    var L = DefineList.extend({});
    Object.getOwnPropertyDescriptor(DefineMap.prototype,"_eventSetup");
    L.prototype.arbitraryProp = true;
    ok(true,"set arbitraryProp");
    L.prototype._eventSetup = function(){};
    ok(true, "worked");
});

QUnit.test("setting expandos on a DefineList", function(){
    var DL = DefineList.extend({
        count: "number"
    });

    var dl = new DL();
    dl.set({count: 5, skip: 2});

    QUnit.equal( dl.get("count"), 5, "read with .get defined"); //-> 5
    QUnit.equal( dl.count, 5, "read with . defined");

    QUnit.equal( dl.get("skip"), 2, "read with .get expando");
    QUnit.equal( dl.skip, 2, "read with . expando");

    QUnit.equal( dl.get("limit"), undefined, "read with .get undefined");
});

QUnit.test("passing a DefineList to DefineList (#33)", function(){
    var m = new DefineList([{},{}]);

    var m2 = new DefineList(m);
    QUnit.deepEqual(m.get(), m2.get());
    QUnit.ok(m[0] === m2[0], "index the same");
    QUnit.ok(m[1] === m2[1], "index the same");

});

QUnit.test("reading and setting expandos", function(){
    var list = new DefineList();
    var countObservation = new Observation(function(){
        return list.get("count");
    }, null, function(newValue){
        QUnit.equal(newValue, 1000, "got new value");
    });
    countObservation.start();

    list.set("count",1000);

    QUnit.equal( countObservation.value, 1000);


    var list2 = new DefineList();
    list2.on("count", function(ev, newVal){
        QUnit.equal(newVal, 5);
    });
    list2.set("count", 5);
});

QUnit.test("is list like", function(){
    var list = new DefineList();
    QUnit.ok( types.isListLike(list) );
});
