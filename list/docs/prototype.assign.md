@function can-define/list/list.prototype.assign assign
@parent can-define/list/list.prototype

Sets items or properties on a list.

@signature `list.assign(newProps)`

Assigns the properties on the list with `newProps`. Properties not present in `newProps` will be left unchanged.

  ```js
import { DefineList } from "can";
const list = new DefineList(["A","B"]);
list.assign({count: 1000, skip: 2});
console.log(list.get("count")); //-> 1000
  ```
  @codepen

  @param {Array} newProps Properties that need to be assigned to the list instance
  @return {can-define/list/list} The list instance.
