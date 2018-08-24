"use strict";
var Construct = require("can-construct");
var define = require("can-define");
var make = define.make;
var queues = require("can-queues");
var addTypeEvents = require("can-event-queue/type/type");

var ObservationRecorder = require("can-observation-recorder");
var canLog = require("can-log");
var canLogDev = require("can-log/dev/dev");
var defineHelpers = require("../define-helpers/define-helpers");

var assign = require("can-assign");
var diff = require("can-diff/list/list");
var ns = require("can-namespace");
var canReflect = require("can-reflect");
var canSymbol = require("can-symbol");
var singleReference = require("can-single-reference");

var splice = [].splice;
var runningNative = false;

var identity = function(x) {
	return x;
};

// symbols aren't enumerable ... we'd need a version of Object that treats them that way
var localOnPatchesSymbol = "can.patches";

var makeFilterCallback = function(props) {
	return function(item) {
		for (var prop in props) {
			if (item[prop] !== props[prop]) {
				return false;
			}
		}
		return true;
	};
};

var onKeyValue = define.eventsProto[canSymbol.for("can.onKeyValue")];
var offKeyValue = define.eventsProto[canSymbol.for("can.offKeyValue")];
var getSchemaSymbol = canSymbol.for("can.getSchema");

function getSchema() {
	var definitions = this.prototype._define.definitions;
	var schema = {
		type: "list",
		keys: {}
	};
	schema = define.updateSchemaKeys(schema, definitions);
	if(schema.keys["#"]) {
		schema.values = definitions["#"].Type;
		delete schema.keys["#"];
	}

	return schema;
}


