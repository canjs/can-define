@module {function} can-define
@parent can-core
@description Exports the `define` method that defines observable properties
and their behavior on a prototype object.

@signature `define(prototype, propDefinitions)`

Define observable properties, type conversion, and getter/setter logic on [https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain prototype objects].

```js
var define = require("can-define");

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
```

@param {Object} prototype The prototype object of a constructor function or [class](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/class).

@param {Object<String,can-define.types.propDefinition>} propDefinitions An object of
properties and their definitions.
