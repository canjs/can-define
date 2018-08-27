var QUnit = require("steal-qunit");

var define = require("can-define");
var queues = require("can-queues");
var canSymbol = require("can-symbol");
var SimpleObservable = require("can-simple-observable");
var testHelpers = require("can-test-helpers");
var canReflect = require("can-reflect");

QUnit.module("can-define");

QUnit.test("basics on a prototype", 5, function() {

	var Person = function(first, last) {
		this.first = first;
		this.last = last;
	};
	define(Person.prototype, {
		first: "*",
		last: "*",
		fullName: {
			get: function() {
				return this.first + " " + this.last;
			}
		}
	});

	var p = new Person("Mohamed", "Cherif");

	p.bind("fullName", function(ev, newVal, oldVal) {
		QUnit.equal(oldVal, "Mohamed Cherif");
		QUnit.equal(newVal, "Justin Meyer");
	});

	equal(p.fullName, "Mohamed Cherif", "fullName initialized right");

	p.bind("first", function(el, newVal, oldVal) {
		QUnit.equal(newVal, "Justin", "first new value");
		QUnit.equal(oldVal, "Mohamed", "first old value");
	});

	queues.batch.start();
	p.first = "Justin";
	p.last = "Meyer";
	queues.batch.stop();

});

QUnit.test('basics set', 2, function() {
	var Defined = function(prop) {
		this.prop = prop;
	};

	define(Defined.prototype, {
		prop: {
			set: function(newVal) {
				return "foo" + newVal;
			}
		}
	});

	var def = new Defined();
	def.prop = "bar";


	QUnit.equal(def.prop, "foobar", "setter works");

	var DefinedCB = function(prop) {
		this.prop = prop;
	};

	define(DefinedCB.prototype, {
		prop: {
			set: function(newVal, setter) {
				setter("foo" + newVal);
			}
		}
	});

	var defCallback = new DefinedCB();
	defCallback.prop = "bar";
	QUnit.equal(defCallback.prop, "foobar", "setter callback works");

});



QUnit.test("basic Type", function() {
	var Foo = function(name) {
		this.name = name;
	};
	Foo.prototype.getName = function() {
		return this.name;
	};

	var Typer = function(foo) {
		this.foo = foo;
	};

	define(Typer.prototype, {
		foo: {
			Type: Foo
		}
	});

	var t = new Typer("Justin");
	QUnit.equal(t.foo.getName(), "Justin", "correctly created an instance");

	var brian = new Foo("brian");

	t.foo = brian;

	QUnit.equal(t.foo, brian, "same instances");

});

QUnit.test("type converters", function() {

	var Typer = function(date, string, number, bool, htmlbool, leaveAlone) {
		this.date = date;
		this.string = string;
		this.number = number;
		this.bool = bool;
		this.htmlbool = htmlbool;
		this.leaveAlone = leaveAlone;
	};

	define(Typer.prototype, {
		date: {
			type: 'date'
		},
		string: {
			type: 'string'
		},
		number: {
			type: 'number'
		},
		bool: {
			type: 'boolean'
		},
		htmlbool: {
			type: 'htmlbool'
		},
		leaveAlone: {
			type: '*'
		},
	});

	var obj = {};

	var t = new Typer(
		1395896701516,
		5,
		'5',
		'false',
		"",
		obj
	);

	QUnit.ok(t.date instanceof Date, "converted to date");

	QUnit.equal(t.string, '5', "converted to string");

	QUnit.equal(t.number, 5, "converted to number");

	QUnit.equal(t.bool, false, "converted to boolean");

	QUnit.equal(t.htmlbool, true, "converted to htmlbool");

	QUnit.equal(t.leaveAlone, obj, "left as object");

	t.number = '15';

	QUnit.ok(t.number === 15, "converted to number");

});

