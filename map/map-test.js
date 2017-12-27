"use strict";
var QUnit = require("steal-qunit");
var DefineMap = require("can-define/map/map");
var define = require("can-define");
var Observation = require("can-observation");
var each = require("can-util/js/each/each");
var assign = require("can-util/js/assign/assign");
var canReflect = require("can-reflect");
var canSymbol = require("can-symbol");
var isPlainObject = require("can-util/js/is-plain-object/is-plain-object");
var canTestHelpers = require("can-test-helpers/lib/dev");
var DefineList = require("can-define/list/list");
var dev = require("can-log/dev/dev");

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
	});
	canReflect.onValue(oi, function(newVal){
		QUnit.equal(newVal, "bar", "updated to bar");
	});

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
	map.assign({a: 0, b: 2});

	QUnit.deepEqual(map.get(), {a: 0, b: 2}, "added props");

	map.update({a: 2});

	QUnit.deepEqual(map.get(), {a: 2}, "removed b");

	map.assign({foo: {bar: "VALUE"}});

	QUnit.deepEqual(map.get(), {foo: {bar: "VALUE"}, a: 2}, "works nested");
});

QUnit.test("serialize responds to added props", function(){
	var map = new DefineMap();
	var oi = new Observation(function(){
		return map.serialize();
	});
	canReflect.onValue(oi, function(newVal){
		QUnit.deepEqual(newVal, {a: 1, b: 2}, "updated right");
	});

	map.assign({a: 1, b: 2});
});

QUnit.test("initialize an undefined property", function(){
	var MyMap = DefineMap.extend({seal: false},{});
	var instance = new MyMap({foo: "bar"});

	equal(instance.foo, "bar");
});

QUnit.test("set an already initialized null property", function(){
  var map = new DefineMap({ foo: null });
  map.assign({ foo: null });

  equal(map.foo, null);
});

QUnit.test("creating a new key doesn't cause two changes", 1, function(){
	var map = new DefineMap();
	var oi = new Observation(function(){
		return map.serialize();
	});
	canReflect.onValue(oi, function(newVal){
		QUnit.deepEqual(newVal, {a: 1}, "updated right");
	});

	map.set("a", 1);
});

QUnit.test("setting nested object", function(){
	var m = new DefineMap({});

	m.assign({foo: {}});
	m.assign({foo: {}});
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
	var MyType = DefineMap.extend({

	});
	var a = new MyType({
		"foo": "bar"
	});

	var b = new DefineMap(a);

	QUnit.notEqual(a.constructor, b.constructor, "Constructor prop not copied");
	QUnit.notEqual(a._data, b._data, "_data prop not copied");
	QUnit.notEqual(a._cid, b._cid, "_cid prop not copied");
	QUnit.equal(a.foo, b.foo, "Other props copied");

});