/** @add can-define/list/list */
var DefineList = Construct.extend("DefineList",
	/** @static */
	{
		setup: function(base) {
			if (DefineList) {
				addTypeEvents(this);
				var prototype = this.prototype;
				var result = define(prototype, prototype, base.prototype._define);
				define.makeDefineInstanceKey(this, result);

				var itemsDefinition = result.definitions["#"] || result.defaultDefinition;

				if (itemsDefinition) {
					if (itemsDefinition.Type) {
						this.prototype.__type = make.set.Type("*", itemsDefinition.Type, identity);
					} else if (itemsDefinition.type) {
						this.prototype.__type = make.set.type("*", itemsDefinition.type, identity);
					}
				}
				this[getSchemaSymbol] = getSchema;
			}
		}
	},
	/** @prototype */
	{
		// setup for only dynamic DefineMap instances
		setup: function(items) {
			if (!this._define) {
				Object.defineProperty(this, "_define", {
					enumerable: false,
					value: {
						definitions: {
							length: { type: "number" },
							_length: { type: "number" }
						}
					}
				});
				Object.defineProperty(this, "_data", {
					enumerable: false,
					value: {}
				});
			}
			define.setup.call(this, {}, false);
			Object.defineProperty(this, "_length", {
				enumerable: false,
				configurable: true,
				writable: true,
				value: 0
			});
			if (items) {
				this.splice.apply(this, [ 0, 0 ].concat(canReflect.toArray(items)));
			}
		},
		__type: define.types.observable,
		_triggerChange: function(attr, how, newVal, oldVal) {

			var index = +attr;
			// `batchTrigger` direct add and remove events...

			// Make sure this is not nested and not an expando
			if ( !isNaN(index)) {
				var itemsDefinition = this._define.definitions["#"];
				var patches, dispatched;
				if (how === 'add') {
					if (itemsDefinition && typeof itemsDefinition.added === 'function') {
						ObservationRecorder.ignore(itemsDefinition.added).call(this, newVal, index);
					}

					patches = [{type: "splice", insert: newVal, index: index, deleteCount: 0}];
					dispatched = {
						type: how,
						patches: patches
					};

					//!steal-remove-start
					if(process.env.NODE_ENV !== 'production') {
						dispatched.reasonLog = [ canReflect.getName(this), "added", newVal, "at", index ];
					}
					//!steal-remove-end
					this.dispatch(dispatched, [ newVal, index ]);

				} else if (how === 'remove') {
					if (itemsDefinition && typeof itemsDefinition.removed === 'function') {
						ObservationRecorder.ignore(itemsDefinition.removed).call(this, oldVal, index);
					}

					patches = [{type: "splice", index: index, deleteCount: oldVal.length}];
					dispatched = {
						type: how,
						patches: patches
					};
					//!steal-remove-start
					if(process.env.NODE_ENV !== 'production') {
						dispatched.reasonLog = [ canReflect.getName(this), "remove", oldVal, "at", index ];
					}
					//!steal-remove-end
					this.dispatch(dispatched, [ oldVal, index ]);

				} else {
					this.dispatch(how, [ newVal, index ]);
				}
			} else {
				this.dispatch({
					type: "" + attr,
					target: this
				}, [ newVal, oldVal ]);
			}
		},
		get: function(index) {
			if (arguments.length) {
				if(isNaN(index)) {
					ObservationRecorder.add(this, index);
				} else {
					ObservationRecorder.add(this, "length");
				}
				return this[index];
			} else {
				return canReflect.unwrap(this, Map);
			}
		},
		set: function(prop, value) {
			// if we are setting a single value
			if (typeof prop !== "object") {
				// We want change events to notify using integers if we're
				// setting an integer index. Note that <float> % 1 !== 0;
				prop = isNaN(+prop) || (prop % 1) ? prop : +prop;
				if (typeof prop === "number") {
					// Check to see if we're doing a .attr() on an out of
					// bounds index property.
					if (typeof prop === "number" &&
						prop > this._length - 1) {
						var newArr = new Array((prop + 1) - this._length);
						newArr[newArr.length - 1] = value;
						this.push.apply(this, newArr);
						return newArr;
					}
					this.splice(prop, 1, value);
				} else {
					var defined = defineHelpers.defineExpando(this, prop, value);
					if (!defined) {
						this[prop] = value;
					}
				}

			}
			// otherwise we are setting multiple
			else {
				//!steal-remove-start
				if(process.env.NODE_ENV !== 'production') {
					canLogDev.warn('can-define/list/list.prototype.set is deprecated; please use can-define/list/list.prototype.assign or can-define/list/list.prototype.update instead');
				}
				//!steal-remove-end

				//we are deprecating this in #245
				if (canReflect.isListLike(prop)) {
					if (value) {
						this.replace(prop);
					} else {
						canReflect.assignList(this, prop);
					}
				} else {
					canReflect.assignMap(this, prop);
				}
			}
			return this;
		},
		assign: function(prop) {
			if (canReflect.isListLike(prop)) {
				canReflect.assignList(this, prop);
			} else {
				canReflect.assignMap(this, prop);
			}
			return this;
		},
		update: function(prop) {
			if (canReflect.isListLike(prop)) {
				canReflect.updateList(this, prop);
			} else {
				canReflect.updateMap(this, prop);
			}
			return this;
		},
		assignDeep: function(prop) {
			if (canReflect.isListLike(prop)) {
				canReflect.assignDeepList(this, prop);
			} else {
				canReflect.assignDeepMap(this, prop);
			}
			return this;
		},
		updateDeep: function(prop) {
			if (canReflect.isListLike(prop)) {
				canReflect.updateDeepList(this, prop);
			} else {
				canReflect.updateDeepMap(this, prop);
			}
			return this;
		},
		_items: function() {
			var arr = [];
			this._each(function(item) {
				arr.push(item);
			});
			return arr;
		},
		_each: function(callback) {
			for (var i = 0, len = this._length; i < len; i++) {
				callback(this[i], i);
			}
		},
		splice: function(index, howMany) {
			var args = canReflect.toArray(arguments),
				added = [],
				i, len, listIndex,
				allSame = args.length > 2,
				oldLength = this._length;

			index = index || 0;

			// converting the arguments to the right type
			for (i = 0, len = args.length - 2; i < len; i++) {
				listIndex = i + 2;
				args[listIndex] = this.__type(args[listIndex], listIndex);
				added.push(args[listIndex]);

				// Now lets check if anything will change
				if (this[i + index] !== args[listIndex]) {
					allSame = false;
				}
			}

			// if nothing has changed, then return
			if (allSame && this._length <= added.length) {
				return added;
			}

			// default howMany if not provided
			if (howMany === undefined) {
				howMany = args[1] = this._length - index;
			}

			runningNative = true;
			var removed = splice.apply(this, args);
			runningNative = false;

			queues.batch.start();
			if (howMany > 0) {
				// tears down bubbling
				this._triggerChange("" + index, "remove", undefined, removed);
			}
			if (args.length > 2) {
				this._triggerChange("" + index, "add", added, removed);
			}

			this.dispatch('length', [ this._length, oldLength ]);

			queues.batch.stop();
			return removed;
		},

		/**
		 */
		serialize: function() {
			return canReflect.serialize(this, Map);
		}
	}
);

for(var prop in define.eventsProto) {
	Object.defineProperty(DefineList.prototype, prop, {
		enumerable:false,
		value: define.eventsProto[prop],
		writable: true
	});
}

var eventsProtoSymbols = ("getOwnPropertySymbols" in Object) ?
  Object.getOwnPropertySymbols(define.eventsProto) :
  [canSymbol.for("can.onKeyValue"), canSymbol.for("can.offKeyValue")];