QUnit.test("basics value", function() {

	var Typer = function(prop) {
		if (prop !== undefined) {
			this.prop = prop;
		}
	};

	define(Typer.prototype, {
		prop: {
			default: 'foo'
		}
	});
	var t = new Typer();

	QUnit.equal(t.prop, "foo", "value is used as default value");

	var Typer2 = function(prop) {
		if (prop !== undefined) {
			this.prop = prop;
		}
	};

	define(Typer2.prototype, {
		prop: {
			default: function() {
				return [];
			},
			type: "*"
		}
	});

	var t1 = new Typer2(),
		t2 = new Typer2();

	QUnit.ok(t1.prop !== t2.prop, "different array instances");
	QUnit.ok(Array.isArray(t1.prop), "its an array");


});

test("basics Value", function() {

	var Typer = function(prop) {
		//this.prop = prop;
	};
	define(Typer.prototype, {

		prop: {
			Default: Array,
			type: "*"
		}

	});

	var t1 = new Typer(),
		t2 = new Typer();
	QUnit.ok(t1.prop !== t2.prop, "different array instances");
	QUnit.ok(Array.isArray(t1.prop), "its an array");


});

test("setter with no arguments and returns undefined does the default behavior, the setter is for side effects only", function() {
	var Typer = function(prop) {
		//this.prop = prop;
	};
	define(Typer.prototype, {

		prop: {
			set: function() {
				this.foo = "bar";
			}
		},
		foo: "*"

	});

	var t = new Typer();

	t.prop = false;

	deepEqual({
		foo: t.foo,
		prop: t.prop
	}, {
		foo: "bar",
		prop: false
	}, "got the right props");

});

test("type happens before the set", 2, function() {

	var Typer = function() {};
	define(Typer.prototype, {

		prop: {
			type: "number",
			set: function(newValue) {
				equal(typeof newValue, "number", "got a number");
				return newValue + 1;
			}
		}

	});

	var map = new Typer();
	map.prop = "5";

	equal(map.prop, 6, "number");
});


test("getter and setter work", function() {
	expect(5);

	var Paginate = define.Constructor({
		limit: "*",
		offset: "*",
		page: {
			set: function(newVal) {
				this.offset = (parseInt(newVal) - 1) * this.limit;
			},
			get: function() {
				return Math.floor(this.offset / this.limit) + 1;
			}
		}
	});

	var p = new Paginate({
		limit: 10,
		offset: 20
	});

	equal(p.page, 3, "page get right");

	p.bind("page", function(ev, newValue, oldValue) {
		equal(newValue, 2, "got new value event");
		equal(oldValue, 3, "got old value event");
	});

	p.page = 2;

	equal(p.page, 2, "page set right");

	equal(p.offset, 10, "page offset set");

});

test("getter with initial value", function() {

	var comp = new SimpleObservable(1);

	var Grabber = define.Constructor({
		vals: {
			type: "*",
			Default: Array,
			get: function(current, setVal) {
				if (setVal) {
					current.push(comp.get());
				}
				return current;
			}
		}
	});

	var g = new Grabber();
	// This assertion doesn't mean much.  It's mostly testing
	// that there were no errors.
	equal(g.vals.length, 0, "zero items in array");

});

/*
test("value generator is not called if default passed", function () {
	var TestMap = define.Constructor({
		foo: {
			value: function () {
				throw '"foo"\'s value method should not be called.';
			}
		}
	});

	var tm = new TestMap({ foo: 'baz' });

	equal(tm.foo, 'baz');
});*/



test('default behaviors with "*" work for attributes', function() {
	expect(6);
	var DefaultMap = define.Constructor({
		'*': {
			type: 'number',
			set: function(newVal) {
				ok(true, 'set called');
				return newVal;
			}
		},
		someNumber: {
			default: '5'
		},
		number: {}
	});

	var map = new DefaultMap();

	equal(map.someNumber, '5', 'default values are not type converted anymore');
	map.someNumber = '5';
	equal(map.someNumber, 5, 'on a set, they should be type converted');

	map.number = '10'; // Custom set should be called
	equal(map.number, 10, 'value of number should be converted to a number');

});


