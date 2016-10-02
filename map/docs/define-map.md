@module {function} can-define/map/map
@parent can-core
@group can-define/map/map.prototype prototype
@group can-define/map/map.static static
@group can-define/map/map/events events
@alias can.DefineMap
@inherits can.Construct

@description Create observable objects.

@signature `new DefineMap([props])`

Creates a new instance of DefineMap or an extended DefineMap. Then, assigns every property on `props` to the new instance.  If props are passed that are not defined already, those property definitions are created.  If the instance should be sealed, it is sealed.

```js
var DefineMap = require("can-define/map/map");

var person = new DefineMap({
  first: "Justin",
  last: "Meyer"
})
```

  @param {Object} [props] Properties and values to seed the map with.
  @return {can-define/map/map} An instance of `can.DefineMap` with the properties from _props_.
