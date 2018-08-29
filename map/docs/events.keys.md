@typedef {Event} can-define/map/map/KeysEvent can.keys
@parent can-define/map/map/events

Event fired when a property is added.

@signature `handler(event)`

  Handlers registered on `can.keys` events will be called
  back as follows.

  ```js
  import {DefineMap} from "can";
  var person = new DefineMap({name: "Justin"});
  list.on("can.keys", (event) => { console.log(event); });
  person.set("age", 33);
  ```
  @codepen

  @param {Event} event An event object.
