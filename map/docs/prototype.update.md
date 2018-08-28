@function can-define/map/map.prototype.update update
@parent can-define/map/map.prototype

@description Sets multiple properties on a map instance or a property that wasn't predefined.

@signature `map.update(props)`

  ```js
  var MyMap = DefineMap.extend({
    list: DefineList,
    name: 'string'
  });
  var obj = new MyMap({
    list: ['1', '2', '3'],
    foo: 'bar'
  });
  obj.update({
    list: ['first']
  });

  obj.list //-> ['first', '2', '3']
  obj.foo //-> 'undefined'
  ```
  Assigns each value in `props` to a property on this map instance named after the
  corresponding key in `props`, effectively merging `props` into the Map.
  Properties not in `props` will be set to `undefined`.

  @param {Object} props A collection of key-value pairs to set.
  If any properties already exist on the map, they will be overwritten.

  @return {can-define/map/map} The map instance for chaining.
