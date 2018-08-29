@typedef {Event} can-define/map/map/KeysEvent can.keys
@parent can-define/map/map/events

Event fired when a property is added.

@signature `handler(event)`

  Handlers registered on `can.keys` events will be called
  back as follows.

  ```js
  import {DefineMap} from "can";

  const person = new DefineMap({name: "Justin"});

  list.on("can.keys", (event) => {
    console.log(event.target.serialize()); //-> {name: "Justin", age: 33}
  });
  person.set("age", 33);
  ```
  @codepen

  @param {Event} event An event object.
