@module {function} can-define
@parent can-observables
@collection can-core
@description Exports the `define` method that defines observable properties
and their behavior on a prototype object.
@group can-define.static 0 static
@group can-define.typedefs 1 types
@group can-define.behaviors 2 behaviors
@package ../package.json

@signature `define(prototype, propDefinitions)`

Define observable properties, type conversion, and getter/setter logic on [https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain prototype objects].

```js
var define = require("can-define");

var Greeting = function(message){
    this.message = message;
};

define(Greeting.prototype,{
    message: {type: "string"}
});
```

@param {Object} prototype The prototype object of a constructor function or [class](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/class). The prototype
object will have getter/setters defined on it that carry out the defined behavior.  The prototype will also contain
all of [can-event]'s methods.

@param {Object<String,can-define.types.propDefinition>} propDefinitions An object of
properties and their definitions.


@body

@body

## Use

`can-define` provides a way to create custom types with observable properties.
Where [can-define/map/map] and [can-define/list/list] provide more functionality, they also make
more assumptions on the type constructor.  `can-define` can be used
to create completely customized types.


The following creates a
`Person` constructor function:

```js
var define = require("can-define");

var Person = function(first, last){
  this.first = first;
  this.last = last;
};
define(Person.prototype,{
  first: { type: "string" },
  last: { type: "string" },
  fullName: {
    get: function(){
      return this.first+" "+this.last;
    }
  }
});
```

This can be used to create `Person` instances with observable properties:

```js
var person = new Person("Justin", "Meyer");
person.first    //-> "Justin"
person.last     //-> "Meyer"
person.fullName //-> "Justin Meyer"

person.on("fullName", function(ev, newVal, oldVal){
    newVal //-> "Ramiya Meyer"
    oldVal //-> "Justin Meyer"
});

person.first = "Ramiya"
```

The observable properties call [can-observation.add Observation.add] so they can be observed by
[can-compute].
