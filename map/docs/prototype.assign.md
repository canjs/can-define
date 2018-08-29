@function can-define/map/map.prototype.assign assign
@parent can-define/map/map.prototype

@description Sets multiple properties on a map instance or a property that wasn't predefined.

@signature `map.assign(props)`

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

  obj.assign({
    list: ["first"]
  });

  console.log(obj.list.serialize()); //-> ["first"]
  console.log(obj.foo); //-> "bar"
  ```
  @codepen

  Assigns each value in `props` to a property on this map instance named after the
  corresponding key in `props`, effectively replacing `props` into the Map.
  Properties not in `props` will not be changed.

  @param {Object} props A collection of key-value pairs to set.
  If any properties already exist on the map, they will be overwritten.

  @return {can-define/map/map} The map instance for chaining.
