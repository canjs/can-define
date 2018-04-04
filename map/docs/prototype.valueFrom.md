@function can-define/map/map.prototype.valueFrom valueFrom
@parent can-define/map/map.prototype

@description Get an observable for getting (but not setting) a property on a map.

@signature `map.valueFrom( propName )`

  @param {String} propName The property for which you’d like an observable.

  @return {Object} An observable compatible with [can-reflect.getValue can-reflect.getValue()]
  but not [can-reflect.setValue can-reflect.setValue()].

@body

## Use

```js
import canReflect from "can-reflect";
import DefineMap from "can-define/map/map";

const map = new DefineMap({
	greeting: "hello"
});

const greetingObservable = map.valueFrom("greeting");
// canReflect.getValue(greetingObservable) === "hello"

canReflect.setValue(greetingObservable, "aloha");
// Error thrown because the value isn’t settable
```
