@property {can-define.types.propDefinition} can-define/map/map.prototype.wildcard *
@parent can-define/map/map.prototype

@description Define default behavior for a Map instance.

@option {can-define.types.propDefinition}

By defining a wildcard property like `"*"` on the prototype, this will supply a
default behavior for every property.  The default wildcard `"*"` definition
makes every property run through the "observable" [can-define.types] converter.
It looks like:

```
"*": {
  type: "observable"
}
```

Setting the wildcard is useful when every property on a
map instance should behave in a particular way.  For example, for map types used
with [can-route]:

```
var MyMap = DefineMap.extend({
  "*": {
    type: "stringOrObservable"
  }
})
```

Or if you want to turn off implicit conversion of Objects and Arrays to DefineMap and DefineLists:

```
var MyMap = DefineMap.extend({
  "*": {
    type: "*"
  }
})
```
