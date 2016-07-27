@typedef {Event} can-define/list/list/PropertyNameEvent propertyName
@parent can-define/list/list/events

Event fired when a property on the list changes values.

@signature `handler(event, newValue, oldValue)`

Handlers registered on `propertyName` events will be called
back as follows.

```
list.set("totalCount", 500);
list.on("totalCount", function(event, newVal, oldVal){
  newVal //-> 5
  oldVal //-> 500
});
list.set("totalCount", 5);
```


  @param {Event} event An event object.
  @param {*} newVal The new value of the `propertyName` property.
  @param {*} oldVal The old value of the `propertyName` property.
