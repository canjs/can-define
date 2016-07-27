@function can-define/map/map.prototype.on on
@parent can-define/map/map.prototype

@description Add event handlers to a map.

@signature `map.on(eventType, handler)`

Listens to `eventType` on `map` and calls `handler` when the event is dispatched.  This is simply
a reference to [can-event.on can-event.on] as all of [can-event] methods are available on `DefineMap`.

```js
var map = new DefineMap({name: "Justin"})
map.on("name", function(ev, newVal, oldVal){
    newVal //-> "Brian"
    oldVal //-> "Justin"
});
map.name = "Brian";
```

@param {String} eventType The type of event to bind this handler to.

@param {function(Event)} handler(event, ...args) The handler to be called when this type of event fires
The signature of the handler depends on the type of event being bound. See below
for details.

@return {can-define/map/map} This map, for chaining.

@body

## Use

`on` binds event handlers to property changes on `DefineMap`s. When you change
a property value, a _property name_ event is fired, allowing other parts
of your application to map the changes to the object.

This event is useful for noticing changes to a specific property.


    var o = new DefineMap({name: "Justin"});
    o.on('name', function(ev, newVal, oldVal) {
        console.log('The value of a changed.');
    });


The parameters of the event handler for the _property name_ event are:

- _ev_ The event object.
- _newVal_ The value of the property after the change. `
- _oldVal_ The value of the property before the change.

Here is a concrete tour through the _property name_ event handler's arguments:


    var o = new DefineMap({a: undefined, b: undefined});
    o.on('a', function(ev, newVal, oldVal) {
        console.log(newVal + ', ' + oldVal);
    });

    o.a = 'Alexis';       // Alexis, undefined
    o.set('a', 'Adam');   // Adam, Alexis
    o.set({
        'a': 'Alice',     // Alice, Adam
        'b': 'Bob'
    });
    o.a = undefined;      // undefined, Alice
