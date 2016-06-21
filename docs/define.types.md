@property {Object} can-define.types types
@parent can-define
Defines the type, initial value, and get, set, and serialize behavior for an
observable property. All type converters leave `null` and `undefined` as is except for
the `"boolean"` type converter.

@option {function} observable The default type behavior. It converts plain Objects to
[can-define/map/map DefineMaps] and plain Arrays to [can-define/list/list DefineLists]. Everything else is left as is.
@option {function} any Leaves the set value as is, performs no type conversion. Aliased as `*`.
@option {function} string Converts to a string with `""+val`.
@option {function} date Converts to a JavaScript date using `Date.parse(val)` if a string is given or `new Date(val)` if a number is passed.
@option {function} number Converts to a number with `+(val)`.
@option {function} boolean Converts to `false` if `val` is falsey, `"0"`, or `"false"`; otherwise, converts to `true`.
@option {function} htmlbool Like `boolean`, but converts to `true` if empty string (`""`) is passed.
@option {function} compute Allows computes to be passed and the property take on the value of the compute.
@option {function} stringOrObservable Converts plain Objects to [can-define/map/map DefineMaps], plain Arrays to [can-define/list/list DefineLists] and everything else to strings.  This is useful for routing.
