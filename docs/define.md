@module {function} can-define
@description Define observable properties and their behavior.

@signature `can.define(prototype, propDefinitions)`

Define observable properties, type conversion, and getter/setter logic to your constructor prototypes.

```js
var Person = function(first, last){
  this.first = first;
  this.last = last;
};
can.define(Person.prototype,{
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

@param {Object} prototype The prototype object of a constructor function.

@param {Object<String,can-define.types.propDefinition>} propDefinitions An object of
properties and their definitions.
