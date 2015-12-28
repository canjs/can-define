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


