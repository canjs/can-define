@function can-define/map/map.prototype.forEach forEach
@parent can-define/map/map.prototype

@description Call a function on each property of a DefineMap.

@signature `map.forEach( callback(value, propName ) )`

`forEach` iterates through the map instance, calling a function
for each property value and key.

```js
map.forEach( function( value, propName ) { /* ... */ } );
```

  @param {function(*,String)} callback(value,propName) The function to call for each property
  The value and key of each property will be passed as the first and second
  arguments, respectively, to the callback. If the callback returns `false`,
  the loop will stop.

  @return {can-define/map/map} The map instance for chaining.

@body

## Use

Example

```
var names = [];
new DefineMap({a: 'Alice', b: 'Bob', e: 'Eve'}).forEach(function(value, key) {
    names.push(value);
});

names; // ['Alice', 'Bob', 'Eve']

names = [];
new DefineMap({a: 'Alice', b: 'Bob', e: 'Eve'}).forEach(function(value, key) {
    names.push(value);
    if(key === 'b') {
        return false;
    }
});

names; // ['Alice', 'Bob']
```
