[![Build Status](https://travis-ci.org/canjs/can-define.svg?branch=master)](https://travis-ci.org/canjs/can-define)

# can-define

Add `can.compute` observable properties, type conversion, and getter/setter logic to your constructor prototypes.

```js
var Person = function(first, last){
		this.first = first;
		this.last = last;
};
define(Person.prototype,{
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