eventsProtoSymbols.forEach(function(sym) {
  Object.defineProperty(DefineList.prototype, sym, {
    enumerable:false,
    value: define.eventsProto[sym],
    writable: true
  });
});

// Converts to an `array` of arguments.
var getArgs = function(args) {
	return args[0] && Array.isArray(args[0]) ?
		args[0] :
		canReflect.toArray(args);
};
// Create `push`, `pop`, `shift`, and `unshift`
canReflect.eachKey({
	push: "length",
	unshift: 0
},
	// Adds a method
	// `name` - The method name.
	// `where` - Where items in the `array` should be added.
	function(where, name) {
		var orig = [][name];
		DefineList.prototype[name] = function() {
			// Get the items being added.
			var args = [],
				// Where we are going to add items.
				len = where ? this._length : 0,
				i = arguments.length,
				res, val;

			// Go through and convert anything to a `map` that needs to be converted.
			while (i--) {
				val = arguments[i];
				args[i] = this.__type(val, i);
			}

			// Call the original method.
			runningNative = true;
			res = orig.apply(this, args);
			runningNative = false;

			if (!this.comparator || args.length) {
				queues.batch.start();
				this._triggerChange("" + len, "add", args, undefined);
				this.dispatch('length', [ this._length, len ]);
				queues.batch.stop();
			}

			return res;
		};
	});

canReflect.eachKey({
	pop: "length",
	shift: 0
},
	// Creates a `remove` type method
	function(where, name) {
		var orig = [][name];
		DefineList.prototype[name] = function() {
			if (!this._length) {
				// For shift and pop, we just return undefined without
				// triggering events.
				return undefined;
			}

			var args = getArgs(arguments),
				len = where && this._length ? this._length - 1 : 0,
				oldLength = this._length ? this._length : 0,
				res;

			// Call the original method.
			runningNative = true;
			res = orig.apply(this, args);
			runningNative = false;

			// Create a change where the args are
			// `len` - Where these items were removed.
			// `remove` - Items removed.
			// `undefined` - The new values (there are none).
			// `res` - The old, removed values (should these be unbound).
			queues.batch.start();
			this._triggerChange("" + len, "remove", undefined, [ res ]);
			this.dispatch('length', [ this._length, oldLength ]);
			queues.batch.stop();

			return res;
		};
	});

