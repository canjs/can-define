@function can-define/list/list.prototype.forEach forEach
@parent can-define/list/list.prototype

@description Call a function for each element of a DefineList.
@signature `list.forEach(callback[, thisArg])`

Loops through the values of the list, calling `callback` for each one until the list ends
or `false` is returned.

```js
list.forEach(function(item, index, list){ ... })
```

  @param {function(item, index, list)} callback A function to call with each element of the DefineList.
  The three parameters that callback gets passed are:
   - item - the element at index.
   - index - the current element of the list.
   - list - the DefineList the elements are coming from.

If the callback returns `false` the looping stops.

  @param {Object} [thisArg] The object to use as `this` inside the callback.
  @return {can-define/list/list} The list instance.
@body

## Use

`forEach` calls a callback for each element in the DefineList.

```js
import { DefineList } from "can"
const list = new DefineList([1, 2, 3]);
list.forEach((element, index, list) => {
    list.set(index, element * element);
});
console.log(list.get()); //-> [1, 4, 9]
```
@codepen
