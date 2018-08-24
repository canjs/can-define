@function can-define/list/list.prototype.set set
@parent can-define/list/list.prototype

@deprecated {3.10.1} Using .set with {Object} `props` has been deprecated in favour of `assign` and `update`

@description Sets an item or property or items or properties on a list.

@signature `list.set(prop, value)`

Sets the property at `prop`. This should be used when the property
isn't already defined.

  ```js
import { DefineList } from "can";
const list = new DefineList(["A","B"]);
list.set("count",1000);
console.log(list.get("count")); //-> 1000
  ```
  @codepen

  @param {Number} prop A property name.
  @param {} value The value to add to the list.
  @return {can-define/list/list} The list instance.

@signature `list.set(newProps)`

Updates the properties on the list with `newProps`.

  ```js
import { DefineList } from "can";
const list = new DefineList(["A","B"]);
list.set({count: 1000, skip: 2});
console.log(list.get("count")); //-> 1000
  ```
  @codepen

  @param {Object} newProps An object of properties and values to set on the list.
  @return {can-define/list/list} The list instance.

@signature `list.set(index, value)`

Sets the item at `index`.  Typically, [can-define/list/list::splice] should be used instead.

  ```js
import { DefineList } from "can";
const list = new DefineList(["A","B"]);
list.set(2,"C");
console.log(list.get(2)); //-> 2
  ```
  @codepen

  @param {Number} index A numeric position in the list.
  @param {*} value The value to add to the list.
  @return {can-define/list/list} The list instance.

@signature `list.set(newItems [,replaceAll])`

Replaces items in the list with `newItems`

  ```js
import { DefineList } from "can";
const list = new DefineList(["A","B"]);
list.set(["c"]);
console.log(list.get()); //-> DefineList["c","B"]
list.set(["x"], true);
console.log(list.get()); //-> DefineList["x"]
  ```
  @codepen

  @param {Array} newItems Items used to replace existing items in the list.
  @param {Boolean} [replaceAll] If true, will remove items at the end of the list.
  @return {can-define/list/list} The list instance.