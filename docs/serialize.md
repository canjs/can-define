@function can-define.types.serialize serialize
@parent can-define.behaviors

Defines custom serialization behavior for a property.

@signature `Boolean`

Specifies if the property should be serialized.  By default, all properties except for
ones with defined [can-define.types.get getters] are serialized. Prevent a property
from being serialized like:

```js
{
	propertyName: {
		serialize: false
	}
}
```

Make a [can-define.types.get getter] property part of the serialized result like:

```js
{
	propertyName: {
		get: function() { /* ... */ },
		serialize: true
	}
}
```

@signature `serialize( currentValue, propertyName )`

Specifies the serialized value of a property.

@param {*} currentValue The current value of the attribute.

@param {String} propertyName The name of the property being serialized.

@return {*|undefined} If `undefined` is returned, the value is not serialized.

@body

## Use

[can-define/map/map.prototype.serialize] is useful for serializing an instance into
a more JSON-friendly form.  This can be used for many reasons, including saving a
[can-connect]ed instance on the server or serializing [can-route.data can-route.data]'s internal
map for display in the hash or pushstate URL.

The serialize property allows an opportunity to define how
each property will behave when the instance is serialized.  This can be useful for:

- serializing complex types like dates, arrays, or objects into string formats
- causing certain properties to be ignored when serialize is called

The following causes a locationIds property to be serialized into
the comma separated ID values of the location property on this instance:

```js
{
	locationIds: {
		serialize: function() {
			return this.locations.map( function( location ) {
				ids.push( location.id );
			} ).join( "," );
		}
	}
}
```

Returning `undefined` for any property means this property will not be part of the serialized
object.  For example, if the property numPages is not greater than zero, the following example
won't include it in the serialized object.

```js
{
	prop: {
		numPages: {
			serialize: function( num ) {
				if ( num <= 0 ) {
					return undefined;
				}
				return num;
			}
		}
	}
}
```