test("nested define", function() {
	var nailedIt = 'Nailed it';

	var Example = define.Constructor({
		name: {
			default: nailedIt
		}
	});

	var NestedMap = define.Constructor({
		isEnabled: {
			default: true
		},
		test: {
			Default: Example
		},
		examples: {
			type: {
				one: {
					Default: Example
				},
				two: {
					type: {
						deep: {
							Default: Example
						}
					},
					Default: Object
				}
			},
			Default: Object
		}
	});

	var nested = new NestedMap();

	// values are correct
	equal(nested.test.name, nailedIt);
	equal(nested.examples.one.name, nailedIt);
	equal(nested.examples.two.deep.name, nailedIt);

	// objects are correctly instanced
	ok(nested.test instanceof Example);
	ok(nested.examples.one instanceof Example);
	ok(nested.examples.two.deep instanceof Example);
});

test('Can make an attr alias a compute (#1470)', 9, function() {
	var computeValue = new SimpleObservable(1);

	var GetMap = define.Constructor({
		value: {
			set: function(newValue, setVal, oldValue) {
				if (newValue instanceof SimpleObservable) {
					return newValue;
				}
				if (oldValue && (oldValue instanceof SimpleObservable)) {
					oldValue.set(newValue);
					return oldValue;
				}
				return newValue;
			},
			get: function(value) {
				return value instanceof SimpleObservable ? value.get() : value;
			}
		}
	});

	var getMap = new GetMap();

	getMap.value = computeValue;

	equal(getMap.value, 1, "initial value read from compute");

	var bindCallbacks = 0;

	getMap.bind("value", function(ev, newVal, oldVal) {

		switch (bindCallbacks) {
			case 0:
				equal(newVal, 2, "0 - bind called with new val");
				equal(oldVal, 1, "0 - bind called with old val");
				break;
			case 1:
				equal(newVal, 3, "1 - bind called with new val");
				equal(oldVal, 2, "1 - bind called with old val");
				break;
			case 2:
				equal(newVal, 4, "2 - bind called with new val");
				equal(oldVal, 3, "2 - bind called with old val");
				break;
		}


		bindCallbacks++;
	});

	// Try updating the compute's value
	computeValue.set(2);

	// Try setting the value of the property
	getMap.value = 3;

	equal(getMap.value, 3, "read value is 3");
	equal(computeValue.get(), 3, "the compute value is 3");

	// Try setting to a new comptue
	var newComputeValue = new SimpleObservable(4);

	getMap.value = newComputeValue;

});




test("One event on getters (#1585)", function() {

	var Person = define.Constructor({
		name: "*",
		id: "number"
	});

	var AppState = define.Constructor({
		person: {
			get: function appState_person_get(lastSetValue, resolve) {
				if (lastSetValue) {
					return lastSetValue;
				} else if (this.personId) {
					resolve(new Person({
						name: "Jose",
						id: 5
					}));
				} else {
					return null;
				}
			},
			Type: Person
		},
		personId: "*"
	});

	var appState = new AppState();
	var personEvents = 0;
	appState.bind("person", function addPersonEvents(ev, person) {
		personEvents++;
	});

	equal(appState.person, null, "no personId and no lastSetValue");

	appState.personId = 5;
	equal(appState.person.name, "Jose", "a personId, providing Jose");
	ok(appState.person instanceof Person, "got a person instance");

	appState.person = {
		name: "Julia"
	};
	ok(appState.person instanceof Person, "got a person instance");

	equal(personEvents, 2);
});

test('Can read a defined property with a set/get method (#1648)', function() {
	// Problem: "get" is not passed the correct "lastSetVal"
	// Problem: Cannot read the value of "foo"

	var Map = define.Constructor({
		foo: {
			default: '',
			set: function(setVal) {
				return setVal;
			},
			get: function(lastSetVal) {
				return lastSetVal;
			}
		}
	});

	var map = new Map();

	equal(map.foo, '', 'Calling .foo returned the correct value');

	map.foo = 'baz';

	equal(map.foo, 'baz', 'Calling .foo returned the correct value');
});