canReflect.eachKey({
	"map": 3,
	/**
	 */
	"filter": 3,
	/**
	 * @function can-define/list/list.prototype.reduce reduce
	 * @description Map the values in this list to a single value
	 *
	 * @signature `list.reduce(callback, initialValue, [, thisArg])`
	 *
	 * Loops through the values of the list, calling `callback` for each one until the list
	 * ends.  The return value of `callback` is passed to the next iteration as the first argument,
	 * and finally returned by `reduce`.
	 *
	 * ```js
	 * var todos = new DefineList([
	 *   {name: "dishes", complete: false},
	 *   {name: "lawn", complete: true}
	 * ]);
	 * var todosAsOneObject = todos.reduce(function(todos, todo){
	 *   todos[todo.name] = todo.complete;
	 *   return todos;
	 * }, {});
	 * todosAsOneObject //-> { dishes: false, lawn: true }
	 * ```
	 *
	 * @param {function(item, index, list)} callback A function to call with each element of the DefineList.
	 * The four parameters that callback gets passed are:
	 *    - current (*) - the current aggregate value of reducing over the list -- the initial value if the first iteration
	 *    - item (*) - the element at index.
	 *    - index (Integer) - the index of the current element of the list.
	 *    - list (DefineList) - the `DefineList` the elements are coming from.
	 *
	 * The return value of `callback` is passed to the next iteration as the first argument, and returned from
	 * `reduce` if the last iteration.
	 *
	 * @param {*} [initialValue] The initial value to use as `current` in the first iteration
	 * @param {Object} [thisArg] The object to use as `this` inside the callback.
	 * @return {*} The result of the final call of `callback` on the list.
	 * @body
	 *
	 */
	"reduce": 4,
	/**
	 * @function can-define/list/list.prototype.reduceRight reduceRight
	 * @description Map the values in this list to a single value from right to left
	 *
	 * @signature `list.reduceRight(callback, initialValue, [, thisArg])`
	 *
	 * Loops through the values of the list in reverse order, calling `callback` for each one until the list
	 * ends.  The return value of `callback` is passed to the next iteration as the first argument,
	 * and finally returned by `reduce`.
	 *
	 * ```js
	 * var todos = new DefineList([
	 *   {name: "dishes", complete: false},
	 *   {name: "lawn", complete: true}
	 * ]);
	 * var todosAsOneObject = todos.reduce(function(todos, todo){
	 *   todos[todo.name] = todo.complete;
	 *   return todos;
	 * }, {});
	 * todosAsOneObject //-> { dishes: false, lawn: true }
	 * ```
	 *
	 * @param {function(item, index, list)} callback A function to call with each element of the DefineList.
	 * The four parameters that callback gets passed are:
	 *    - current (*) - the current aggregate value of reducing over the list -- the initial value if the first iteration
	 *    - item (*) - the element at index.
	 *    - index (Integer) - the index of the current element of the list.
	 *    - list (DefineList) - the `DefineList` the elements are coming from.
	 *
	 * The return value of `callback` is passed to the next iteration as the first argument, and returned from
	 * `reduce` if the last iteration.
	 *
	 * @param {*} [initialValue] The initial value to use as `current` in the first iteration
	 * @param {Object} [thisArg] The object to use as `this` inside the callback.
	 * @return {*} The result of the final call of `callback` on the list.
	 * @body
	 *
	 */
	"reduceRight": 4,
	/**
	 * @function can-define/list/list.prototype.every every
	 *
	 * Return true if every item in a list matches a predicate.
	 *
	 * @signature `list.every( callback [,thisArg] )`
	 *
	 * Tests each item in `list` by calling `callback` on it.  If `callback` returns truthy for every element in
	 * `list`, `every` returns `true`.
	 *
	 * ```
	 * var names = new DefineList(["alice","adam","zack","zeffer"]);
	 * var aNames = names.every(function(name){
	 *   return name[0] === "a"
	 * });
	 * aNames //-> false
	 * ```
	 *
	 *   @param  {function(*, Number, can-define/list/list)} callback(item, index, list) A
	 *   function to call with each element of the DefineList. The three parameters that callback gets passed are:
	 *    - item (*) - the element at index.
	 *    - index (Integer) - the index of the current element of the list.
	 *    - list (DefineList) - the `DefineList` the elements are coming from.
	 *
	 *   If `callback` returns a truthy result, `every` will evaluate the callback on the next element.  Otherwise, `every`
	 *   will return `false`.
	 *
	 *   @param  {Object}  thisArg  What `this` should be in the `callback`.
	 *   @return {Boolean} `true` if calling the callback on every element in `list` returns a truthy value, `false` otherwise.
	 *
	 * @signature `list.every( props )`
	 *
	 * Tests each item in `list` by comparing its properties to `props`.  If `props` match for every element in
	 * `list`, `every` returns `true`.
	 *
	 * ```
	 * var todos = new DefineList([
	 *   {name: "dishes", complete: false},
	 *   {name: "lawn", complete: true}
	 * ]);
	 * var complete = todos.every({complete: true});
	 * complete //-> false
	 * ```
	 *
	 *    @param  {Object}  props An object of key-value properties.  Each key and value in
	 *    `props` must be present on an `item` for the `item` to match.
	 *    @return {Boolean} `true` if every element in `list` matches `props`, `false` otherwise.
	 */
	"every": 3,
	/**
	 * @function can-define/list/list.prototype.some some
	 *
	 * Return true if at least one item in a list matches a predicate.
	 *
	 * @signature `list.some( callback [,thisArg] )`
	 *
	 * Tests each item in `list` by calling `callback` on it.  If `callback` returns truthy for some element in
	 * `list`, `some` returns `true`.
	 *
	 * ```
	 * var names = new DefineList(["alice","adam","zack","zeffer"]);
	 * var aNames = names.some(function(name){
	 *   return name[0] === "a"
	 * });
	 * aNames //-> false
	 * ```
	 *
	 *   @param  {function(*, Number, can-define/list/list)} callback(item, index, list) A
	 *   function to call with each element of the DefineList. The three parameters that callback gets passed are:
	 *    - item (*) - the element at index.
	 *    - index (Integer) - the index of the current element of the list.
	 *    - list (DefineList) - the DefineList the elements are coming from.
	 *
	 *   If `callback` returns a falsy result, `some` will evaluate the callback on the next element.  Otherwise, `some`
	 *   will return `true`.
	 *
	 *   @param  {Object}  thisArg  What `this` should be in the `callback`.
	 *   @return {Boolean} `false` if calling the callback on some element in `list` returns a falsy value, `true` otherwise.
	 *
	 * @signature `list.some( props )`
	 *
	 * Tests each item in `list` by comparing its properties to `props`.  If `props` match for some element in
	 * `list`, `some` returns `true`.
	 *
	 * ```
	 * var todos = new DefineList([
	 *   {name: "dishes", complete: false},
	 *   {name: "lawn", complete: true}
	 * ]);
	 * var complete = todos.some({complete: true});
	 * complete //-> false
	 * ```
	 *
	 *    @param  {Object}  props An object of key-value properties.  Each key and value in
	 *    `props` must be present on an `item` for the `item` to match.
	 *    @return {Boolean} `false` if every element in `list` fails to match `props`, `true` otherwise
	 */
	"some": 3
},
function a(fnLength, fnName) {
	DefineList.prototype[fnName] = function() {
		var self = this;
		var args = [].slice.call(arguments, 0);
		var callback = args[0];
		var thisArg = args[fnLength - 1] || self;

		if (typeof callback === "object") {
			callback = makeFilterCallback(callback);
		}

		args[0] = function() {
			var cbArgs = [].slice.call(arguments, 0);
			// use .get(index) to ensure observation added.
			// the arguments are (item, index) or (result, item, index)
			cbArgs[fnLength - 3] = self.get(cbArgs[fnLength - 2]);
			return callback.apply(thisArg, cbArgs);
		};
		var ret = Array.prototype[fnName].apply(this, args);

		if(fnName === "map") {
			return new DefineList(ret);
		}
		else if(fnName === "filter") {
			return new self.constructor(ret);
		} else {
			return ret;
		}
	};
});


