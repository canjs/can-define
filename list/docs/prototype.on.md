@function can-define/list/list.prototype.on on
@parent can-define/list/list.prototype

@description Add event handlers to a list.

@signature `list.on(eventType, handler)`

Listens to `eventType` on `list` and calls `handler` when the event is dispatched.  This is simply
a reference to [can-event.on can-event.on] as all of [can-event] methods are available on `DefineMap`.

```js
var list = new DefineList(["CanJS","StealJS"])
list.on("add", function(ev, added, index){ ... });
list.push("DoneJS");
```

@param {String} eventType The type of event to bind this handler to.

@param {function(Event)} handler(event, ...args) The handler to be called when this type of event fires
The signature of the handler depends on the type of event being bound.

@return {can-define/list/list} This list, for chaining.
