var QUnit = require("steal-qunit");

var define = require("can-define");
var queues = require("can-queues");
var each = require("can-util/js/each/each");
var canSymbol = require("can-symbol");
var canDev = require("can-util/js/dev/dev");
var SimpleObservable = require("can-simple-observable");

QUnit.module("can-define");




test("One event on getters (#1585)", function() {
	queues.log();
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