assign(DefineList.prototype, {
	/**
	 * @function can-define/list/list.prototype.indexOf indexOf
	 * @description Look for an item in a DefineList.
	 * @signature `list.indexOf(item)`
	 *
	 * `indexOf` finds the position of a given item in the DefineList.
	 *
	 * ```
	 * var list = new DefineList(['Alice', 'Bob', 'Eve']);
	 * list.indexOf('Alice');   // 0
	 * list.indexOf('Charlie'); // -1
	 * ```
	 *
	 *   @param {*} item The item to find.
	 *
	 *   @return {Number} The position of the item in the DefineList, or -1 if the item is not found.
	 *
	 * @body
	 *
	 */
	indexOf: function(item, fromIndex) {
		for (var i = fromIndex || 0, len = this.length; i < len; i++) {
			if (this.get(i) === item) {
				return i;
			}
		}
		return -1;
	},

		/**
	 * @function can-define/list/list.prototype.lastIndexOf lastIndexOf
	 * @description Look for an item in a DefineList starting from the end.
	 * @signature `list.lastIndexOf(item)`
	 *
	 * `lastIndexOf` finds the last position of a given item in the DefineList.
	 *
	 * ```
	 * var list = new DefineList(['Alice', 'Bob', 'Alice', 'Eve']);
	 * list.lastIndexOf('Alice');   // 2
	 * list.lastIndexOf('Charlie'); // -1
	 * ```
	 *
	 *   @param {*} item The item to find.
	 *
	 *   @return {Number} The position of the item in the DefineList, or -1 if the item is not found.
	 *
	 * @body
	 *
	 */
	lastIndexOf: function(item, fromIndex) {
		fromIndex = typeof fromIndex === "undefined" ? this.length - 1: fromIndex;
		for (var i = fromIndex; i >= 0; i--) {
			if (this.get(i) === item) {
				return i;
			}
		}
		return -1;
	},

	/**
	 * @function can-define/list/list.prototype.join join
	 * @description Join a DefineList's elements into a string.
	 * @signature `list.join(separator)`
	 *
	 * `join` turns a DefineList into a string by inserting _separator_ between the string representations
	 * of all the elements of the DefineList.
	 *
	 * ```
	 * var list = new DefineList(['Alice', 'Bob', 'Eve']);
	 * list.join(', '); // 'Alice, Bob, Eve'
	 * ```
	 *
	 * @param {String} separator The string to seperate elements.
	 *
	 * @return {String} The joined string.
	 *
	 */
	join: function() {
		ObservationRecorder.add(this, "length");
		return [].join.apply(this, arguments);
	},

	/**
	 * @function can-define/list/list.prototype.reverse reverse
	 * @description Reverse the order of a DefineList.
	 * @signature `list.reverse()`
	 *
	 * Reverses the elements of the DefineList in place.
	 *
	 * ```
	 * var list = new DefineList(['Alice', 'Bob', 'Eve']);
	 * var reversedList = list.reverse();
	 *
	 * reversedList; //-> DefineList['Eve', 'Bob', 'Alice'];
	 * list === reversedList; // true
	 * ```
	 *
	 * @return {can-define/list/list} The DefineList, for chaining.
	 *
	 * @body
	 *
	 */
	reverse: function() {
		// this shouldn't be observable
		var list = [].reverse.call(this._items());
		return this.replace(list);
	},

	/**
	 * @function can-define/list/list.prototype.slice slice
	 * @description Make a copy of a part of a DefineList.
	 * @signature `list.slice([start[, end]])`
	 *
	 * `slice` creates a copy of a portion of the DefineList.
	 *
	 * ```js
	 * var list = new DefineList(['Alice', 'Bob', 'Charlie', 'Daniel', 'Eve']);
	 * var newList = list.slice(1, 4);
	 * newList //-> DefineList['Bob', 'Charlie', 'Daniel']
	 * ```
	 *
	 * @param {Number} [start=0] The index to start copying from. Defaults to `0`.
	 *
	 * @param {Number} [end] The first index not to include in the copy
	 * If _end_ is not supplied, `slice` will copy until the end of the list.
	 *
	 * @return {can-define/list/list} A new `DefineList` with the extracted elements.
	 *
	 * @body
	 *
	 * ## Use
	 *
	 * `slice` is the simplest way to copy a DefineList:
	 *
	 * ```
	 * var list = new DefineList(['Alice', 'Bob', 'Eve']);
	 * var copy = list.slice();
	 *
	 * copy           //-> DefineList['Alice', 'Bob', 'Eve']
	 * list === copy; //-> false
	 * ```
	 */
	slice: function() {
		// tells computes to listen on length for changes.
		ObservationRecorder.add(this, "length");
		var temp = Array.prototype.slice.apply(this, arguments);
		return new this.constructor(temp);
	},

	/**
	 * @function can-define/list/list.prototype.concat concat
	 * @description Merge many collections together into a DefineList.
	 * @signature `list.concat(...args)`
	 *
	 * Returns a `DefineList` with the `list`'s items and the additional `args`.
	 *
	 * @param {Array|can-define/list/list|*} args Any number of arrays, Lists, or values to add in
	 * For each parameter given, if it is an Array or a DefineList, each of its elements will be added to
	 * the end of the concatenated DefineList. Otherwise, the parameter itself will be added.
	 *
	 * @return {can-define/list/list} A DefineList of the same type.
	 *
	 * @body
	 *
	 * ## Use
	 *
	 * `concat` makes a new DefineList with the elements of the DefineList followed by the elements of the parameters.
	 *
	 * ```
	 * var list = new DefineList();
	 * var newList = list.concat(
	 *     'Alice',
	 *     ['Bob', 'Charlie']),
	 *     new DefineList(['Daniel', 'Eve']),
	 *     {f: 'Francis'}
	 * );
	 * newList.get(); // ['Alice', 'Bob', 'Charlie', 'Daniel', 'Eve', {f: 'Francis'}]
	 * ```
	 */
	concat: function() {
		var args = [];
		// Go through each of the passed `arguments` and
		// see if it is list-like, an array, or something else
		canReflect.eachIndex(arguments, function(arg) {
			if (canReflect.isListLike(arg)) {
				// If it is list-like we want convert to a JS array then
				// pass each item of the array to this.__type
				var arr = Array.isArray(arg) ? arg : canReflect.toArray(arg);
				arr.forEach(function(innerArg) {
					args.push(this.__type(innerArg));
				}, this);
			} else {
				// If it is a Map, Object, or some primitive
				// just pass arg to this.__type
				args.push(this.__type(arg));
			}
		}, this);

		// We will want to make `this` list into a JS array
		// as well (We know it should be list-like), then
		// concat with our passed in args, then pass it to
		// list constructor to make it back into a list
		return new this.constructor(Array.prototype.concat.apply(canReflect.toArray(this), args));
	},

	/**
	 * @function can-define/list/list.prototype.forEach forEach
	 * @description Call a function for each element of a DefineList.
	 * @signature `list.forEach(callback[, thisArg])`
	 *
	 * Loops through the values of the list, calling `callback` for each one until the list ends
	 * or `false` is returned.
	 *
	 * ```
	 * list.forEach(function(item, index, list){ ... })
	 * ```
	 *
	 * @param {function(item, index, list)} callback A function to call with each element of the DefineList.
	 * The three parameters that callback gets passed are:
	 *    - item - the element at index.
	 *    - index - the current element of the list.
	 *    - list - the DefineList the elements are coming from.
	 *
	 * If the callback returns `false` the looping stops.
	 *
	 * @param {Object} [thisArg] The object to use as `this` inside the callback.
	 * @return {can-define/list/list} The list instance.
	 * @body
	 *
	 * ## Use
	 *
	 * `forEach` calls a callback for each element in the DefineList.
	 *
	 * ```
	 * var list = new DefineList([1, 2, 3]);
	 * list.forEach(function(element, index, list) {
	 *     list.get(index, element * element);
	 * });
	 * list.get(); // [1, 4, 9]
	 * ```
	 */
	forEach: function(cb, thisarg) {
		var item;
		for (var i = 0, len = this.length; i < len; i++) {
			item = this.get(i);
			if (cb.call(thisarg || item, item, i, this) === false) {
				break;
			}
		}
		return this;
	},

	/**
	 * @function can-define/list/list.prototype.replace replace
	 * @description Replace all the elements of a DefineList.
	 * @signature `list.replace(collection)`
	 *
	 * Replaces every item in the list with `collection`.
	 *
	 * ```
	 * var names = new DefineList(["alice","adam","eve"]);
	 * names.replace(["Justin","Xena"]);
	 * names //-> DefineList["Justin","Xena"]
	 * ```
	 *
	 * @param {Array|can-define/list/list} collection The collection of items that will be in `list`.
	 * @return {can-define/list/list} Returns the `list`.
	 *
	 * @body
	 *
	 * ## Use
	 *
	 * `replace` is essentially a shortcut for [can-define/list/list.prototype.splice].
	 *
	 * ## Events
	 *
	 * `replace` causes _remove_, _add_, and _length_ events.
	 */
	replace: function(newList) {
		var patches = diff(this, newList);

		queues.batch.start();
		for (var i = 0, len = patches.length; i < len; i++) {
			this.splice.apply(this, [
				patches[i].index,
				patches[i].deleteCount
			].concat(patches[i].insert));
		}
		queues.batch.stop();

		return this;
	},
	/**
	 * @function can-define/list/list.prototype.sort sort
	 * @description Sort the properties of a list.
	 *
	 * @signature `list.sort([compareFunction])`
	 *
	 * Sorts the elements of a list in place and returns the list. The API is the
	 * same as the native JavaScript `Array.prototype.sort` API.
	 *
	 * ```js
	 * var accounts = new Account.List([
	 *   { name: "Savings", amount: 20.00 },
	 *   { name: "Checking", amount: 103.24 },
	 *   { name: "Kids Savings", amount: 48155.13 }
	 * ]);
	 * accounts.sort(function(a, b){
	 *   if (a.name < b.name) {
	 *     return -1;
	 *   } else if (a.name > b.name){
	 *     return 1;
	 *   } else {
	 *     return 0;
	 *   }
	 * });
	 * accounts[0].name === "Checking"
	 * accounts[1].name === "Kids Savings"
	 * accounts[2].name === "Savings"
	 * ```
	 *
	 * @param {function(a, b)} compareFunction Specifies a function that defines the sort order.
	 *
	 * If `compareFunction` is supplied, the list elements are sorted according to the return
	 * value of the compare function. If `a` and `b` are two elements being compared, then:
	 *
	 *  - If `compareFunction(a, b)` returns a value less than 0, `a` will be sorted to
	 *  a lower index than `b`, so `a` will now come first.
	 *  - If `compareFunction(a, b)` returns 0, the order of the two values will not be changed.
	 *  - If `compareFunction(a, b)` returns a value greater than 0, `a` will be sorted to
	 *  a higher index than `b`, so `b` will now come first.
	 *
	 * @return {can-define/list/list} The list instance.
	 * @body
	 * ```
	 */
	sort: function(compareFunction) {
		var sorting = Array.prototype.slice.call(this);
		Array.prototype.sort.call(sorting, compareFunction);
		this.splice.apply(this, [0,sorting.length].concat(sorting) );
		return this;
	}
});


