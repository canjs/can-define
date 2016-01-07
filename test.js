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