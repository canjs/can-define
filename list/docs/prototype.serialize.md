@function can-define/list/list.prototype.serialize serialize
@parent can-define/list/list.prototype

Returns the a serialized version of this list.

@signature `list.serialize()`

Goes through each item in the list and gets its serialized
value and returns them in a plain Array.

Each items serialized value is the result of calling `.serialize()`
on the item or if the item doesn't have a `serialize` method,
the item itself.

  ```js
import { DefineList } from "can"
const list = new DefineList(["first", {foo: "bar"}]);
const serializedList = list.serialize();

console.log(serializedList); //-> ["first", {foo: "bar"}]
  ```
  @codepen

  @return {Array} An array with each item's serialied value.