// Add necessary event methods to this object.
for (var prop in define.eventsProto) {
	DefineList[prop] = define.eventsProto[prop];
	Object.defineProperty(DefineList.prototype, prop, {
		enumerable: false,
		value: define.eventsProto[prop],
		writable: true
	});
}

Object.defineProperty(DefineList.prototype, "length", {
	get: function() {
		if (!this.__inSetup) {
			ObservationRecorder.add(this, "length");
		}
		return this._length;
	},
	set: function(newVal) {
		if (runningNative) {
			this._length = newVal;
			return;
		}

		// Don't set _length if:
		//  - null or undefined
		//  - a string that doesn't convert to number
		//  - already the length being set
		if (newVal == null || isNaN(+newVal) || newVal === this._length) {
			return;
		}

		if (newVal > this._length - 1) {
			var newArr = new Array(newVal - this._length);
			this.push.apply(this, newArr);
		}
		else {
			this.splice(newVal);
		}
	},
	enumerable: true
});

DefineList.prototype.attr = function(prop, value) {
	canLog.warn("DefineMap::attr shouldn't be called");
	if (arguments.length === 0) {
		return this.get();
	} else if (prop && typeof prop === "object") {
		return this.set.apply(this, arguments);
	} else if (arguments.length === 1) {
		return this.get(prop);
	} else {
		return this.set(prop, value);
	}
};
DefineList.prototype.item = function(index, value) {
	if (arguments.length === 1) {
		return this.get(index);
	} else {
		return this.set(index, value);
	}
};
DefineList.prototype.items = function() {
	canLog.warn("DefineList::get should should be used instead of DefineList::items");
	return this.get();
};

