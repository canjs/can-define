@function can-define/map/map.prototype.valueTo valueTo
@parent can-define/map/map.prototype

@description Get an observable for setting (but not getting) a property on a map.

@signature `map.valueTo( propName )`

  @param {String} propName The property for which you’d like an observable.

  @return {Object} An observable compatible with [can-reflect.setValue can-reflect.setValue()]
  but not [can-reflect.getValue can-reflect.getValue()].

@body

## Use

```js
import canReflect from "can-reflect";
import DefineMap from "can-define/map/map";

const map = new DefineMap({
	greeting: "hello"
});

const greetingObservable = map.valueTo("greeting");
// canReflect.getValue(greetingObservable) returns undefined

canReflect.setValue(greetingObservable, "aloha");
// firstMap.prop === "aloha"
```
