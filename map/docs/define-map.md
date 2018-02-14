@module {function} can-define/map/map
@parent can-observables
@collection can-core
@group can-define/map/map.prototype prototype
@group can-define/map/map.static static
@group can-define/map/map/events events
@alias can.DefineMap
@inherits can.Construct
@templateRender true

@description Create observable objects.

@signature `new DefineMap([props])`

The `can-define/map/map` module exports the `DefineMap` constructor function.  

Calling `new DefineMap(props)` creates a new instance of DefineMap or an [can-define/map/map.extend extended] DefineMap. Then, assigns every property on `props` to the new instance.  If props are passed that are not defined already, those property definitions are created.  If the instance should be sealed, it is sealed.

```js
import DefineMap from "can-define/map/map";

const person = new DefineMap( {
	first: "Justin",
	last: "Meyer"
} );
```

  Custom `DefineMap` types, with special properties and behaviors, can be defined with [can-define/map/map.extend].

  @param {Object} [props] Properties and values to seed the map with.
  @return {can-define/map/map} An instance of `DefineMap` with the properties from _props_.

@body

## Mixed-in instance methods and properties

Instances of `DefineMap` have all methods and properties from
[can-event-queue/map/map]:

{{#each (getChildren [can-event-queue/map/map])}}
- [{{name}}] - {{description}}{{/each}}

Example:

```js
const MyType = DefineMap.extend( { prop: "string" } );

const myInstance = new MyType( { prop: "VALUE" } );

myInstance.on( "prop", function( event, newVal, oldVal ) { /* ... */ } );
```


## Mixed-in type methods and properties

Extended `DefineMap` constructor functions have all methods and properties from
[can-event-queue/type/type]:

{{#each (getChildren [can-event-queue/type/type])}}
- [{{name}}] - {{description}}{{/each}}

Example:

```js
const MyType = DefineMap.extend( { /* ... */ } );

canReflect.onInstancePatches( MyType, function( instance, patches ) {

} );
```

## Use

`can-define/map/map` is used to create easily extensible observable types with well defined
behavior.

For example, a `Todo` type, with a `name` property, `completed` property, and a `toggle` method, might be defined like:

```js
import DefineMap from "can-define/map/map";

const Todo = DefineMap.extend( {
	name: "string",
	completed: { type: "boolean", default: false },
	toggle: function() {
		this.completed = !this.completed;
	}
} );
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
const myTodo = new Todo();
myTodo.name = "Do the dishes";
myTodo.completed; //-> false

myTodo.toggle();
myTodo.completed; //-> true
```  

You can also pass initial properties and their values when initializing a `DefineMap`:

```js
const anotherTodo = new Todo( { name: "Mow lawn", completed: true } );
myTodo.name = "Mow lawn";
myTodo.completed; //-> true
```  

## Declarative properties

Arguably `can-define`'s most important ability is its support of declarative properties
that functionally derive their value from other property values.  This is done by
defining [can-define.types.get getter] properties like `fullName` as follows:

```js
const Person = DefineMap.extend( {
	first: "string",
	last: "string",
	fullName: {
		get: function() {
			return this.first + " " + this.last;
		}
	}
} );
```

`fullName` can also be defined with the ES5 shorthand getter syntax:

```js
const Person = DefineMap.extend( {
	first: "string",
	last: "string",
	get fullName() {
		return this.first + " " + this.last;
	}
} );
```

Now, when a `person` is created, there is a `fullName` property available like:

```js
const me = new Person( { first: "Harry", last: "Potter" } );
me.fullName; //-> "Harry Potter"
```

This property can be bound to like any other property:

```js
me.on( "fullName", function( ev, newValue, oldValue ) {
	newValue; //-> Harry Henderson
	oldValue; //-> Harry Potter
} );

me.last = "Henderson";
```

`getter` properties use [can-compute] internally.  This means that when bound,
the value of the `getter` is cached and only updates when one of its source
observables change.  For example:

```js
const Person = DefineMap.extend( {
	first: "string",
	last: "string",
	get fullName() {
		console.log( "calculating fullName" );
		return this.first + " " + this.last;
	}
} );

const hero = new Person( { first: "Wonder", last: "Woman" } );

// console.logs "calculating fullName"
hero.fullName; //-> Wonder Woman

// console.logs "calculating fullName"
hero.fullName; //-> Wonder Woman

// console.logs "calculating fullName"
hero.on( "fullName", function() {} );

hero.fullName; //-> "Wonder Woman"

// console.logs "calculating fullName"
hero.first = "Bionic";

// console.logs "calculating fullName"
hero.last = "Man";

hero.fullName; //-> "Bionic Man"
```

If you want to prevent repeat updates, use [can-event/batch/batch]:

```js
hero.fullName; //-> "Bionic Man"

import canBatch from "can-event/batch/batch";

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
import ajax from "can-util/dom/ajax/ajax";

const TodoViewModel = DefineMap.extend( {
	todoId: "number",
	todo: {
		get: function( lastSetValue, resolve ) {
			ajax( { url: "/todos/" + this.todoId } ).then( resolve );
		}
	}
} );
```

Asynchronous getters only are passed a `resolve` argument when bound.  Typically in an application,
your template will automatically bind on the `todo` property.  But to use it in a test might
look like:

```js
import fixture from "can-fixture";
fixture( "GET /todos/5", function() {
	return { id: 5, name: "take out trash" };
} );

const todoVM = new TodoViewModel( { id: 5 } );
todoVM.on( "todo", function( ev, newVal ) {
	assert.equal( newVal.name, "take out trash" );
} );
```

### Getter limitations

There's some functionality that a getter or an async getter can not describe
declaratively.  For these situations, you can use [can-define.types.set] or
even better, use [can-define.types.value] or the [can-define-stream] plugin.

For example, consider a __state__ and __city__ locator where you pick a United States
__state__ like _Illinois_ and then a __city__ like _Chicago_.  In this example,
we want to clear the choice of __city__ whenever the __state__ changes.

This can be implemented with [can-define.types.set] like:

```js
Locator = DefineMap.extend( {
	state: {
		type: "string",
		set: function() {
			this.city = null;
		}
	},
	city: "string"
} );

const locator = new Locator( {
	state: "IL",
	city: "Chicago"
} );

locator.state = "CA";
locator.city; //-> null;
```

The problem with this code is that it relies on side effects to manage the behavior of
`city`.  If someone wants to understand how `city` behaves, they might have search the entire
map's code.  

The [can-define.types.value] behavior and [can-define-stream-kefir] plugin allow you to consolidate the
behavior of a property to a single place.  For example, the following implements `Locator` with [can-define.types.value]:

```js
const Locator = DefineMap.extend( "Locator", {
	state: "string",
	city: {
		value: function( prop ) {

			// When city is set, update `city` with the set value.
			prop.listenTo( prop.lastSet, prop.resolve );

			// When state is set, set `city` to null.
			prop.listenTo( "state", function() {
				prop.resolve( null );
			} );

			// Initialize the value to the `set` value.
			prop.resolve( prop.lastSet.get() );
		}
	}
} );
```

While [functional reactive programming](https://en.wikipedia.org/wiki/Functional_reactive_programming) (FRP) can take time to
master at first, once you do, your code will be much easier to understand and
debug. The [can-define.types.value] behavior supports the basics of FRP programming - the ability to listen events and changes
in other properties and `resolve` the property to a new value.  If you are looking for even more FRP capability,
checkout [can-define-stream-kefir], which supports a full streaming library with many event-stream transformations:

```js
const Locator = DefineMap.extend( {
	state: "string",
	city: {
		stream: function( setStream ) {
			return this.stream( ".state" ).map( function() {
				return null;
			} ).merge( setStream );
		}
	}
} );
```

Notice, in the `can-define-stream` example, `city` must be bound for it to work.  

## Sealed instances and strict mode

By default, `DefineMap` instances are [can-define/map/map.seal sealed].  This
means that setting properties that are not defined when the constructor is defined
will throw an error in files that are in [strict mode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode). For example:

```js
"use strict";

import DefineMap from "can-define/map/map";

const MyType = DefineMap.extend( {
	myProp: "string"
} );

const myType = new MyType();

myType.myProp = "value"; // no error thrown

myType.otherProp = "value"; // throws Error!
```

Read the [can-define/map/map.seal] documentation for more information on this behavior.
