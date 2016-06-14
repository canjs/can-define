@module {function} can-define/map can-define/map
@alias can.DefineMap
@inherits can.Construct

@description Create observable objects.

@signature `new can.DefineMap([props])`

Creates a new instance of DefineMap or an extended DefineMap.

```js
var person = new can.DefineMap({
  first: "Justin",
  last: "Meyer"
})
```

  @param {Object} [props] Properties and values to seed the map with.
  @return {can-define/map} An instance of `can.DefineMap` with the properties from _props_.
