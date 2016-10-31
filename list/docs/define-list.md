@module {function} can-define/list/list
@parent can-core
@group can-define/list/list.prototype prototype
@group can-define/list/list/events events
@alias can.DefineList
@inherits can.Construct


@description Create observable lists.

@signature `new DefineList([items])`

Creates an instance of a DefineList or an extended DefineList with enumerated properties from `items`.

```js
var DefineList = require("can-define/list/list");

var people = new DefineList([
  { first: "Justin", last: "Meyer" },
  { first: "Paula", last: "Strozak" }
])
```

  @param {Array} [items] An array of items to seed the list with.
  @return {can-define/list/list} An instance of `DefineList` with the values from _items_.

@body

## Use

The `can-define/list/list` module exports a `DefineList` constructor function.  It can be used
with `new` to create observable lists that behave very similar to `Array`s.  For example:

```js
var list = new DefineList(["a","b", "c"]);
list[0] //-> "a";

list.push("x");
list.pop() //-> "x"
```

It can also be extended to define custom observable list types with
[can-define/list/list.extend].  For example, the following defines a `StringList` type
where every item is converted to a string by specifying the [can-define/list/list.prototype.wildcardItems items definition] `(#)`:

```js
var StringList = DefineList.extend({
	"#": "string"
});

var strings = new StringList([1,new Date(1475370478173),false]);

strings[0] //-> "1"
strings[1] //-> "Sat Oct 01 2016 20:07:58 GMT-0500 (CDT)"
strings[2] //-> "false"
```

Non-numeric properties can also be defined on custom DefineList type.  The following
defines a `completed` property that returns the completed todos:

```js
var TodoList = DefineList.extend({
	"#": Todo,
	get completed(){
		return this.filter({complete: true})
	}
});

var todos = new TodoList([{complete: true}, {complete:false}]);
todos.completed.length //-> 1
```

Finally, DefineMap instances are observable, so you can use the [can-event]
methods to listen to its [can-define/list/list/AddEvent],
[can-define/list/list/LengthEvent], [can-define/list/list/RemoveEvent],
and [can-define/list/list/PropertyNameEvent] events:

```js
var people = new DefineList(["alice","bob","eve"]);

people.on("add", function(ev, items, index){
	console.log("add", items, index);
}).on("remove", function(ev, items, index){
	console.log("remove", items, index);
}).on("length", function(ev, newVal, oldVal){
	console.log("length", newVal, oldVal);
})

people.pop(); // remove ["eve"] 2
              // length 2 3

people.unshift("Xerxes"); // add ["Xerxes"] 1
                          // length 3 2
```
