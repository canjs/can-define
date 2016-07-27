@typedef {Object|String|Constructor} can-define.types.propDefinition propDefinition
@parent can-define.typedefs

Defines the type, initial value, and get, set, and serialize behavior for an
observable property.  These behaviors can be specified with as an `Object`, `String` or
`Constructor` function.

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

    @option {can.Map.prototype.define.set} set A set function that specifies what should happen when a property is set. `set` is called with the result of `type` or `Type`. The following
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

    @option {can.Map.prototype.define.serialize} serialize Specifies the behavior of the property when [can-define/map/map::serialize serialize] is called.

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

@type {Constructor} Defines a [can-define.types.TypeConstructor Type] setting with a constructor
function.  Constructor functions are identified with [can-util/js/types/types.isConstructor].

```
propertyName: Constructor
```


@body
