@typedef {Event} can-define/map/map/KeysEvent __keys
@parent can-define/map/map/events

Event fired when a property is added.

@signature `handler(event)`

Handlers registered on `__keys` events will be called
back as follows.

```
var person = new DefineMap({name: "Justin"});
list.on("__keys", function(event){ ... });
person.set("age", 33);
```


  @param {Event} event An event object.
