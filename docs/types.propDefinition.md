@typedef {Object} can-define.types.propDefinition propDefinition
@parent can-define.types

Defines the type, initial value, and get, set, and serialize behavior for an
observable property.

@option {function|*} value Specifies the initial value of the property or
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

@option {function} Value Specifies a function that will be called with `new` whose result is
set as the initial value of the attribute.

```js
// A default empty DefineList of hobbies:
var Person = DefineMap.extend({
  hobbies: {Value: DefineList}
});

new Person().hobbies //-> []
```

@option {function|String} type Specifies the type of the
property.  The type can be specified as either a function
that returns the type coerced value or one of the [can-define.types] names.

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

@option {function} Type A constructor function that takes
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

@option {can.Map.prototype.define.set} set A set function that specifies what should happen when an attribute
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

@option {can-define.types.get} get A function that specifies how the value is retrieved.  The get function is
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

@option {can.Map.prototype.define.serialize|Boolean} serialize Specifies the behavior of the
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