QUnit.test("copying from .set() excludes special keys", function() {

	var MyType = DefineMap.extend({});

	var a = new MyType({
		"foo": "bar",
		"existing": "newVal"
	});

	var b = new DefineMap({
		"existing": "oldVal"
	});
	b.assign(a);

	QUnit.notEqual(a.constructor, b.constructor, "Constructor prop not copied");
	QUnit.notEqual(a._data, b._data, "_data prop not copied");
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
	var itemsList = new Observation(function(){
		count++;
		return items.item;
	});

	canReflect.onValue(itemsList, function(){});

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

QUnit.test("can-reflect reflections work with DefineMap", function() {
	var b = new DefineMap({ "foo": "bar" });
	var c = new (DefineMap.extend({
		"baz": {
			get: function() {
				return b.foo;
			}
		}
	}))({ "foo": "bar", thud: "baz" });

	QUnit.equal( canReflect.getKeyValue(b, "foo"), "bar", "unbound value");

	var handler = function(newValue){
		QUnit.equal(newValue, "quux", "observed new value");

		// Turn off the "foo" handler but "thud" should still be bound.
		canReflect.offKeyValue(c, "baz", handler);
	};
	QUnit.ok(!canReflect.isValueLike(c), "isValueLike is false");
	QUnit.ok(canReflect.isObservableLike(c), "isObservableLike is true");
	QUnit.ok(canReflect.isMapLike(c), "isMapLike is true");
	QUnit.ok(!canReflect.isListLike(c), "isListLike is false");

	QUnit.ok( !canReflect.keyHasDependencies(b, "foo"), "keyHasDependencies -- false");

	canReflect.onKeyValue(c, "baz", handler);
	// Do a second binding to check that you can unbind correctly.
	canReflect.onKeyValue(c, "thud", handler);
	QUnit.ok( canReflect.keyHasDependencies(c, "baz"), "keyHasDependencies -- true");

	b.foo = "quux";
	c.thud = "quux";

	QUnit.equal( canReflect.getKeyValue(c, "baz"), "quux", "bound value");
	// sanity checks to ensure that handler doesn't get called again.
	b.foo = "thud";
	c.baz = "jeek";

});

QUnit.test("can-reflect setKeyValue", function(){
	var a = new DefineMap({ "a": "b" });

	canReflect.setKeyValue(a, "a", "c");
	QUnit.equal(a.a, "c", "setKeyValue");
});

QUnit.test("can-reflect deleteKeyValue", function(){
	var a = new DefineMap({ "a": "b" });

	canReflect.deleteKeyValue(a, "a");
	QUnit.equal(a.a, undefined, "value is now undefined");
	QUnit.ok(!("a" in a.get()), "value not included in serial");
});

QUnit.test("can-reflect getKeyDependencies", function() {
	var a = new DefineMap({ "a": "a" });
	var b = new (DefineMap.extend({
		"a": {
			get: function() {
				return a.a;
			}
		}
	}))();

	// DefineMaps bind automatically without events, so this is already running.
	ok(canReflect.getKeyDependencies(b, "a"), "dependencies exist");
	ok(!canReflect.getKeyDependencies(b, "b"), "no dependencies exist for unknown value");
	ok(canReflect.getKeyDependencies(b, "a").valueDependencies.has(b._computed.a.compute), "dependencies returned");

});

QUnit.test("can-reflect assign", function() {
	var aData = { "a": "b" };
	var bData = { "b": "c" };

	var a = new DefineMap(aData);
	var b = new DefineMap(bData);

	canReflect.assign( a,b);
	QUnit.deepEqual(a.get(), assign(aData, bData), "when called with an object, should merge into existing object");
});

QUnit.test("Does not attempt to redefine _data if already defined", function() {
	var Bar = DefineMap.extend({seal: false}, {
		baz: { value : "thud" }
	});

	var baz = new Bar();

	define(baz, {
		quux: { value: "jeek" },
		plonk: {
			get: function() {
				return "waldo";
			}
		}
	}, baz._define);

	QUnit.equal(baz.quux, "jeek", "New definitions successful");
	QUnit.equal(baz.plonk, "waldo", "New computed definitions successful");
	QUnit.equal(baz.baz, "thud", "Old definitions still available");

});

if (!System.isEnv('production')) {
	QUnit.test("redefines still not allowed on sealed objects", function() {
		QUnit.expect(6);
		var Bar = DefineMap.extend({seal: true}, {
			baz: { value : "thud" }
		});

		var baz = new Bar();

		try {
			define(baz, {
				quux: { value: "jeek" }
			}, baz._define);
		} catch(e) {
			QUnit.ok(/is not extensible/i.test(e.message), "Sealed object throws on data property defines");
			QUnit.ok(!Object.getOwnPropertyDescriptor(baz, "quux"), "nothing set on object");
			QUnit.ok(!Object.getOwnPropertyDescriptor(baz._data, "quux"), "nothing set on _data");
		}

		try {
			define(baz, {
				plonk: {
					get: function() {
						return "waldo";
					}
				}
			}, baz._define);
		} catch(e) {
			QUnit.ok(/is not extensible/i.test(e.message), "Sealed object throws on computed property defines");
			QUnit.ok(!Object.getOwnPropertyDescriptor(baz, "plonk"), "nothing set on object");
			QUnit.ok(!Object.getOwnPropertyDescriptor(baz._computed, "plonk"), "nothing set on _computed");
		}
	});
}

QUnit.test("Call .get() when a nested object has its own get method", function(){
	var Bar = DefineMap.extend({
		request: "*"
	});

	var request = {
		prop: 22,
		get: function(){
			if(arguments.length === 0) {
				throw new Error("This function can't be called with 0 arguments");
			}
		}
	};

	var obj = new Bar({ request: request });
	var data = obj.get();

	QUnit.equal(data.request.prop, 22, "obj did get()");
});

QUnit.test("DefineMap short-hand Type (#221)", function(){
	var Child = DefineMap.extend('child', {
		other: DefineMap
	});

	var c = new Child();
	c.other = {
		prop: 'hello'
	};

	QUnit.ok(c.other instanceof DefineMap, "is a DefineMap");

});

QUnit.test("non-Object constructor", function() {
	var Constructor = DefineMap.extend();
	QUnit.ok(!isPlainObject(new DefineMap()), "instance of DefineMap is not a plain object");
	QUnit.ok(!isPlainObject(new Constructor()), "instance of extended DefineMap is not a plain object");
});

QUnit.test('Observation bound to getter using lastSetVal updates correctly (canjs#3541)', function() {
	var MyMap = DefineMap.extend({
		foo: {
			get: function(lastSetVal) {
				if (lastSetVal) {
					return lastSetVal;
				}
			}
		}
	});
	var map = new MyMap();
	var oi = new Observation(function(){
		return map.get("foo");
	});
	canReflect.onValue(oi, function(newVal){
		QUnit.equal(newVal, "bar", "updated to bar");
	});

	map.set("foo","bar");

});

QUnit.test('Observation bound to async getter updates correctly (canjs#3541)', function() {
	var MyMap = DefineMap.extend({
		foo: {
			get: function(lastSetVal, resolve) {
				if (lastSetVal) {
					return resolve(lastSetVal);
				}
			}
		}
	});
	var map = new MyMap();
	var oi = new Observation(function(){
		return map.get("foo");
	});
	canReflect.onValue(oi, function(newVal){
		QUnit.equal(newVal, "bar", "updated to bar");
	});

	map.set("foo","bar");

});

canTestHelpers.devOnlyTest("log all property changes", function(assert) {
	var done = assert.async();

	var Person = DefineMap.extend({
		first: "string",
		last: "string",
		children: {
			Type: DefineList
		},
		fullName: {
			get: function(){
				return this.first + " " + this.last;
			}
		}
	});

	var changed = [];
	var log = dev.log;
	dev.log = function() {
		// collect the property keys that were logged
		changed.push(JSON.parse(arguments[2]));
	};

	var p = new Person();
	p.log();

	// bind fullName to get events from the getter
	p.on("fullName", function() {});

	p.first = "Manuel";
	p.last = "Mujica";

	assert.expect(1);
	setTimeout(function() {
		dev.log = log;
		assert.deepEqual(
			changed,
			["first", "fullName", "last", "fullName"],
			"should log all property changes"
		);
		done();
	});
});

canTestHelpers.devOnlyTest("log single property changes", function(assert) {
	var done = assert.async();

	var Person = DefineMap.extend({
		first: "string",
		last: "string",
		age: "number"
	});

	var changed = [];
	var log = dev.log;
	dev.log = function() {
		// collect the property keys that were logged
		changed.push(JSON.parse(arguments[2]));
	};

	var p = new Person();
	p.log("first");

	p.first = "John";
	p.last = "Doe";
	p.age = 99;

	assert.expect(1);
	setTimeout(function() {
		dev.log = log;
		assert.deepEqual(changed, ["first"], "should log 'first' changes");
		done();
	});
});

canTestHelpers.devOnlyTest("log multiple property changes", function(assert) {
	var done = assert.async();

	var Person = DefineMap.extend({
		first: "string",
		last: "string",
		age: "number",
		company: "string"
	});

	var changed = [];
	var log = dev.log;
	dev.log = function() {
		// collect the property keys that were logged
		changed.push(JSON.parse(arguments[2]));
	};

	var p = new Person();
	p.log("first");
	p.log("age");

	p.first = "John";
	p.last = "Doe";
	p.company = "Bitovi";
	p.age = 99;

	assert.expect(1);
	setTimeout(function() {
		dev.log = log;
		assert.deepEqual(changed, ["first", "age"], "should log first and age");
		done();
	});
});

canTestHelpers.devOnlyTest("Setting a value with an object type generates a warning (#148)", function() {
	QUnit.expect(1);

	var message = "can-define: The value for options is set to an object. This will be shared by all instances of the DefineMap. Use a function that returns the object instead.";
	var finishErrorCheck = canTestHelpers.willWarn(message);

	//should issue a warning
	DefineMap.extend({
		options: {
			value: {}
		}
	});
	//should issue a warning
	DefineMap.extend({
		options: {
			value: []
		}
	});

	//should not issue a warning
	DefineMap.extend({
		options: {
			value: function(){}
		}
	});

	//should not issue a warning
	DefineMap.extend({
		options: {
			value: 2
		}
	});

	QUnit.equal(finishErrorCheck(), 2);
});

canTestHelpers.devOnlyTest("Setting a value to a constructor type generates a warning", function() {
	QUnit.expect(1);

	var message = "can-define: The \"value\" for options is set to a constructor. Did you mean \"Value\" instead?";
	var finishErrorCheck = canTestHelpers.willWarn(message);

	//should issue a warning
	DefineMap.extend({
		options: {
			value: DefineMap
		}
	});

	QUnit.equal(finishErrorCheck(), 1);
});

canTestHelpers.devOnlyTest("can.getName symbol behavior", function(assert) {
	var getName = function(instance) {
		return instance[canSymbol.for("can.getName")]();
	};

	assert.ok(
		"DefineMap{}", getName(new DefineMap()),
		"should use DefineMap constructor name by default"
	);

	var MyMap = DefineMap.extend("MyMap", {});

	assert.ok(
		"MyMap{}", getName(new MyMap()),
		"should use custom map name when provided"
	);
});

canTestHelpers.devOnlyTest("Error on not using a constructor or string on short-hand definitions (#278)", function() {
	expect(5);
	var message = /.+ on .+ does not match a supported propDefinition. See: https:\/\/canjs.com\/doc\/can-define.types.propDefinition.html/i;

	var finishErrorCheck = canTestHelpers.willError(message, function(actual, match) {
		var rightProp = /prop0[15]/;
		QUnit.ok(rightProp.test(actual.slice(0, 6)));
		QUnit.ok(match);
	});

	DefineMap.extend('ShortName', {
		prop01: 0,
		prop02: function() {},
		prop03: 'string',
		prop04: DefineMap,
		prop05: "a string that is not a type",
		prop06: [],
		get prop07() {},
		set prop07(newVal) {},
		prop08: 'boolean'
	});

	QUnit.equal(finishErrorCheck(), 2);
});

QUnit.test('Improper shorthand properties are not set', function() {
	var VM = DefineMap.extend({
		prop01: 0,
		prop02: function() {},
		prop03: 'some random string'
	});

	QUnit.equal(VM.prototype._define.methods.prop01, undefined);
	QUnit.equal(typeof VM.prototype._define.methods.prop02, 'function');
	QUnit.equal(VM.prototype._define.methods.prop03, undefined);
});

QUnit.test("onKeyValue sets up computed values", function(){
	var fullNameCalls = [];
	var VM = DefineMap.extend({
		first: "string",
		last: "string",
		get fullName() {
			fullNameCalls.push(this.first + " "+ this.last);
			return this.first + " "+ this.last;
		}
	});

	var vm = new VM({first: "J", last: "M"});

	canReflect.onKeyValue(vm, "fullName", function(){});

	QUnit.deepEqual(fullNameCalls,["J M"]);

});

QUnit.test("async getters derived from other properties should have correct keyDependencies", function() {

	var VM = DefineMap.extend({
		get source() {
			return 'source value';
		},

		derived: {
			get: function(last, resolve) {
				return resolve(this.source);
			}
		}
	});

	var vm = new VM();

	vm.on('derived', function(){});
	QUnit.ok(vm._computed.derived.compute.observation.newDependencies.keyDependencies.get(vm).has('source'), 'getter should depend on vm.source');
});
