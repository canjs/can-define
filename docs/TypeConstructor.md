@typedef {function|can-define.types.propDefinition|Array} can-define.types.typeConstructor Type
@parent can-define.behaviors

Provides a constructor function to be used to convert any set value into an appropriate
value.

@signature `Type`

A constructor function can be provided that is called to convert incoming values set on this property, like:

```js
{
	prop: {
		Type: Person
	}
}
```    

`Type` is called before [can-define.types.type] and before [can-define.types.set]. It checks if the incoming value
is an [instanceof](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof) `Type`. If it is, or if it is `null` or `undefined`, it passes the original value through.  If not, it passes the original value to `new Type(originalValue)` and returns the
new instance to be set.

@signature `{propDefinition}`

A [can-define.types.propDefinition] that defines an inline [can-define/map/map] type.  For example:

```js
{
	address: {
		Type: {
			street: "string",
			city: "string"
		}
	}
}
```

@signature `[Type|propDefinition]`

Defines an inline [can-define/list/list] type that's an array of `Type` or inline `propDefinition` [can-define/map/map]
instances.  For example:

```js
{
	people: {
		Type: [ Person ]
	},
	addresses: {
		Type: [ {
			street: "string",
			city: "string"
		} ]
	}
}
```


@body

## Use

```js
const Address = DefineMap.extend( {
	street: "string",
	city: "string"
} );

const Direction = DefineMap.extend( {
	from: { Type: Address },
	to: Address
} );

const direction = new Direction( {
	from: { street: "2060 N. Stave", city: "Chicago" },
	to: new Address( { street: "123 Greenview", city: "Libertyville" } )
} );
```
