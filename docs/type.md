@typedef {function|string} can-define.types.type type
@parent can-define.behaviors

Converts a value set on an instance into an appropriate value.

@signature `type(newValue, propertyName)`

Given the set value, transform it into a value appropriate to be set.
`type` is called before [can-define.types.set].  

```js
age: {
    type: function(newValue, propertyName){
        return +newValue;
    }
}
```

  @param {*} newValue The value set on the property.
  @param {String} propertyName The property name being set.

  @return {*} The value that should be passed to `set` or (if there is no `set` property) the value to set on the map instance.

@signature `"typeName"`

Sets the type to a named type in [can-define.types].  The default typeName is `"observable"`.

```js
age: {
    type: "number"
}
```

  @param {String} typeName A named type in [can-define.types].


  @signature `{propDefinition}`

  A [can-define.types.propDefinition] that defines an inline [can-define/map/map] type.  For example:

  ```js
  address: {
      type: {
          street: "string",
          city: "string"
      }
  }
  ```

  @signature `[Type|propDefinition]`

  Defines an inline [can-define/list/list] type that's an array of `Type` or inline `propDefinition` [can-define/map/map]
  instances.  For example:

  ```js
  people: {
      type: [Person]
  },
  addresses: {
      type: [{
          street: "string",
          city: "string"
      }]
  }
  ```


@body

## Use

The `type` property specifies the type of the attribute.  The type can be specified
as either:

- A type function that returns the type coerced value.
- A named type in [can-define.types].
- An object that gets converted into an inline `DefineMap`.
- An array that gets converted to an inline `DefineList`.

### Basic Example

The following example converts the `count` property to a number and the `items` property to an array:

```js
DefineMap.extend({
    count: {type: "number"},
    items: {
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

When a user tries to set those properties like:

    map.set({count: "4", items: "1,2,3"});

The number converter will be used to turn count into 4, and the items type converter function will be used to turn items into [1,2,3].

### Preventing Arrays and Objects from Automatic Conversion

When an array value is set, it is automatically converted into a DefineList. Likewise, objects are converted into DefineMap instances. This behavior can be prevented like the following:


     locations: {type: "any"}


When a user tries to set this property, the resulting value will remain an array.

    map.locations = [1, 2, 3]; // locations is an array, not a DefineList

### Working with the 'compute' type

Setting type as `compute` allows for resolving a computed property with the .attr()
method.

```
MyMap = DefineMap.extend({
    value: {
        type: "compute"
    }
});

var myMap = new MyMap();
var c = compute(5);

myMap.value = c;
myMap.value //-> 5

c(6);
myMap.value //-> 6

//Be sure if setting to pass the new compute
var c2 = compute("a");
myMap.value = c2;
myMap.value //-> "a"
```
