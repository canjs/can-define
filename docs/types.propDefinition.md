@typedef {Object|String|Constructor|Array|GETTER|SETTER} can-define.types.propDefinition PropDefinition
@parent can-define.typedefs

Defines the type, initial value, and get, set, and serialize behavior for an
observable property.  These behaviors can be specified with as an `Object`, `String`,
`Constructor` function, `Array`, a `getter expression`, or `setter expression`.

@type {Object} Defines multiple behaviors for a single property.

```js
propertyName: {
  get: function(){ ... },
  set: function(){ ... },
  type: function(){ ... },
  Type: Constructor,
  value: function(){ ... },
  Value: Constructor,
  serialize: function(){ ... }
}
```

    @option {can-define.types.value} value Specifies the initial value of the property or
    a function that returns the initial value.

    ```js
    // A default age of `0`:
    var Person = DefineMap.extend({
      age: {
        value: 0
      },
      address: {
        value: function(){
          return {city: "Chicago", state: "IL"};
        };
      }
    });
    ```

    @option {can-define.types.ValueConstructor} Value Specifies a function that will be called with `new` whose result is
    set as the initial value of the attribute.

    ```js
    // A default empty DefineList of hobbies:
    var Person = DefineMap.extend({
      hobbies: {Value: DefineList}
    });

    new Person().hobbies //-> []
    ```

    @option {can-define.types.type} type Specifies the type of the
    property.  The type can be specified as either a function
    that returns the type coerced value or one of the [can-define.types] names.

    ```js
    var Person = DefineMap.extend({
      age: {type: "number"},
      hobbies: {
        type: function(newValue){
          if(typeof newValue === "string") {
            return newValue.split(",")
          } else if( Array.isArray(newValue) ) {
            return newValue;
          }
        }
      }
    });
    ```

    @option {can-define.types.TypeConstructor} Type A constructor function that takes
    the assigned property value as the first argument and called with new. For example, the following will call
    `new Address(newValue)` with whatever non null, undefined, or address type is set as a `Person`'s address property.

    ```js
    var Address = DefineMap.extend({
      street: "string",
      state: "string"    
    });

    var Person = DefineMap.extend({
      address: {Type: Address}    
    });
    ```

    @option {can-define.types.set} set A set function that specifies what should happen when a property is set. `set` is called with the result of `type` or `Type`. The following
    defines a `page` setter that updates the map's offset:

    ```js
    DefineMap.extend({
      page: {
        set: function(newVal){
          this.offset = (parseInt(newVal) - 1) * this.limit;
        }
      }
    });
    ```

    @option {can-define.types.get} get A function that specifies how the value is retrieved.  The get function is
    converted to an [can-compute.async async compute].  It should derive its value from other values on the object. The following
    defines a `page` getter that reads from a map's offset and limit:

    ```js
    DefineMap.extend({
      page: {
        get: function (newVal) {
    	  return Math.floor(this.offset / this.limit) + 1;
    	}
      }
    });
    ```

    A `get` definition makes the property __computed__ which means it will not be enumerable by default.

    @option {can-define.types.serialize} serialize Specifies the behavior of the property when [can-define/map/map::serialize serialize] is called.

    By default, serialize does not include computed values. Properties with a `get` definition
    are computed and therefore are not added to the result.  Non-computed properties values are
    serialized if possible and added to the result.

    ```js
    var Todo = DefineMap.extend({
      date: {
        type: "date",
        serialize: function(value) {
          return value.getTime();
        }
      }
    });

@type {String} Defines a [can-define.types.type] converter as one of the named types in [can-define.types].

```js
propertyName: "typeName"
```

@type {Constructor} Either creates a method or Defines a [can-define.types.TypeConstructor Type] setting with a constructor function.  Constructor functions are identified with [can-reflect.isConstructorLike].

```
propertyName: Constructor
```
OR
```
propertyName: function() {}
```

For example:
```js
subMap: DefineMap // <- sets Type to DefineMap
```
OR
```js
increment: function() { ++this.count } // <- sets method prop
```

@type {Array} Defines an inline [can-define/list/list] Type setting. This is
used as a shorthand for creating a property that is an [can-define/list/list] of another type.

```
propertyName: [Constructor | propDefinitions]
```

For example:

```js
users: [User],
todos: [{complete: "boolean", name: "string"}]
```

@type {GETTER} Defines a property's [can-define.types.get] behavior with the
[https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get syntax].

```js
get propertyName(){ ... }
```

For example:

```js
get fullName() {
    return this.first + " " + this.last;
}
```

This is a shorthand for providing an object with a `get` property like:

```
fullName: {
    get: function(){
        return this.first + " " + this.last;
    }
}
```

You must use an object with a [can-define.types.get] property if you want your get to take the `lastSetValue`
or `resolve` arguments.

@type {SETTER} Defines a property's [can-define.types.set] behavior with the
[set syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set).

```js
set propertyName(newValue){ ... }
```

For example:

```js
set fullName(newValue) {
    var parts = newVal.split(" ");
    this.first = parts[0];
    this.last = parts[1];
}
```

This is a shorthand for providing an object with a `set` property like:

```
fullName: {
    set: function(newValue){
        var parts = newVal.split(" ");
        this.first = parts[0];
        this.last = parts[1];
    }
}
```

You must use an object with a [can-define.types.set] property if you want your set to take the `resolve` argument.


@body


## Use

A property definition can be defined in several ways.  The `Object` form is the most literal
and directly represents a `PropDefinition` object.  The other forms
get converted to a `PropDefinition` as follows:


```js
DefineMap.extend({
  propertyA: Object      -> PropertyDefinition
  propertyB: String      -> {type: String}
  propertyC: Constructor -> {Type: Constructor}
  propertyD: [PropDefs]  -> {Type: DefineList.extend({"#": PropDefs})>}
  get propertyE(){...}   -> {get: propertyE(){...}}
  set propertyF(){...}   -> {get: propertyF(){...}}
  method: Function
})
```

Within a property definition, the available properties and their signatures look like:

```js
DefineMap.extend({
  property: {
    get: function(lastSetValue, resolve){...},
    set: function(newValue, resolve){...},

    type: function(newValue, prop){...}| Array<PropertyDefinition> | PropertyDefinition,
    Type: Constructor | Array<PropertyDefinition> | PropertyDefinition,

    value: function(){...},
    Value: Constructor,

    serialize: Boolean | function(){...}
  }
})
```

For example:


```js
var Person = DefineMap.extend("Person",{
  // a `DefineList` of `Address`
  addresses: [Address],
  // A `DefineMap` with a `first` and `last` property
  name: { type: {first: "string", last: "string"} },
  // A `DefineList of a ``DefineMap` with a `make` and `year` property.
  cars: { Type: [{make: "string", year: "number"}] }
});

var person = new Person({
  addresses: [{street: "1134 Pinetree"}],
  name: {first: "Kath", last: "Iann"}
  cars: [{ make: "Nissan", year: 2010 }]
});
```