test('Can bind to a defined property with a set/get method (#1648)', 3, function() {
	// Problem: "get" is not called before and after the "set"
	// Problem: Function bound to "foo" is not called
	// Problem: Cannot read the value of "foo"

	var Map = define.Constructor({
		foo: {
			default: '',
			set: function(setVal) {
				return setVal;
			},
			get: function(lastSetVal) {
				return lastSetVal;
			}
		}
	});

	var map = new Map();

	map.bind('foo', function() {
		ok(true, 'Bound function is called');
	});

	equal(map.foo, '', 'Calling .attr(\'foo\') returned the correct value');

	map.foo = 'baz';

	equal(map.foo, 'baz', 'Calling .attr(\'foo\') returned the correct value');
});

test("type converters handle null and undefined in expected ways (1693)", function() {

	var Typer = define.Constructor({
		date: {
			type: 'date'
		},
		string: {
			type: 'string'
		},
		number: {
			type: 'number'
		},
		'boolean': {
			type: 'boolean'
		},
		htmlbool: {
			type: 'htmlbool'
		},
		leaveAlone: {
			type: '*'
		}
	});

	var t = new Typer({
		date: undefined,
		string: undefined,
		number: undefined,
		'boolean': undefined,
		htmlbool: undefined,
		leaveAlone: undefined
	});

	equal(t.date, undefined, "converted to date");

	equal(t.string, undefined, "converted to string");

	equal(t.number, undefined, "converted to number");

	equal(t.boolean, undefined, "converted to boolean"); //Updated for canjs#2316

	equal(t.htmlbool, false, "converted to htmlbool");

	equal(t.leaveAlone, undefined, "left as object");

	t = new Typer({
		date: null,
		string: null,
		number: null,
		'boolean': null,
		htmlbool: null,
		leaveAlone: null
	});

	equal(t.date, null, "converted to date");

	equal(t.string, null, "converted to string");

	equal(t.number, null, "converted to number");

	equal(t.boolean, null, "converted to boolean"); //Updated for canjs#2316

	equal(t.htmlbool, false, "converted to htmlbool");

	equal(t.leaveAlone, null, "left as object");

});

test('Initial value does not call getter', function() {
	expect(0);

	var Map = define.Constructor({
		count: {
			get: function(lastVal) {
				ok(false, 'Should not be called');
				return lastVal;
			}
		}
	});

	new Map({
		count: 100
	});
});

test("getters produce change events", function() {
	var Map = define.Constructor({
		count: {
			get: function(lastVal) {
				return lastVal;
			}
		}

	});

	var map = new Map();

	// map.bind("change", function(){
	//   ok(true, "change called");
	// });

	map.bind('count', function() {
		ok(true, "change called");
	});

	map.count = 22;
});

test("Asynchronous virtual properties cause extra recomputes (#1915)", function() {

	stop();

	var ran = false;

	var VM = define.Constructor({
		foo: {
			get: function(lastVal, setVal) {
				setTimeout(function() {
					if (setVal) {
						setVal(5);
					}
				}, 10);
			}
		},
		bar: {
			get: function() {
				var foo = this.foo;
				if (foo) {
					if (ran) {
						ok(false, 'Getter ran twice');
					}
					ran = true;
					return foo * 2;
				}
			}
		}
	});

	var vm = new VM();
	vm.bind('bar', function() {});

	setTimeout(function() {
		equal(vm.bar, 10);
		start();
	}, 200);

});



