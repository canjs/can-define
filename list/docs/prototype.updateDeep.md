@function can-define/list/list.prototype.updateDeep updateDeep
@parent can-define/list/list.prototype

Sets an item or property or items or properties on a list.

@signature `list.updateDeep(newProps)`

Recursively updates the properties on the list with `newProps`. Properties not in `newProps` will be set to `undefined`.

  ```js
import { DefineList } from "can";
const list = new DefineList(["A","B"]);
list.assign({count: 0, skip: 2, foo: {bar: 'zed', a: 'b'}});
list.updateDeep({foo: {bar: 'yay'}});

console.log(list.get("count")); //-> undefined
console.log(list.get("skip")); //-> undefined
console.log(list.get("foo")); // -> { bar: 'yay' }
  ```
  @codepen

  @param {Array} newProps Properties that need to be updated on the list instance
  @return {can-define/list/list} The list instance.
