@function can-define/list/list.prototype.assignDeep assignDeep
@parent can-define/list/list.prototype

Sets an item or property or items or properties on a list.

@signature `list.assignDeep(newProps)`

Updates the properties on the list with `newProps`. Properties not in `newProps` will be left unchanged.

  ```js
import { DefineList } from "can";
const list = new DefineList(["A","B"]);
list.assign({count: 1, skip: 2});
console.log(list.get("count")); //-> 1

list.assignDeep({count: 1000});
console.log(list.get("count")); //-> 1000
console.log(list.get("skip")); //-> 2
  ```
  @codepen

  @param {Array} newProps Properties that need to be assigned to the list instance
  @return {can-define/list/list} The list instance.
