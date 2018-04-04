@function can-define/map/map.prototype.valueBind valueBind
@parent can-define/map/map.prototype

@description Get an observable for getting and setting a property on a map.

@signature `map.valueBind( propName )`

  @param {String} propName The property for which you’d like an observable.

  @return {Object} An observable compatible with [can-reflect]’s
  [can-reflect.getValue] and [can-reflect.setValue] methods.

@body

## Use

```js
import canReflect from "can-reflect";
import DefineMap from "can-define/map/map";

const map = new DefineMap({
	greeting: "hello"
});

const greetingObservable = map.valueBind("greeting");
// canReflect.getValue(greetingObservable) === "hello"

canReflect.setValue(greetingObservable, "aloha");
// firstMap.prop === "aloha"
```
