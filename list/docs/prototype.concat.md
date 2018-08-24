@function can-define/list/list.prototype.concat concat
@description Merge many collections together into a DefineList.
@signature `list.concat(...args)`

Returns a `DefineList` with the `list`"s items and the additional `args`.

@param {Array|can-define/list/list|} args Any number of arrays, Lists, or values to add in
For each parameter given, if it is an Array or a DefineList, each of its elements will be added to
the end of the concatenated DefineList. Otherwise, the parameter itself will be added.

@return {can-define/list/list} A DefineList of the same type.

@body

## Use

`concat` makes a new DefineList with the elements of the DefineList followed by the elements of the parameters.

```js
import { DefineList } from "can";
const list = new DefineList();
const newList = list.concat(
    "Alice",
    ["Bob", "Charlie"],
    new DefineList(["Daniel", "Eve"]),
    {f: "Francis"}
);
console.log(newList.get()); //-> ["Alice", "Bob", "Charlie", "Daniel", "Eve", {f: "Francis"}]
```
@codepen
