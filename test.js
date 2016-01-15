var QUnit =  require("steal-qunit");
var compute = require("can/compute/");
var define = require("can-define");
var stache = require("can/view/stache/");


QUnit.test("basics on a prototype", function(){
	
	var Person = function(first, last){
		this.first = first;
		this.last = last;
	};
	define(Person.prototype,{
		first: {
			type: "string"
		},
		last: {
			type: "string"
		},
		fullName: {
			get: function(){
				return this.first+" "+this.last;
			}
		}
	});
	
	var p = new Person("Mohamed", "Cherif");
	
	p.bind("fullName", function(ev, newVal, oldVal){
		QUnit.equal(oldVal, "Mohamed Cherif");
		QUnit.equal(newVal, "Justin Meyer");
	});
	
	p.bind("first", function(el, newVal, oldVal){
		QUnit.equal(newVal, "Justin", "first new value");
		QUnit.equal(oldVal, "Mohamed", "first old value");
	});
	
	can.batch.start();
	p.first = "Justin";
	p.last = "Meyer";
	can.batch.stop();
	
});

QUnit.test('basics set', function () {
	var Defined = function(prop){
		this.prop = prop;
	};

	define(Defined.prototype,{
		prop: {
			set: function(newVal) {
					return "foo" + newVal;
			},
				configurable: true
			}
		});

		var def = new Defined();
		def.prop = "bar";


		QUnit.equal(def.prop, "foobar", "setter works");

		var DefinedCB = function(prop){
			this.prop = prop;
		};

		define(DefinedCB.prototype, {
			prop: {
				set: function(newVal,setter) {
					setter("foo" + newVal);
				}
			}
		});

		var defCallback = new DefinedCB();
		defCallback.prop = "bar";
		QUnit.equal(defCallback.prop, "foobar", "setter callback works");

	});

QUnit.test("basic type", function () {

		QUnit.expect(6);

		var Typer = function(arrayWithAddedItem,listWithAddedItem){
			this.arrayWithAddedItem = arrayWithAddedItem;
			this.listWithAddedItem = listWithAddedItem;
		};

		define(Typer.prototype,{
				arrayWithAddedItem: {
					type: function (value) {
						if (value && value.push) {
							value.push("item");
						}
						return value;
					}
				},
				listWithAddedItem: {
					type: function (value) {
						if (value && value.push) {
							value.push("item");
						}
						return value;
					},
					Type: can.List
				}
		}); 
			
			


		var t = new Typer();
		deepEqual(Object.keys(t), ["__computeAttrs","__data"], "no keys");

		var array = [];
		t.arrayWithAddedItem = array;

		deepEqual(array, ["item"], "updated array");
		QUnit.equal(t.arrayWithAddedItem, array, "leave value as array");

		t.listWithAddedItem = [];

		QUnit.ok(t.listWithAddedItem instanceof can.List, "convert to can.List");
		QUnit.equal(t.listWithAddedItem[0], "item", "has item in it");

		t.bind("change", function (ev, attr) {
			QUnit.equal(attr, "listWithAddedItem.1", "got a bubbling event");
		});

		t.listWithAddedItem.push("another item");

	});	

QUnit.test("basic Type", function () {
		var Foo = function (name) {
			this.name = name;
		};
		Foo.prototype.getName = function () {
			return this.name;
		};
		
		var Typer = function(foo){
			this.foo = foo;
		};

		define(Typer.prototype,{
				foo: {
					Type: Foo
				}
		});

		var t = new Typer("Justin");
		QUnit.equal(t.foo.getName(), "Justin", "correctly created an instance");

		var brian = new Foo("brian");

		t.foo= brian;

		QUnit.equal(t.foo, brian, "same instances");

	});

QUnit.test("type converters", function () {

		var Typer = function(date,string,number,bool,htmlbool,leaveAlone) {
			this.date = date,
			this.string = string,
			this.number = number,
			this.bool= bool,
			this.htmlbool = htmlbool,
			this.leaveAlone = leaveAlone
		};

		define(Typer.prototype,{
			date: {  type: 'date' },
			string: {type: 'string'},
			number: {  type: 'number' },
			bool: {  type: 'boolean' },
			htmlbool: {  type: 'htmlbool' },
			leaveAlone: {  type: '*' },
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

QUnit.test("basics value", function () {

		var Typer = function(prop) {
			 if(prop !== undefined) { 
			 	debugger;
			 	can.simpleExtend(this,prop);
			 	//this.prop = prop; 
			 }		
		}

		define(Typer.prototype, {
			prop: { value: 'foo' }
		});
		var t = new Typer();

		QUnit.equal(t.prop, "foo", "value is used as default value");

		var Typer2 = function(prop) {
			this.prop = prop;
		}

		define(Typer2.prototype, {
				prop: {
					value: function () {
						return [];
					},
					type: "*"
				}
		});

		var t1 = new Typer2(),
			t2 = new Typer2();
		QUnit.ok(t1.prop !== t2.prop, "different array instances");
		QUnit.ok(can.isArray(t1.prop), "its an array");


	});

	test("basics Value", function () {

		var Typer = function(prop) {
			this.prop = prop;
		};

		define(Typer.prototype,{
			
				prop: {
					Value: Array,
					type: "*"
				}
			
		});

		var t1 = new Typer(),
			t2 = new Typer();
		QUnit.ok(t1.prop !== t2.prop, "different array instances");
		QUnit.ok(can.isArray(t1.prop), "its an array");


	});