var defineListProto = {
	// type
	"can.isMoreListLikeThanMapLike": true,
	"can.isMapLike": true,
	"can.isListLike": true,
	"can.isValueLike": false,
	// get/set
	"can.getKeyValue": DefineList.prototype.get,
	"can.setKeyValue": DefineList.prototype.set,

	// Called for every reference to a property in a template
	// if a key is a numerical index then translate to length event
	"can.onKeyValue": function(key, handler, queue) {
		var translationHandler;
		if (isNaN(key)) {
			return onKeyValue.apply(this, arguments);
		}
		else {
			translationHandler = function() {
				handler(this[key]);
			};
			//!steal-remove-start
			if(process.env.NODE_ENV !== 'production') {
				Object.defineProperty(translationHandler, "name", {
					value: "translationHandler(" + key + ")::" + canReflect.getName(this) + ".onKeyValue('length'," + canReflect.getName(handler) + ")",
				});
			}
			//!steal-remove-end
			singleReference.set(handler, this, translationHandler, key);
			return onKeyValue.call(this, 'length',  translationHandler, queue);
		}
	},
	// Called when a property reference is removed
	"can.offKeyValue": function(key, handler, queue) {
		var translationHandler;
		if ( isNaN(key)) {
			return offKeyValue.apply(this, arguments);
		}
		else {
			translationHandler = singleReference.getAndDelete(handler, this, key);
			return offKeyValue.call(this, 'length',  translationHandler, queue);
		}
	},

	"can.deleteKeyValue": function(prop) {
		// convert string key to number index if key can be an integer:
		//   isNaN if prop isn't a numeric representation
		//   (prop % 1) if numeric representation is a float
		//   In both of the above cases, leave as string.
		prop = isNaN(+prop) || (prop % 1) ? prop : +prop;
		if(typeof prop === "number") {
			this.splice(prop, 1);
		} else if(prop === "length" || prop === "_length") {
			return; // length must not be deleted
		} else {
			this.set(prop, undefined);
		}
		return this;
	},
	// shape get/set
	"can.assignDeep": function(source){
		queues.batch.start();
		canReflect.assignList(this, source);
		queues.batch.stop();
	},
	"can.updateDeep": function(source){
		queues.batch.start();
		this.replace(source);
		queues.batch.stop();
	},

	// observability
	"can.keyHasDependencies": function(key) {
		return !!(this._computed && this._computed[key] && this._computed[key].compute);
	},
	"can.getKeyDependencies": function(key) {
		var ret;
		if(this._computed && this._computed[key] && this._computed[key].compute) {
			ret = {};
			ret.valueDependencies = new Set([
				this._computed[key].compute
			]);
		}
		return ret;
	},
	/*"can.onKeysAdded": function(handler,queue) {
		this[canSymbol.for("can.onKeyValue")]("add", handler,queue);
	},
	"can.onKeysRemoved": function(handler,queue) {
		this[canSymbol.for("can.onKeyValue")]("remove", handler,queue);
	},*/
	"can.splice": function(index, deleteCount, insert){
		this.splice.apply(this, [index, deleteCount].concat(insert));
	},
	"can.onPatches": function(handler,queue){
		this[canSymbol.for("can.onKeyValue")](localOnPatchesSymbol, handler,queue);
	},
	"can.offPatches": function(handler,queue) {
		this[canSymbol.for("can.offKeyValue")](localOnPatchesSymbol, handler,queue);
	}
};

//!steal-remove-start
if(process.env.NODE_ENV !== 'production') {
	defineListProto["can.getName"] = function() {
		return canReflect.getName(this.constructor) + "[]";
	};
}
//!steal-remove-end

canReflect.assignSymbols(DefineList.prototype, defineListProto);

canReflect.setKeyValue(DefineList.prototype, canSymbol.iterator, function() {
	var index = -1;
	if(typeof this.length !== "number") {
		this.length = 0;
	}
	return {
		next: function() {
			index++;
			return {
				value: this[index],
				done: index >= this.length
			};
		}.bind(this)
	};
});

//!steal-remove-start
if(process.env.NODE_ENV !== 'production') {
	// call `list.log()` to log all event changes
	// pass `key` to only log the matching event, e.g: `list.log("add")`
	DefineList.prototype.log = defineHelpers.log;
}
//!steal-remove-end

define.DefineList = DefineList;

module.exports = ns.DefineList = DefineList;