QUnit.test('Default values cannot be set (#8)', function() {
	var Person = function() {};

	define(Person.prototype, {
		first: {
			type: 'string',
			default: 'Chris'
		},
		last: {
			type: 'string',
			default: 'Gomez'
		},
		fullName: {
			get: function() {
				return this.first + ' ' + this.last;
			}
		}
	});

	var p = new Person();

	QUnit.equal(p.fullName, 'Chris Gomez', 'Fullname is correct');
	p.first = 'Sara';
	QUnit.equal(p.fullName, 'Sara Gomez', 'Fullname is correct after update');
});


QUnit.test('default type is setable', function() {
	var Person = function() {};

	define(Person.prototype, {
		'*': 'string',
		first: {
			default: 1
		},
		last: {
			default: 2
		}
	});

	var p = new Person();

	QUnit.ok(p.first === '1', typeof p.first);
	QUnit.ok(p.last === '2', typeof p.last);
});

QUnit.test("expandos are added in define.setup (#25)", function() {
	var MyMap = define.Constructor({});

	var map = new MyMap({
		prop: 4
	});
	map.on("prop", function() {
		QUnit.ok(true, "prop event called");
	});
	map.prop = 5;
});



QUnit.test('Set property with type compute', function() {
	var MyMap = define.Constructor({
		computeProp: {
			type: 'compute'
		}
	});

	var m = new MyMap();

	m.computeProp = new SimpleObservable(0);
	equal(m.computeProp, 0, 'Property has correct value');

	m.computeProp = new SimpleObservable(1);
	equal(m.computeProp, 1, 'Property has correct value');
});

QUnit.test('Compute type property can have a default value', function() {
	var MyMap = define.Constructor({
		computeProp: {
			type: 'compute',
			default: function() {
				return 0;
			}
		}
	});

	var m = new MyMap();
	equal(m.computeProp, 0, 'Property has correct value');

	m.computeProp = 1;
	equal(m.computeProp, 1, 'Property has correct value');
});

QUnit.test('Compute type property with compute default value triggers change events when updated', function() {
	var expected = 0;
	var c = new SimpleObservable(0);

	var MyMap = define.Constructor({
		computeProp: {
			type: 'compute',
			default: function() {
				return c;
			}
		}
	});

	var m = new MyMap();

	c.on(function(newVal) {
		equal(newVal, expected, 'Compute fired change event');
	});

	m.on('computeProp', function(ev, newVal) {
		equal(newVal, expected, 'Map fired change event');
	});

	expected = 1;
	m.computeProp = expected;

	expected = 2;
	c.set(expected);
});

QUnit.test('Compute type property can have a default value that is a compute', function() {
	var c = new SimpleObservable(0);

	var MyMap = define.Constructor({
		computeProp: {
			type: 'compute',
			default: function() {
				return c;
			}
		}
	});

	var m = new MyMap();
	equal(m.computeProp, 0, 'Property has correct value');

	c.set(1);
	equal(m.computeProp, 1, 'Property has correct value');
});

QUnit.test('Extensions can modify definitions', function() {
	var oldExtensions = define.extensions;

	define.behaviors.push('extended');

	define.extensions = function(objPrototype, prop, definition) {
		if (definition.extended) {
			return {
				default: 'extended'
			};
		}
	};

	var MyMap = define.Constructor({
		foo: {
			default: 'defined',
			extended: true,
		},
		bar: {
			default: 'defined'
		}
	});

	var map = new MyMap();

	QUnit.equal(map.foo, 'extended', 'Value was set via extension');
	QUnit.equal(map.bar, 'defined', 'Value was set via definition');

	define.extensions = oldExtensions;
});


QUnit.test("Properties are enumerable", function() {
	QUnit.expect(1);

	function VM(foo) {
		this.foo = foo;
	}

	define(VM.prototype, {
		foo: "string"
	});

	var vm = new VM("bar");
	vm.baz = "qux";

	var copy = {};
	for(var key in vm) {
		copy[key] = vm[key];

	}
	QUnit.deepEqual(copy,{
		foo: "bar",
		baz: "qux"
	});

});

