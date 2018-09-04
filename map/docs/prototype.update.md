@function can-define/map/map.prototype.update update
@parent can-define/map/map.prototype

@description Sets multiple properties on a map instance or a property that wasn't predefined.

@signature `map.update(props)`

  Assigns each value in `props` to a property on this map instance named after the
  corresponding key in `props`, effectively merging `props` into the Map.
  Properties not in `props` will be set to `undefined`.

  ```js
  import {DefineMap, DefineList} from "can";

  const MyMap = DefineMap.extend({
    list: DefineList,
    name: "string"
  });

  const obj = new MyMap({
    list: ["1", "2", "3"],
    foo: "bar"
  });

  obj.update({
    list: ["first"]
  });

  console.log( obj.serialize() ); //-> { list: ["first"] }
  console.log( obj.foo ); //-> undefined
  ```
  @codepen

  @param {Object} props A collection of key-value pairs to set.
  If any properties already exist on the map, they will be overwritten.

  @return {can-define/map/map} The map instance for chaining.
