@function can-define.types.ValueConstructor Value
@parent can-define.behaviors

Provides a constructor function to be used to provide a default value for a property.  

@signature `Value`

A constructor function can be provided that is called to create a default value used for this property.
This constructor will be invoked with `new` for each created instance. The default
value is created on demand when the property is read for the first time.

Specify `Value` like:

```js
prop: {
    Value: Array
},
person: {
	Value: Person
}
```

@body

## Use

```js
var Address = DefineMap.extend({
    street: {type: "string", value: "321 Longbow"},
    city: {type: "string", value: "Dallas"}
});

var Direction = DefineMap.extend({
    from: {Type: Address, Value: Address},
    to: {Type: Address, Value: Address}
});

var direction = new Direction({
    to: {street: "2070 N. Stave"}
});

direction.from.street //-> "321 Longbow"
direction.to.street   //-> "2070 N. Stave"
```