QUnit.test("Doesn't override canSymbol.iterator if already on the prototype", function() {
	function MyMap() {}

	MyMap.prototype[canSymbol.iterator || canSymbol.for("iterator")] = function() {
		var i = 0;
		return {
			next: function() {
				if (i === 0) {
					i++;
					return {
						value: ["it", "worked"],
						done: false
					};
				}

				return {
					value: undefined,
					done: true
				};
			}
		};
	};

	define(MyMap.prototype, {
		foo: "string"
	});

	var map = new MyMap();
	map.foo = "bar";

	canReflect.eachIndex(map, function(value) {
		QUnit.deepEqual(value, ["it","worked"]);
	});
});

QUnit.test("nullish values are not converted for type or Type", function(assert) {

	var Foo = function() {};

	var MyMap = define.Constructor({
		map: {
			Type: Foo
		},
		notype: {}
	});

	var vm = new MyMap({
		map: {},
		notype: {}
	});

	// Sanity check
	assert.ok(vm.map instanceof Foo, "map is another type");
	assert.ok(vm.notype instanceof Object, "notype is an Object");

	vm.map = null;
	vm.notype = null;

	assert.equal(vm.map, null, "map is null");
	assert.equal(vm.map, null, "notype is null");
});


QUnit.test("shorthand getter (#56)", function() {
	var Person = function(first, last) {
		this.first = first;
		this.last = last;
	};
	define(Person.prototype, {
		first: "*",
		last: "*",
		get fullName() {
			return this.first + " " + this.last;
		}
	});

	var p = new Person("Mohamed", "Cherif");

	p.on("fullName", function(ev, newVal, oldVal) {
		QUnit.equal(oldVal, "Mohamed Cherif");
		QUnit.equal(newVal, "Justin Meyer");
	});

	equal(p.fullName, "Mohamed Cherif", "fullName initialized right");

	queues.batch.start();
	p.first = "Justin";
	p.last = "Meyer";
	queues.batch.stop();
});

