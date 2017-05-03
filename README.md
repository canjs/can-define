[![Build Status](https://travis-ci.org/canjs/can-define.svg?branch=master)](https://travis-ci.org/canjs/can-define)

# can-define

[![Greenkeeper badge](https://badges.greenkeeper.io/canjs/can-define.svg)](https://greenkeeper.io/)

Add observable properties, type conversion, and getter/setter logic to your constructor prototypes.

- <code>[__can-define__ function](#can-define-function)</code>
  - <code>[can.define(prototype, propDefinitions)](#candefineprototype-propdefinitions)</code>
    - <code>[propDefinition Object](#propdefinition-object)</code>
    - <code>[types Object](#types-object)</code>
- <code>[__can-define/map/map__ function](#can-definemapmap-function)</code>
  - <code>[new can.DefineMap([props])](#new-candefinemapprops)</code>
    - _static_
      - <code>[can.DefineMap.extend([name,] [static,] prototype)](#candefinemapextendname-static-prototype)</code>
      - <code>[seal Boolean](#seal-boolean)</code>
    - _prototype_
      - <code>[map.each( callback(item, propName ) )](#mapeach-callbackitem-propname--)</code>
      - <code>[map.toObject()](#maptoobject)</code>
      - <code>[map.serialize()](#mapserialize)</code>
      - <code>[map.get(propName)](#mapgetpropname)</code>
      - <code>[map.set(propName, value)](#mapsetpropname-value)</code>
- <code>[__can-define/list/list__ function](#can-definelistlist-function)</code>
  - <code>[new can.DefineList([items])](#new-candefinelistitems)</code>
    - _prototype_
      - <code>[map.item(index, [newVal])](#mapitemindex-newval)</code>
      - <code>[map.items()](#mapitems)</code>
      - <code>[list.each( callback(item, index) )](#listeach-callbackitem-index-)</code>
      - <code>[list.forEach(callback[, thisArg])](#listforeachcallback-thisarg)</code>
      - <code>[list.splice(index[, howMany[, ...newElements]])](#listspliceindex-howmany-newelements)</code>
      - <code>[list.replace(collection)](#listreplacecollection)</code>
      - <code>[list.push(...elements)](#listpushelements)</code>
      - <code>[list.unshift(...elements)](#listunshiftelements)</code>
      - <code>[list.pop()](#listpop)</code>
      - <code>[list.shift()](#listshift)</code>
      - <code>[list.indexOf(item)](#listindexofitem)</code>
      - <code>[list.join(separator)](#listjoinseparator)</code>
      - <code>[list.reverse()](#listreverse)</code>
      - <code>[list.slice([start[, end]])](#listslicestart-end)</code>
      - <code>[list.concat(...args)](#listconcatargs)</code>

## API


## <code>__can-define__ function</code>
Exports the `can.define` method that defines observable properties and their behavior.



### <code>can.define(prototype, propDefinitions)</code>


Define observable properties, type conversion, and getter/setter logic to your constructor prototypes.

```js
var Person = function(first, last){
  this.first = first;
  this.last = last;
};
can.define(Person.prototype,{
  first: {
    type: "string"
  },
  last: {
    type: "string"
  },
  fullName: {
    get: function(){
      return this.first+" "+this.last;
    }
  }
});
```


1. __prototype__ <code>{Object}</code>:
  The prototype object of a constructor function.

1. __propDefinitions__ <code>{Object\<String,[propDefinition](#propdefinition-object)\>}</code>:
  An object of
  properties and their definitions.

#### propDefinition `{Object}`


Defines the type, initial value, and get, set, and serialize behavior for an
observable property.



##### <code>Object</code>

- __value__ <code>{function|*}</code>:
  Specifies the initial value of the property or
  a function that returns the initial value.

  ```js
  // A default age of `0`:
  var Person = DefineMap.extend({
    age: {value: 0}    
  });

  new Person().age //-> 0
  ```

  `Object` types should not be specified directly on `value` because that same object will
  be shared on every instance of the Map.  Instead, a function that returns a fresh copy should be provided:

  ```js
  // A default address object:
  var Person = DefineMap.extend({
    address: {
      value: function(){
        return {city: "Chicago", state: "IL"};
      };
    }    
  });

  new Person().address //-> {city: "Chicago", state: "IL"};
  ```

- __Value__ <code>{function}</code>:
  Specifies a function that will be called with `new` whose result is
  set as the initial value of the attribute.

  ```js
  // A default empty DefineList of hobbies:
  var Person = DefineMap.extend({
    hobbies: {Value: DefineList}
  });

  new Person().hobbies //-> []
  ```

- __type__ <code>{function|String}</code>:
  Specifies the type of the
  property.  The type can be specified as either a function
  that returns the type coerced value or one of the [types](#types-object) names.

  ```js
  var Person = DefineMap.extend({
    age: {type: "number"},
    hobbies: {
      type: function(newValue){
        if(typeof newValue === "string") {
          return newValue.split(",")
        } else if( Array.isArray(newValue) ) {
          return newValue;
        }
      }
    }
  });

  var me = new Person({age: "33", hobbies: "bball,js"})
  me.age //-> 33
  me.hobbies //-> ["bball","js"]
  ```

- __Type__ <code>{function}</code>:
  A constructor function that takes
  the value passed to [can.Map::attr attr] as the first argument and called with
  new. For example, if you want whatever
  gets passed to go through `new Array(newValue)` you can do that like:

  ```js
  define: {
    items: {
      Type: Array
    }
  }
  ```

  If the value passed to [can.Map::attr attr] is already an Array, it will be left as is.

- __set__ <code>{can.Map.prototype.define.set}</code>:
  A set function that specifies what should happen when an attribute
  is set on a [can.Map]. `set` is called with the result of `type` or `Type`. The following
  defines a `page` setter that updates the map's offset:

  ```js
  define: {
    page: {
      set: function(newVal){
        this.attr('offset', (parseInt(newVal) - 1) *
                             this.attr('limit'));
      }
    }
  }
  ```

- __get__ <code>{[get](#get-lastsetvalue-)(lastSetValue)}</code>:
  A function that specifies how the value is retrieved.  The get function is
  converted to an [can.compute.async async compute].  It should derive its value from other values
  on the map. The following
  defines a `page` getter that reads from a map's offset and limit:

  ```js
  define: {
    page: {
      get: function (newVal) {
  	  return Math.floor(this.attr('offset') /
  	                    this.attr('limit')) + 1;
  	}
    }
  }
  ```

  A `get` definition makes the property __computed__ which means it will not be serialized by default.

- __serialize__ <code>{can.Map.prototype.define.serialize|Boolean}</code>:
  Specifies the behavior of the
  property when [can.Map::serialize serialize] is called.

  By default, serialize does not include computed values. Properties with a `get` definition
  are computed and therefore are not added to the result.  Non-computed properties values are
  serialized if possible and added to the result.

  ```js
  Paginate = can.Map.extend({
    define: {
      pageNum: {
        get: function(){ return this.offset() / 20 }
      }
    }
  });

  p = new Paginate({offset: 40});
  p.serialize() //-> {offset: 40}
  ```

  If `true` is specified, computed properties will be serialized and added to the result.

  ```js
  Paginate = can.Map.extend({
    define: {
      pageNum: {
        get: function(){ return this.offset() / 20 },
        serialize: true
      }
    }
  });

  p = new Paginate({offset: 40});
  p.serialize() //-> {offset: 40, pageNum: 2}
  ```

  If `false` is specified, non-computed properties will not be added to the result.

  ```js
  Paginate = can.Map.extend({
    define: {
      offset: {
        serialize: false
      }
    }
  });

  p = new Paginate({offset: 40});
  p.serialize() //-> {}
  ```

  If a [can.Map.prototype.define.serialize serialize function] is specified, the result
  of the function is added to the result.

  ```js
  Paginate = can.Map.extend({
    define: {
      offset: {
        serialize: function(offset){
          return (offset / 20)+1
        }
      }
    }
  });

  p = new Paginate({offset: 40});
  p.serialize() //-> {offset: 3}
  ```

#### types `{Object}`


Defines the type, initial value, and get, set, and serialize behavior for an
observable property. All type converters leave `null` and `undefined` as is except for
the `"boolean"` type converter.



##### <code>Object</code>

- __observable__ <code>{function}</code>:
  The default type behavior. It converts plain Objects to
  [DefineMaps](#new-candefinemapprops) and plain Arrays to [DefineLists](#new-candefinelistitems). Everything else is left as is.
- __any__ <code>{function}</code>:
  Leaves the set value as is, performs no type conversion. Aliased as `*`.
- __string__ <code>{function}</code>:
  Converts to a string with `""+val`.
- __date__ <code>{function}</code>:
  Converts to a JavaScript date using `Date.parse(val)` if a string is given or `new Date(val)` if a number is passed.
- __number__ <code>{function}</code>:
  Converts to a number with `+(val)`.
- __boolean__ <code>{function}</code>:
  Converts to `false` if `val` is falsey, `"0"`, or `"false"`; otherwise, converts to `true`.
- __htmlbool__ <code>{function}</code>:
  Like `boolean`, but converts to `true` if empty string (`""`) is passed.
- __compute__ <code>{function}</code>:
  Allows computes to be passed and the property take on the value of the compute.
- __stringOrObservable__ <code>{function}</code>:
  Converts plain Objects to [DefineMaps](#new-candefinemapprops), plain Arrays to [DefineLists](#new-candefinelistitems) and everything else to strings.  This is useful for routing.


## <code>__can-define/map/map__ function</code>
Create observable objects.


### <code>new can.DefineMap([props])</code>


Creates a new instance of DefineMap or an extended DefineMap.

```js
var person = new can.DefineMap({
  first: "Justin",
  last: "Meyer"
})
```


1. __props__ <code>{Object}</code>:
  Properties and values to seed the map with.

- __returns__ <code>{[can-define/map/map](#new-candefinemapprops)}</code>:
  An instance of `can.DefineMap` with the properties from _props_.


#### <code>can.DefineMap.extend([name,] [static,] prototype)</code>


Extends can.DefineMap, or constructor functions derived from can.DefineMap,
to create a new constructor function.

```js
var Person = can.DefineMap.extend(
  "Person",
  {seal: true},
  {
    first: "string",
    last: {type: "string"},
    fullName: {
      get: function(){
        return this.first+" "+this.last;
      }
    },
    age: {value: 0},
  });

var me = new Person({first: "Justin", last: "Meyer"})
me.fullName //-> "Justin Meyer"
me.age      //-> 0
```


1. __name__ <code>{String}</code>:
  Provides an optional name for this type that will
  show up nicely in debuggers.

1. __static__ <code>{Object}</code>:
  Static properties that are set directly on the
  constructor function.

1. __prototype__ <code>{Object\<String,function|String|[types](#types-object)|[propDefinition](#propdefinition-object)\>}</code>:
  A definition of the properties or methods on this type.

  If the property definition is a __plain function__, it's considered a method.

  ```js
  var Person = DefineMap.extend({
    sayHi: function(){ console.log("hi"); }
  });

  var me = new Person();
  me.sayHi();
  ```

  If the property definition is a __string__, it's considered a `type` setting to be looked up in [can.define.types](#types-object).

  ```js
  var Person = DefineMap.extend({
    age: 'number',
    isCool: 'boolean',
    hobbies: 'observable'
  });

  var me = new Person({age: '33', isCool: 'false', hobbies: ['js','bball']});
  me.age    //-> 33
  me.isCool //-> false
  me.hobbies instanceof DefineList //-> true
  ```


  If the property definition is a Constructor function, it's considered a `Type` setting.

  ```js
  var Address = DefineMap.extend({
    zip: 'number'
  });
  var Person = DefineMap.extend({
    address: Address
  });

  var me = new Person({address: {zip: '60048'}});
  me.address.zip //-> 60048
  ```

  If the property is an __object__, it's considered to be a [propDefinition](#propdefinition-object).

  ```js
  var Person = DefineMap.extend({
    fullName: {
      get: function() {
        return this.first+" "+this.last;
      },
      set: function(newVal) {
        var parts = newVal.split(" ");
        this.first = parts[0];
        this.last = parts[1];
      }
    },
    // slick way of creating an 'inline' type.
    address: {
      Type: {
        zip: "number"
      }
    }
  });

  var me = new Person({fullName: "Rami Myer", address: {zip: '60048'}});
  me.first       //-> "Rami"
  me.address.zip //-> 60048
  ```


- __returns__ <code>{[can-define/map/map](#new-candefinemapprops)}</code>:
  A DefineMap constructor function.

#### seal `{Boolean}`

Defines if instances of the map should be [sealed](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/seal) in development.



##### <code>Boolean</code>
If `true`, in development, instances of this object will be [sealed](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/seal).  In  [strict mode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode) errors will be thrown when undefined properties are set.  This is the default
behavior of [extended DefineMaps](#candefinemapextendname-static-prototype):

```js
"use strict";
var Person = can.DefineMap.extend({});
var me = new Person();
me.age = 33 //-> throws "TypeError: Can't add property age, object is not extensible"
```

If `false`, the object will not be sealed.  This is the default behavior of
unextended [DefineMaps](#new-candefinemapprops).  Use [get](#mapgetpropname) and [set](#mapsetpropname-value) to get and set values:

```js
var person = new can.DefineMap();
person.set("first","Justin");
person.set("last","Meyer");

person.get("first") //-> "Justin"
person.get("last") //-> "Meyer"
```

Set `seal` to `false` on objects that have an indeterminate number of properties:

```js
var Style = can.DefineMap.extend({
  seal: false
},{
  cssText: {
    get: function(){
      return _.map(this.get(), function(val, prop){
        return prop+": "+val;
      }).join(";")
    }
  }
});
var style = new Style();
style.set("color","green");
style.set("font","awesome");
style.cssText //-> "color:green; font: awesome;"
```


#### <code>map.each( callback(item, propName ) )</code>


`each` iterates through the Map, calling a function
for each property value and key.


1. __callback__ <code>{function(item, propName)}</code>:
  the function to call for each property
  The value and key of each property will be passed as the first and second
  arguments, respectively, to the callback. If the callback returns false,
  the loop will stop.


- __returns__ <code>{can.Map}</code>:
  this Map, for chaining


#### <code>map.toObject()</code>



#### <code>map.serialize()</code>



#### <code>map.get(propName)</code>



#### <code>map.set(propName, value)</code>



## <code>__can-define/list/list__ function</code>
Create observable list.


### <code>new can.DefineList([items])</code>



#### <code>map.item(index, [newVal])</code>



#### <code>map.items()</code>



#### <code>list.each( callback(item, index) )</code>


`each` iterates through the Map, calling a function
for each element.


1. __callback__ <code>{function(*, Number)}</code>:
  the function to call for each element
  The value and index of each element will be passed as the first and second
  arguments, respectively, to the callback. If the callback returns false,
  the loop will stop.


- __returns__ <code>{can.DefineList}</code>:
  this DefineList, for chaining


#### <code>list.forEach(callback[, thisArg])</code>


1. __callback__ <code>{function(element, index, list)}</code>:
  a function to call with each element of the DefineList
  The three parameters that _callback_ gets passed are _element_, the element at _index_, _index_ the
  current element of the list, and _list_ the DefineList the elements are coming from.
1. __thisArg__ <code>{Object}</code>:
  the object to use as `this` inside the callback


#### <code>list.splice(index[, howMany[, ...newElements]])</code>


1. __index__ <code>{Number}</code>:
  where to start removing or inserting elements

1. __howMany__ <code>{Number}</code>:
  the number of elements to remove
  If _howMany_ is not provided, `splice` will remove all elements from `index` to the end of the DefineList.

1. __newElements__ <code>{*}</code>:
  elements to insert into the DefineList


- __returns__ <code>{Array}</code>:
  the elements removed by `splice`


#### <code>list.replace(collection)</code>


1. __collection__ <code>{Array|can.DefineList|can.Deferred}</code>:
  the collection of new elements to use
  If a [can.Deferred] is passed, it must resolve to an `Array` or `can.DefineList`.
  The elements of the list are not actually removed until the Deferred resolves.


#### <code>list.push(...elements)</code>


`push` adds elements onto the end of a DefineList.


1. __elements__ <code>{*}</code>:
  the elements to add to the DefineList


- __returns__ <code>{Number}</code>:
  the new length of the DefineList


#### <code>list.unshift(...elements)</code>


`unshift` adds elements onto the beginning of a DefineList.


1. __elements__ <code>{*}</code>:
  the elements to add to the DefineList


- __returns__ <code>{Number}</code>:
  the new length of the DefineList


#### <code>list.pop()</code>


`pop` removes an element from the end of a DefineList.


- __returns__ <code>{*}</code>:
  the element just popped off the DefineList, or `undefined` if the DefineList was empty


#### <code>list.shift()</code>


`shift` removes an element from the beginning of a DefineList.


- __returns__ <code>{*}</code>:
  the element just shifted off the DefineList, or `undefined` if the DefineList is empty


#### <code>list.indexOf(item)</code>


`indexOf` finds the position of a given item in the DefineList.


1. __item__ <code>{*}</code>:
  the item to find


- __returns__ <code>{Number}</code>:
  the position of the item in the DefineList, or -1 if the item is not found.


#### <code>list.join(separator)</code>


`join` turns a DefineList into a string by inserting _separator_ between the string representations
of all the elements of the DefineList.


1. __separator__ <code>{String}</code>:
  the string to seperate elements with


- __returns__ <code>{String}</code>:
  the joined string


#### <code>list.reverse()</code>


`reverse` reverses the elements of the DefineList in place.


- __returns__ <code>{can.DefineList}</code>:
  the DefineList, for chaining


#### <code>list.slice([start[, end]])</code>


`slice` creates a copy of a portion of the DefineList.


1. __start__ <code>{Number}</code>:
  the index to start copying from

1. __end__ <code>{Number}</code>:
  the first index not to include in the copy
  If _end_ is not supplied, `slice` will copy until the end of the list.


- __returns__ <code>{can.DefineList}</code>:
  a new `can.DefineList` with the extracted elements


#### <code>list.concat(...args)</code>


1. __args__ <code>{Array|can.DefineList|*}</code>:
  Any number of arrays, Lists, or values to add in
  For each parameter given, if it is an Array or a DefineList, each of its elements will be added to
  the end of the concatenated DefineList. Otherwise, the parameter itself will be added.
