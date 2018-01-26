@module {function} can-define/map/map
@parent can-observables
@collection can-core
@group can-define/map/map.prototype prototype
@group can-define/map/map.static static
@group can-define/map/map/events events
@alias can.DefineMap
@inherits can.Construct

@description Create observable objects.

@signature `new DefineMap([props])`

The `can-define/map/map` module exports the `DefineMap` constructor function.  

Calling `new DefineMap(props)` creates a new instance of DefineMap or an [can-define/map/map.extend extended] DefineMap. Then, assigns every property on `props` to the new instance.  If props are passed that are not defined already, those property definitions are created.  If the instance should be sealed, it is sealed.

```js
var DefineMap = require("can-define/map/map");

var person = new DefineMap({
  first: "Justin",
  last: "Meyer"
})
```

  Custom `DefineMap` types, with special properties and behaviors, can be defined with [can-define/map/map.extend].

  @param {Object} [props] Properties and values to seed the map with.
  @return {can-define/map/map} An instance of `DefineMap` with the properties from _props_.

@body

## Use

`can-define/map/map` is used to create easily extensible observable types with well defined
behavior.

For example, a `Todo` type, with a `name` property, `completed` property, and a `toggle` method, might be defined like:

```js
var DefineMap = require("can-define/map/map");

var Todo = DefineMap.extend({
	name: "string",
	completed: {type: "boolean", value: false},
	toggle: function(){
		this.completed = !this.completed;
	}
})
```

The _Object_ passed to `.extend` defines the properties and methods that will be
on _instances_ of a `Todo`.  There are a lot of ways to define properties.  The
[can-define.types.propDefinition] type lists them all.  Here, we define:

 - `name` as a property that will be type coerced into a `String`.
 - `completed` as a property that will be type coerced into a `Boolean`
   with an initial value of `false`.

This also defines a `toggle` method that will be available on _instances_ of `Todo`.

`Todo` is a constructor function.  This means _instances_ of `Todo` can be be created by
calling `new Todo()` as follows:

```js
var myTodo = new Todo();
myTodo.name = "Do the dishes";
myTodo.completed //-> false

myTodo.toggle();
myTodo.completed //-> true
```  

You can also pass initial properties and their values when initializing a `DefineMap`:

```js
var anotherTodo = new Todo({name: "Mow lawn", completed: true});
myTodo.name = "Mow lawn";
myTodo.completed //-> true
```  

## Declarative properties

Arguably `can-define`'s most important ability is its support of declarative properties
that functionally derive their value from other property values.  This is done by
defining [can-define.types.get getter] properties like `fullName` as follows:

```js
var Person = DefineMap.extend({
	first: "string",
	last: "string",
	fullName: {
		get : function(){
			return this.first + " " + this.last;
		}
	}
});
```

`fullName` can also be defined with the ES5 shorthand getter syntax:

```js
var Person = DefineMap.extend({
	first: "string",
	last: "string",
	get fullName(){
		return this.first + " " + this.last;
	}
});
```

Now, when a `person` is created, there is a `fullName` property available like:

```js
var me = new Person({first: "Harry", last: "Potter"});
me.fullName //-> "Harry Potter"
```

This property can be bound to like any other property:

```js
me.on("fullName", function(ev, newValue, oldValue){
	newValue //-> Harry Henderson
	oldValue //-> Harry Potter
});

me.last = "Henderson";
```

`getter` properties use [can-compute] internally.  This means that when bound,
the value of the `getter` is cached and only updates when one of its source
observables change.  For example:

```js
var Person = DefineMap.extend({
	first: "string",
	last: "string",
	get fullName(){
		console.log("calculating fullName");
		return this.first + " " + this.last;
	}
});

var hero = new Person({first: "Wonder", last: "Woman"});

// console.logs "calculating fullName"
hero.fullName //-> Wonder Woman

// console.logs "calculating fullName"
hero.fullName //-> Wonder Woman

// console.logs "calculating fullName"
hero.on("fullName", function(){});

hero.fullName //-> "Wonder Woman"

// console.logs "calculating fullName"
hero.first = "Bionic"

// console.logs "calculating fullName"
hero.last = "Man"

hero.fullName //-> "Bionic Man"
```

If you want to prevent repeat updates, use [can-event/batch/batch]:

```js
hero.fullName //-> "Bionic Man"

var canBatch = require("can-event/batch/batch");

canBatch.start();
hero.first = "Silk";
hero.last = "Spectre";

// console.logs "calculating fullName"
canBatch.stop();
```

### Asynchronous getters

`getters` can also be asynchronous.  These are very useful when you have a type
that requires data from the server.  This is very common in [can-component]
view-models.  For example, a `view-model` might take a `todoId` value, and want
to make a `todo` property available:

```js
var ajax = require("can-util/dom/ajax/ajax");

var TodoViewModel = DefineMap.extend({
	todoId: "number",
	todo: {
		get: function(lastSetValue, resolve){
				ajax({url: "/todos/"+this.todoId}).then(resolve)
			}
	}
});
```

Asynchronous getters only are passed a `resolve` argument when bound.  Typically in an application,
your template will automatically bind on the `todo` property.  But to use it in a test might
look like:

```js
var fixture = require("can-fixture");
fixture("GET /todos/5", function(){
	return {id: 5, name: "take out trash"}
});

var todoVM = new TodoViewModel({id: 5});
todoVM.on("todo", function(ev, newVal){
	assert.equal(newVal.name, "take out trash");
});
```

### Getter limitations

There's some functionality that a getter or an async getter can not describe
declaratively.  For these situations, you can use [can-define.types.set] or
even better, use the [can-define-stream] plugin.

For example, consider a __state__ and __city__ locator where you pick a United States
__state__ like _Illinois_ and then a __city__ like _Chicago_.  In this example,
we want to clear the choice of __city__ whenever the __state__ changes.

This can be implemented with [can-define.types.set] like:

```js
Locator = DefineMap.extend({
	state: {
		type: "string",
		set: function(){
			this.city = null;
		}
	},
	city: "string"
});

var locator = new Locator({
	state: "IL",
	city: "Chicago"
});

locator.state = "CA";
locator.city //-> null;
```

This isn't declarative anymore because changing state imperatively changes
the value of `city`. The [can-define-stream] plugin can make this functionality
entirely declarative.

```js
var Locator = DefineMap.extend({
     state: "string",
     city: {
         type: "string",
         stream: function(setStream) {
             return this.stream(".state").map(function(){
                 return null;
             }).merge(setStream);
         }
     }
});

var locator = new Locator({
	state: "IL",
	city: "Chicago"
});

locator.on("city", function(){});

locator.state = "CA";
locator.city //-> null;
```

Notice, in the `can-define-stream` example, `city` must be bound for it to work.  

## Sealed instances and strict mode

By default, `DefineMap` instances are [can-define/map/map.seal sealed].  This
means that setting properties that are not defined when the constructor is defined
will throw an error in files that are in [strict mode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode). For example:

```js
"use strict";

var DefineMap = require("can-define/map/map");

var MyType = DefineMap.extend({
    myProp: "string"
});

var myType = new MyType();

myType.myProp = "value"; // no error thrown

myType.otherProp = "value" // throws Error!
```

Read the [can-define/map/map.seal] documentation for more information on this behavior.