QUnit.test("shorthand getter setter (#56)", function() {
	var Person = function(first, last) {
		this.first = first;
		this.last = last;
	};
	define(Person.prototype, {
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

	var p = new Person("Mohamed", "Cherif");

	p.on("fullName", function(ev, newVal, oldVal) {
		QUnit.equal(oldVal, "Mohamed Cherif");
		QUnit.equal(newVal, "Justin Meyer");
	});

	equal(p.fullName, "Mohamed Cherif", "fullName initialized right");

	p.fullName = "Justin Meyer";
});


QUnit.test("set and value work together (#87)", function(){

	var Type = define.Constructor({
		prop: {
			default: 2,
			set: function(num){
				return num * num;
			}
		}
	});

	var instance = new Type();

	QUnit.equal(instance.prop, 4, "used setter");

});

QUnit.test("async setter is provided", 5, function(){
	var RESOLVE;

	var Type = define.Constructor({
		prop: {
			default: 2,
			set: function(num, resolve){
				resolve( num * num );
			}
		},
		prop2: {
			default: 3,
			set: function(num, resolve){
				RESOLVE = resolve;
			}
		}
	});

	var instance = new Type();

	QUnit.equal(instance.prop, 4, "used async setter");


	QUnit.equal(instance.prop2, undefined, "used async setter");

	instance.on("prop2", function(ev, newVal, oldVal){
		QUnit.equal(newVal, 9, "updated");
		QUnit.equal(oldVal, undefined, "updated");
	});
	RESOLVE(9);

	QUnit.equal(instance.prop2, 9, "used async setter updates after");

});

QUnit.test('setter with default value causes an infinite loop (#142)', function(){
	var A = define.Constructor({
		val: {
			default: 'hello',
			set: function(val){
				if(this.val) {}
				return val;
			}
		}
	});

	var a = new A();
	QUnit.equal(a.val, 'hello', 'creating an instance should not cause an inifinte loop');
});

QUnit.test('defined properties are configurable', function(){
	var A = define.Constructor({
		val: {
			get: function(){
				return "foo";
			}
		}
	});

	var dataInitializers = A.prototype._define.dataInitializers,
	computedInitializers = A.prototype._define.computedInitializers;

	var newDefinition = {
		get: function(){
			return "bar";
		}
	};

	define.property(A.prototype, "val", newDefinition, dataInitializers,
		computedInitializers);

	var a = new A();
	QUnit.equal(a.val, "bar", "It was redefined");
});

testHelpers.dev.devOnlyTest("Setting a value with only a get() generates a warning (#202)", function() {
	QUnit.expect(7);

	var VM = function() {};

	var message = "can-define: Set value for property "+canReflect.getName(VM.prototype)+".derivedProp ignored, as its definition has a zero-argument getter and no setter";
	var finishErrorCheck = testHelpers.dev.willWarn(message, function(actualMessage, success) {

		QUnit.equal(actualMessage, message, "Warning is expected message");
		QUnit.ok(success);
	});


	define(VM.prototype, {
		derivedProp: {
			get: function() {
				return "Hello World";
			}
		}
	});

	var vm = new VM();
	vm.on("derivedProp", function() {});

	vm.derivedProp = 'prop is set';
	QUnit.equal(vm.derivedProp, "Hello World", "Getter value is preserved");

	VM.shortName = "VM";

	QUnit.equal(finishErrorCheck(), 1);

	message = "can-define: Set value for property "+canReflect.getName(VM.prototype)+".derivedProp ignored, as its definition has a zero-argument getter and no setter";
	finishErrorCheck = testHelpers.dev.willWarn(message, function(actualMessage, success) {
		QUnit.equal(actualMessage, message, "Warning is expected message");
		QUnit.ok(success);
	});

	vm.derivedProp = 'prop is set';
	QUnit.equal(finishErrorCheck(), 1);
});

testHelpers.dev.devOnlyTest("warn on using a Constructor for small-t type definintions", function() {
	QUnit.expect(2);

	var message = 'can-define: the definition for VM{}.currency uses a constructor for "type". Did you mean "Type"?';
	var finishErrorCheck = testHelpers.dev.willWarn(message);

	function Currency() {
		return this;
	}
	Currency.prototype = {
		symbol: "USD"
	};

	function VM() {}
	define(VM.prototype, {
		currency: {
			type: Currency, // should be `Type: Currency`
			default: function() {
				return new Currency({});
			}
		}
	});

	QUnit.equal(finishErrorCheck(), 1);

	message = 'can-define: the definition for VM2{}.currency uses a constructor for "type". Did you mean "Type"?';
	finishErrorCheck = testHelpers.dev.willWarn(message);

	function VM2() {}

	define(VM2.prototype, {
		currency: {
			type: Currency, // should be `Type: Currency`
			default: function() {
				return new Currency({});
			}
		}
	});

	QUnit.equal(finishErrorCheck(), 1);
});

testHelpers.dev.devOnlyTest("warn with constructor for Value instead of Default (#340)", function() {
	QUnit.expect(1);

	var message = "can-define: Change the 'Value' definition for VM{}.currency to 'Default'.";
	var finishErrorCheck = testHelpers.dev.willWarn(message);

	function Currency() {
		return this;
	}
	Currency.prototype = {
		symbol: "USD"
	};

	function VM() {}
	define(VM.prototype, {
		currency: {
			Value: Currency
		}
	});
	QUnit.equal(finishErrorCheck(), 1);
});


QUnit.test("canReflect.onKeyValue (#363)", function(){
	var Greeting = function( message ) {
		this.message = message;
	};

	define( Greeting.prototype, {
		message: { type: "string" }
	} );

	var greeting = new Greeting("Hello");

	canReflect.onKeyValue(greeting, "message", function(newVal, oldVal) {
		QUnit.equal(newVal, "bye");
		QUnit.equal(oldVal, "Hello");
	});

	greeting.message = "bye";
});
