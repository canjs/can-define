"use strict";
var QUnit = require("steal-qunit");
var DefineList = require("can-define/list/list");
var DefineMap = require("can-define/map/map");
var ObserveInfo = require("can-observe-info");
var define = require("can-define");

var assign = require("can-util/js/assign/assign");
var CID = require("can-util/js/cid/cid");

QUnit.module("can-define/list/list");

QUnit.test("creating an instance", function(){
    var list = new DefineList(["a","b","c"]);

    list.on("add", function(ev, newVals, index){
        QUnit.deepEqual(newVals, ["d"]);
        QUnit.equal(index, 3);
    });

    list.push("d")
});

test('list attr changes length', function () {
	var l = new DefineList([
		0,
		1,
		2
	]);
	l.attr(3, 3);
	equal(l.length, 4);
});
test('remove on pop', function() {
	var l = new DefineList([0, 1, 2]);
    l.pop();

	equal(l.length, 2);
	deepEqual(l.attr(), [0, 1]);
});
test('list splice', function () {
	var l = new DefineList([
		0,
		1,
		2,
		3
	]),
		first = true;

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
	deepEqual(l.items(), [
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
	ok(!l.attr(0), 'all props are removed');
});


test('reverse triggers add/remove events (#851)', function() {
	expect(5);
	var l = new DefineList([1,2,3]);

	l.on('add', function() { ok(true, 'add called'); });
	l.on('remove', function() { ok(true, 'remove called'); });
	l.on('length', function() { ok(true, 'length should be called'); });

	l.reverse();

    deepEqual(l.items(), [3,2,1], "reversed")
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
	list.attr(0, 4);
	list.pop();
	msg = "works on replace()";
	list.replace([4]);
});

test("Setting with .attr() out of bounds of length triggers add event with leading undefineds", function() {
	var list = new DefineList([1]);
	list.bind("add", function(ev, newElements, index) {
		deepEqual(newElements, [undefined, undefined, 4],
				  "Leading undefineds are included");
		equal(index, 1, "Index takes into account the leading undefineds from a .attr()");
	});
	list.attr(3, 4);
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

	l.attr('1', 'foo');
	equal(l.attr('1'), 'foo');
});

test('splice with similar but less items works (#1606)', function() {
	var list = new DefineList([ 'aa', 'bb', 'cc']);

	list.splice(0, list.length, 'aa', 'cc', 'dd');
	deepEqual(list.attr(), ['aa', 'cc', 'dd']);

	list.splice(0, list.length, 'aa', 'cc');
	deepEqual(list.attr(), ['aa', 'cc']);
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

	var sliced = new ObserveInfo(function(){
		return list.slice(0,1);
	}, null, {
		updater: function(newVal){
			deepEqual(newVal.attr(), [2], "got a new DefineList");
		}
	});
	sliced.getValueAndBind();

	var joined = new ObserveInfo(function(){
		return list.join(",");
	}, null, {
		updater: function(newVal){
			equal(newVal, "2,3", "joined is observable");
		}
	});
	joined.getValueAndBind();


	list.shift();


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
    			todo.destroy()
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
    var c = Object.getOwnPropertyDescriptor(DefineMap.prototype,"_eventSetup");
    L.prototype.arbitraryProp = true;
    ok(true,"set arbitraryProp");
    L.prototype._eventSetup = function(){};
    ok(true, "worked");
});
