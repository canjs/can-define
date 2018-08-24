@function can-define/list/list.prototype.update update
@parent can-define/list/list.prototype

Sets an item or property or items or properties on a list.

@signature `list.update(newProps)`

Updates the properties on the list with `newProps`. Properties not in `newProps` will be set to `undefined`.

  ```js
import { DefineList } from "can";
const list = new DefineList(["A","B"]);
list.assign({ count: 0, skip: 2 });
list.update({ count: 1000 });
console.log(list.get("count")); //-> 1000
console.log(list.get("skip")); //-> undefined
  ```
  @codepen

  @param {Array} newProps Properties that need to be updated to the list instance
  @return {can-define/list/list} The list instance.
