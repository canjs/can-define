@property {can-define.types.propDefinition} can-define/list/list.prototype.wildcard *
@parent can-define/list/list.prototype

@description Define default behavior for items in the list.

@option {can-define.types.propDefinition}

By defining a wildcard property like `"*"` on the prototype, this will supply a
default behavior for every item in the list.  The default wildcard `"*"` definition
makes every item run through the "observable" [can-define.types] converter.
It looks like:

```js
"*": {
  type: "observable"
}
```

Setting the wildcard is useful when items should be converted to a particular time.

```js
var Person = DefineMap.extend({ ... });

var People = DefineMap.extend({
  "*": Person
});
```
