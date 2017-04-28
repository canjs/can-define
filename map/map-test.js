"use strict";
var QUnit = require("steal-qunit");
var DefineMap = require("can-define/map/map");
var Observation = require("can-observation");
var canTypes = require("can-types");
var each = require("can-util/js/each/each");
var compute = require("can-compute");
var assign = require("can-util/js/assign/assign");
var sealWorks = (function() {
	try {
		var o = {};
		Object.seal(o);
		o.prop = true;
		return false;
	} catch(e) {
		return true;
	}
})();

QUnit.module("can-define/map/map");

QUnit.test("Map is an event emitter", function (assert) {
	var Base = DefineMap.extend({});
	assert.ok(Base.on, 'Base has event methods.');
	var Map = Base.extend({});
	assert.ok(Map.on, 'Map has event methods.');
});

QUnit.test("creating an instance", function(){
	var map = new DefineMap({prop: "foo"});
	map.on("prop", function(ev, newVal, oldVal){
		QUnit.equal(newVal, "BAR");
		QUnit.equal(oldVal, "foo");
	});

	map.prop = "BAR";
});

QUnit.test("creating an instance with nested prop", function(){

	var map = new DefineMap({name: {first: "Justin"}});

	map.name.on("first", function(ev, newVal, oldVal){
		QUnit.equal(newVal, "David");
		QUnit.equal(oldVal, "Justin");
	});

	map.name.first = "David";
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

QUnit.test("loop only through defined serializable props", function(){
	var MyMap = DefineMap.extend({
		propA: {},
		propB: {serialize: false},
		propC: {
			get: function(){
				return this.propA;
			}
		}
	});
	var inst = new MyMap({propA: 1, propB: 2});
	QUnit.deepEqual(Object.keys(inst.get()), ["propA"]);

});

QUnit.test("get and set can setup expandos", function(){
	var map = new DefineMap();
	var oi = new Observation(function(){
		return map.get("foo");
	},null,{
		updater: function(newVal){
			QUnit.equal(newVal, "bar", "updated to bar");
		}
	});
	oi.start();

	map.set("foo","bar");

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

if (!System.isEnv('production')) {
	QUnit.test("extends sealed objects (#48)", function(){
		var Map1 = DefineMap.extend({ seal: true }, {
			name: {
				get: function(curVal){
					return "computed " + curVal;
				}
			}
		});
		var Map2 = Map1.extend({ seal: false }, {});
		var Map3 = Map2.extend({ seal: true }, {});

		var map1 = new Map1({ name: "Justin" });
		try {
			map1.foo = "bar";
			if (map1.foo) {
				QUnit.ok(false, "map1 not sealed");
			} else {
				QUnit.ok(true, "map1 sealed - silent failure");
			}
		} catch(ex) {
			QUnit.ok(true, "map1 sealed");
		}
		QUnit.equal(map1.name, "computed Justin", "map1.name property is computed");

		var map2 = new Map2({ name: "Brian" });
		try {
			map2.foo = "bar";
			if (map2.foo) {
				QUnit.ok(true, "map2 not sealed");
			} else {
				QUnit.ok(false, "map2 sealed");
			}
		} catch (ex) {
			QUnit.ok(false, "map2 sealed");
		}
		QUnit.equal(map2.name, "computed Brian", "map2.name property is computed");

		var map3 = new Map3({ name: "Curtis" });
		try {
			map3.foo = "bar";
			if (map3.foo) {
				QUnit.ok(false, "map3 not sealed");
			} else {
				QUnit.ok(true, "map3 sealed");
			}
		} catch (ex) {
			QUnit.ok(true, "map3 sealed");
		}
		QUnit.equal(map3.name, "computed Curtis", "map3.name property is computed");
	});
}

QUnit.test("get with dynamically added properties", function(){
	var map = new DefineMap();
	map.set("a",1);
	map.set("b",2);
	QUnit.deepEqual(map.get(), {a: 1, b: 2});
});


QUnit.test("set multiple props", function(){
	var map = new DefineMap();
	map.set({a: 0, b: 2});

	QUnit.deepEqual(map.get(), {a: 0, b: 2});

	map.set({a: 2}, true);

	QUnit.deepEqual(map.get(), {a: 2});

	map.set({foo: {bar: "VALUE"}});

	QUnit.deepEqual(map.get(), {foo: {bar: "VALUE"}, a: 2});
});

QUnit.test("serialize responds to added props", function(){
	var map = new DefineMap();
	var oi = new Observation(function(){
		return map.serialize();
	},null,{
		updater: function(newVal){
			QUnit.deepEqual(newVal, {a: 1, b: 2}, "updated right");
		}
	});
	oi.start();

	map.set({a: 1, b: 2});
});

QUnit.test("initialize an undefined property", function(){
	var MyMap = DefineMap.extend({seal: false},{});
	var instance = new MyMap({foo: "bar"});

	equal(instance.foo, "bar");
});

QUnit.test("set an already initialized null property", function(){
  var map = new DefineMap({ foo: null });
  map.set({ foo: null });

  equal(map.foo, null);
});

QUnit.test("creating a new key doesn't cause two changes", 1, function(){
	var map = new DefineMap();
	var oi = new Observation(function(){
		return map.serialize();
	},null,{
		updater: function(newVal){
			QUnit.deepEqual(newVal, {a: 1}, "updated right");
		}
	});
	oi.start();

	map.set("a", 1);
});

QUnit.test("setting nested object", function(){
	var m = new DefineMap({});

	m.set({foo: {}});
	m.set({foo: {}});
	QUnit.deepEqual(m.get(), {foo: {}});
});

QUnit.test("passing a DefineMap to DefineMap (#33)", function(){
	var MyMap = DefineMap.extend({foo: "observable"});
	var m = new MyMap({foo: {}, bar: {}});

	var m2 = new MyMap(m);
	QUnit.deepEqual(m.get(), m2.get());
	QUnit.ok(m.foo === m2.foo, "defined props the same");
	QUnit.ok(m.bar === m2.bar, "expando props the same");

});

QUnit.test("serialize: function works (#38)", function(){
	var Something = DefineMap.extend({});

	var MyMap = DefineMap.extend({
		somethingRef: {
			type: function(val){
				return new Something({id: val});
			},
			serialize: function(val){
				return val.id;
			}
		},
		somethingElseRef: {
			type: function(val){
				return new Something({id: val});
			},
			serialize: false
		}
	});

	var myMap = new MyMap({somethingRef: 2, somethingElseRef: 3});

	QUnit.ok(myMap.somethingRef instanceof Something);
	QUnit.deepEqual( myMap.serialize(), {somethingRef: 2}, "serialize: function and serialize: false works");


	var MyMap2 = DefineMap.extend({
		"*": {
			serialize: function(value){
				return "" + value;
			}
		}
	});

	var myMap2 = new MyMap2({foo: 1, bar: 2});
	QUnit.deepEqual( myMap2.serialize(), {foo: "1", bar: "2"}, "serialize: function on default works");

});

QUnit.test("isMapLike", function(){
	var map = new DefineMap({});
	ok(canTypes.isMapLike(map), "is map like");
});

QUnit.test("get will not create properties", function(){
	var method = function(){};
	var MyMap = DefineMap.extend({
		method: method
	});
	var m = new MyMap();
	m.get("foo");

	QUnit.equal(m.get("method"), method);
});

QUnit.test("Properties are enumerable", function(){
  QUnit.expect(4);

  var VM = DefineMap.extend({
	foo: "string"
  });
  var vm = new VM({ foo: "bar", baz: "qux" });

  var i = 0;
  each(vm, function(value, key){
	if(i === 0) {
	  QUnit.equal(key, "foo");
	  QUnit.equal(value, "bar");
	} else {
	  QUnit.equal(key, "baz");
	  QUnit.equal(value, "qux");
	}
	i++;
  });
});

QUnit.test("Getters are not enumerable", function(){
  QUnit.expect(2);

  var MyMap = DefineMap.extend({
	foo: "string",
	baz: {
	  get: function(){
		return this.foo;
	  }
	}
  });

  var map = new MyMap({ foo: "bar" });

  each(map, function(value, key){
	QUnit.equal(key, "foo");
	QUnit.equal(value, "bar");
  });
});

QUnit.test("extending DefineMap constructor functions (#18)", function(){
	var AType = DefineMap.extend("AType", { aProp: {}, aMethod: function(){} });

	var BType = AType.extend("BType", { bProp: {}, bMethod: function(){} });

	var CType = BType.extend("CType", { cProp: {}, cMethod: function(){} });

	var map = new CType();

	map.on("aProp", function(ev, newVal, oldVal){
		QUnit.equal(newVal, "PROP");
		QUnit.equal(oldVal, undefined);
	});
	map.on("bProp", function(ev, newVal, oldVal){
		QUnit.equal(newVal, "FOO");
		QUnit.equal(oldVal, undefined);
	});
	map.on("cProp", function(ev, newVal, oldVal){
		QUnit.equal(newVal, "BAR");
		QUnit.equal(oldVal, undefined);
	});

	map.aProp = "PROP";
	map.bProp = 'FOO';
	map.cProp = 'BAR';
	QUnit.ok(map.aMethod);
	QUnit.ok(map.bMethod);
	QUnit.ok(map.cMethod);
});

QUnit.test("extending DefineMap constructor functions more than once (#18)", function(){
	var AType = DefineMap.extend("AType", { aProp: {}, aMethod: function(){} });

	var BType = AType.extend("BType", { bProp: {}, bMethod: function(){} });

	var CType = AType.extend("CType", { cProp: {}, cMethod: function(){} });

	var map1 = new BType();
	var map2 = new CType();

	map1.on("aProp", function(ev, newVal, oldVal){
		QUnit.equal(newVal, "PROP", "aProp newVal on map1");
		QUnit.equal(oldVal, undefined);
	});
	map1.on("bProp", function(ev, newVal, oldVal){
		QUnit.equal(newVal, "FOO", "bProp newVal on map1");
		QUnit.equal(oldVal, undefined);
	});

	map2.on("aProp", function(ev, newVal, oldVal){
		QUnit.equal(newVal, "PROP", "aProp newVal on map2");
		QUnit.equal(oldVal, undefined);
	});
	map2.on("cProp", function(ev, newVal, oldVal){
		QUnit.equal(newVal, "BAR", "cProp newVal on map2");
		QUnit.equal(oldVal, undefined);
	});

	map1.aProp = "PROP";
	map1.bProp = 'FOO';
	map2.aProp = "PROP";
	map2.cProp = 'BAR';
	QUnit.ok(map1.aMethod, "map1 aMethod");
	QUnit.ok(map1.bMethod);
	QUnit.ok(map2.aMethod);
	QUnit.ok(map2.cMethod, "map2 cMethod");
});

QUnit.test("extending DefineMap constructor functions - value (#18)", function(){
	var AType = DefineMap.extend("AType", { aProp: {value: 1} });

	var BType = AType.extend("BType", { });

	var CType = BType.extend("CType",{ });

	var c = new CType();
	QUnit.equal( c.aProp , 1 ,"got initial value" );
});

QUnit.test("copying DefineMap excludes constructor", function() {

	var AType = DefineMap.extend("AType", { aProp: {value: 1} });

	var a = new AType();

	var b = assign({}, a);

	QUnit.notEqual(a.constructor, b.constructor, "Constructor prop not copied");
	QUnit.equal(a.aProp, b.aProp, "Other values are unaffected");

});

QUnit.test("cloning from non-defined map excludes special keys on setup", function() {

	var a = {
		_data: {},
		constructor: function() {},
		_bindEvents: {},
		_cid: "object0",
		"foo": "bar"
	};

	var b = new DefineMap(a);

	QUnit.notEqual(a.constructor, b.constructor, "Constructor prop not copied");
	QUnit.notEqual(a._data, b._data, "_data prop not copied");
	QUnit.notEqual(a._bindEvents, b._bindEvents, "_bindEvents prop not copied");
	QUnit.notEqual(a._cid, b._cid, "_cid prop not copied");
	QUnit.equal(a.foo, b.foo, "Other props copied");

});

QUnit.test("copying from .set() excludes special keys", function() {

	var a = {
		_data: {},
		constructor: function() {},
		_bindEvents: {},
		_cid: "object0",
		"foo": "bar",
		"existing": "newVal"
	};

	var b = new DefineMap({
		"existing": "oldVal"
	});
	b.set(a);

	QUnit.notEqual(a.constructor, b.constructor, "Constructor prop not copied");
	QUnit.notEqual(a._data, b._data, "_data prop not copied");
	QUnit.notEqual(a._bindEvents, b._bindEvents, "_bindEvents prop not copied");
	QUnit.notEqual(a._cid, b._cid, "_cid prop not copied");
	QUnit.equal(a.foo, b.foo, "NEw props copied");

});

QUnit.test("copying with assign() excludes special keys", function() {

	var a = {
		_data: {},
		constructor: function() {},
		__bindEvents: {},
		_cid: "object0",
		"foo": "bar",
		"existing": "newVal"
	};

	var b = new DefineMap({
		"existing": "oldVal"
	});
	assign(b, a);

	QUnit.notEqual(a.constructor, b.constructor, "Constructor prop not copied");
	QUnit.notEqual(a._data, b._data, "_data prop not copied");
	QUnit.notEqual(a.__bindEvents, b.__bindEvents, "_bindEvents prop not copied");
	QUnit.notEqual(a._cid, b._cid, "_cid prop not copied");
	QUnit.equal(a.foo, b.foo, "New props copied");
	QUnit.equal(a.existing, b.existing, "Existing props copied");
	
});

QUnit.test("shorthand getter setter (#56)", function(){

	var Person = DefineMap.extend({
		first: "*",
		last: "*",
		get fullName() {
			return this.first + " " + this.last;
		},
		set fullName(newVal){
			var parts = newVal.split(" ");
			this.first = parts[0];
			this.last = parts[1];
		}
	});

	var p = new Person({first: "Mohamed", last: "Cherif"});

	p.on("fullName", function(ev, newVal, oldVal) {
		QUnit.equal(oldVal, "Mohamed Cherif");
		QUnit.equal(newVal, "Justin Meyer");
	});

	equal(p.fullName, "Mohamed Cherif", "fullName initialized right");

	p.fullName = "Justin Meyer";
});

QUnit.test('compute props can be set to null or undefined (#2372)', function() {
	var VM = DefineMap.extend({
		computeProp: {
			type: 'compute'
		}
	});

	var vmNull = new VM({computeProp: null});
	QUnit.equal(vmNull.get('computeProp'), null, 'computeProp is null, no error thrown');
	var vmUndef = new VM({computeProp: undefined});
	QUnit.equal(vmUndef.get('computeProp'), undefined, 'computeProp is undefined, no error thrown');
});

QUnit.test("Inheriting DefineMap .set doesn't work if prop is on base map (#74)", function(){
	var Base = DefineMap.extend({
		baseProp: "string"
	});

	var Inheriting = Base.extend();

	var inherting = new Inheriting();

	inherting.set("baseProp", "value");


	QUnit.equal(inherting.baseProp,"value", "set prop");
});

if(sealWorks && System.env.indexOf('production') < 0) {
	QUnit.test("setting not defined property", function(){
		var MyMap = DefineMap.extend({
			prop: {}
		});
		var mymap = new MyMap();

		try {
			mymap.notdefined = "value";
			ok(false, "no error");
		} catch(e) {
			ok(true, "error thrown");
		}
	});
}

QUnit.test(".extend errors when re-defining a property (#117)", function(){

	var A = DefineMap.extend("A", {
		foo: {
			type: "string",
			value: "blah"
		}
	});


	A.extend("B", {
		foo: {
			type: "string",
			value: "flub"
		}
	});

	var C = DefineMap.extend("C", {
		foo: {
			get: function() {
				return "blah";
			}
		}
	});


	C.extend("D", {
		foo: {
			get: function() {
				return "flub";
			}
		}
	});
	QUnit.ok(true, "extended without errors");
});

QUnit.test(".value functions should not be observable", function(){
	var outer = new DefineMap({
		bam: "baz"
	});
	
	var ItemsVM = DefineMap.extend({
		item: {
			value: function(){
				(function(){})(this.zed, outer.bam);
				return new DefineMap({ foo: "bar" });
			}
		},
		zed: "string"
	});
	
	var items = new ItemsVM();
	
	var count = 0;
	var itemsList = compute(function(){
		count++;
		return items.item;
	});
	
	itemsList.on('change', function() {});
	
	items.item.foo = "changed";
	items.zed = "changed";
	
	equal(count, 1);
});

QUnit.test(".value values are overwritten by props in DefineMap construction", function() {
	var Foo = DefineMap.extend({
		bar: {
			value: "baz"
		}
	});

	var foo = new Foo({
		bar: "quux"
	});

	equal(foo.bar, "quux", "Value set properly");
});