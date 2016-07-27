@typedef {Event} can-define/map/map/PropertyNameEvent propertyName
@parent can-define/map/map/events

Event fired when a property on the map changes values.

@signature `handler(event, newValue, oldValue)`

Handlers registered on `propertyName` events will be called
back as follows.

```
var person = new DefineMap({name: "Justin"});
list.on("name", function(event, newVal, oldVal){
  newVal //-> "Brian"
  oldVal //-> "Justin"
});
person.name = "Brian";
```


  @param {Event} event An event object.
  @param {*} newVal The new value of the `propertyName` property.
  @param {*} oldVal The old value of the `propertyName` property.
