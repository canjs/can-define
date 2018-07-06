@function can-define/map/map.prototype.deleteKey deleteKey
@parent can-define/map/map.prototype

@description Delete an "expando" key value.

@signature `map.deleteKey(key)`

Deletes a key that was added to an instance, but not pre-defined by the type.

```js
import {DefineMap} from "can";

var Type = DefineMap.extend({seal: false},{
  propA: "string"
});

var map = new Type({propA: "valueA"});
map.set("propB","valueB");
map.deleteKey("propB"); // this works.
map.deleteKey("propA"); // this does not work.
```
