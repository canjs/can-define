@module {function} can-define/list/list
@parent can-core
@group can-define/list/list.prototype prototype
@group can-define/list/list/events events
@alias can.DefineList
@inherits can.Construct


@description Create observable lists.

@signature `new can.DefineList([items])`

Creates an instance of a DefineList or an extended DefineList with enumerated properties from `items`.

```js
var people = new DefineList([
  { first: "Justin", last: "Meyer" },
  { first: "Paula", last: "Strozak" }
])
```

  @param {Array} [items] An array of items to seed the list with.
  @return {can-define/list/list} An instance of `DefineList` with the values from _items_.
