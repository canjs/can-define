var Construct = require("can-construct");
var define = require("can-define");
var make = define.make;
var canEvent = require("can-event");
var canBatch = require("can-event/batch/batch");
var Observation = require("can-observation");
var canLog = require("can-util/js/log/log");

var defineHelpers = require("../define-helpers/define-helpers");

var assign = require("can-util/js/assign/assign");
var diff = require("can-util/js/diff/diff");
var each = require("can-util/js/each/each");
var isArray = require("can-util/js/is-array/is-array");
var makeArray = require("can-util/js/make-array/make-array");
var types = require("can-types");
var ns = require("can-namespace");

var splice = [].splice;
var runningNative = false;

var identity = function(x) {
	return x;
};

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
/** @add can-define/list/list */
var DefineList = Construct.extend("DefineList",
	/** @static */
	{
		setup: function(base) {
			if (DefineList) {

				var prototype = this.prototype;
				var result = define(prototype, prototype, base.prototype._define);
				var itemsDefinition = result.definitions["#"] || result.defaultDefinition;

				if (itemsDefinition) {
					if (itemsDefinition.Type) {
						this.prototype.__type = make.set.Type("*", itemsDefinition.Type, identity);
					} else if (itemsDefinition.type) {
						this.prototype.__type = make.set.type("*", itemsDefinition.type, identity);
					}
				}
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
						definitions: {}
					}
				});
				Object.defineProperty(this, "_data", {
					enumerable: false,
					value: {}
				});
			}
			define.setup.call(this, {}, false);
			this._length = 0;
			if (items) {
				this.splice.apply(this, [ 0, 0 ].concat(defineHelpers.toObject(this, items, [], DefineList)));
			}
		},
		__type: define.types.observable,
		_triggerChange: function(attr, how, newVal, oldVal) {

			var index = +attr;
			// `batchTrigger` direct add and remove events...

			// Make sure this is not nested and not an expando
			if (!~("" + attr).indexOf('.') && !isNaN(index)) {
				var itemsDefinition = this._define.definitions["#"];

				if (how === 'add') {
					if (itemsDefinition && typeof itemsDefinition.added === 'function') {
						Observation.ignore(itemsDefinition.added).call(this, newVal, index);
					}
					canEvent.dispatch.call(this, how, [ newVal, index ]);
				} else if (how === 'remove') {
					if (itemsDefinition && typeof itemsDefinition.removed === 'function') {
						Observation.ignore(itemsDefinition.removed).call(this, oldVal, index);
					}
					canEvent.dispatch.call(this, how, [ oldVal, index ]);
				} else {
					canEvent.dispatch.call(this, how, [ newVal, index ]);
				}
			} else {
				canEvent.dispatch.call(this, {
					type: "" + attr,
					target: this
				}, [ newVal, oldVal ]);
			}

		},
		/**
		 * @function can-define/list/list.prototype.get get
		 * @parent can-define/list/list.prototype
		 *
		 * Gets an item or all items from a DefineList.
		 *
		 * @signature `list.get()`
		 *
		 * Returns the list converted into a plain JS array. Any items that also have a
		 * `get` method will have their `get` method called and the resulting value will be used as item value.
		 *
		 * This can be used to recursively convert a list instance to an Array of other plain JavaScript objects.
		 * Cycles are supported and only create one object.
		 *
		 * `get()` can still return other non-plain JS objects like Dates.
		 * Use [can-define/map/map.prototype.serialize] when a form proper for `JSON.stringify` is needed.
		 *
		 * ```js
		 * var list = new DefineList(["A","B"]);
		 * list.get() //-> ["A","B"]
		 * ```
		 *
		 *   @return {Array} A plain JavaScript `Array` that contains each item in the list.
		 *
		 * @signature `list.get(index)`
		 *
		 * Gets the item at `index`. `list.get(index)` should be used instead of
		 * `list[index]` if the list's items are going to be updated via [can-define/list/list.prototype.set list.set(index, value)]
		 * (as opposed to [can-define/list/list.prototype.splice] which is the better way).
		 *
		 * ```js
		 * var list = new DefineList(["A","B"]);
		 * list.get(1) //-> "B"
		 * ```
		 *
		 *   @param {Number} index A numeric position in the list.
		 *
		 *   @return {*} The value at index.
		 *
		 * @signature `list.get(prop)`
		 *
		 * Gets the property at `prop` if it might not have already been defined.
		 *
		 *
		 * ```js
		 * var list = new DefineList(["A","B"]);
		 * list.set("count",1000)
		 * list.get("count") //-> 1000
		 * ```
		 *
		 *   @param {String} prop A property on the list.
		 *
		 *   @return {*} The value at `prop`.
		 */
		get: function(index) {
			if (arguments.length) {
				Observation.add(this, "" + index);
				return this[index];
			} else {
				return defineHelpers.serialize(this, 'get', []);
			}
		},
		/**
		 * @function can-define/list/list.prototype.set set
		 * @parent can-define/list/list.prototype
		 *
		 * Sets an item or property or items or properties on a list.
		 *
		 * @signature `list.set(prop, value)`
		 *
		 * Sets the property at `prop`. This should be used when the property
		 * isn't already defined.
		 *
		 * ```js
		 * var list = new DefineList(["A","B"]);
		 * list.set("count",1000);
		 * list.get("count") //-> 1000;
		 * ```
		 *
		 *   @param {Number} prop A property name.
		 *   @param {*} value The value to add to the list.
		 *   @return {can-define/list/list} The list instance.
		 *
		 * @signature `list.set(newProps)`
		 *
		 * Updates the properties on the list with `newProps`.
		 *
		 * ```js
		 * var list = new DefineList(["A","B"]);
		 * list.set({count: 1000, skip: 2});
		 * list.get("count") //-> 1000
		 * ```
		 *
		 *   @param {Object} newProps An object of properties and values to set on the list.
		 *   @return {can-define/list/list} The list instance.
		 *
		 * @signature `list.set(index, value)`
		 *
		 * Sets the item at `index`.  Typically, [can-define/list/list::splice] should be used instead.
		 *
		 * ```js
		 * var list = new DefineList(["A","B"]);
		 * list.set(2,"C");
		 * ```
		 *
		 *   @param {Number} index A numeric position in the list.
		 *   @param {*} value The value to add to the list.
		 *   @return {can-define/list/list} The list instance.
		 *
		 * @signature `list.set(newItems [,replaceAll])`
		 *
		 * Replaces items in the list with `newItems`
		 *
		 * ```js
		 * var list = new DefineList(["A","B"]);
		 * list.set(["c"])        //-> DefineList["c","B"]
		 * list.set(["x"], true)  //-> DefineList["x"]
		 * ```
		 *
		 *   @param {Array} newItems Items used to replace existing items in the list.
		 *   @param {Boolean} [replaceAll] If true, will remove items at the end of the list.
		 *   @return {can-define/list/list} The list instance.
		 */
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
				if (isArray(prop)) {
					if (value) {
						this.replace(prop);
					} else {
						this.splice.apply(this, [ 0, prop.length ].concat(prop));
					}
				} else {
					each(prop, function(value, prop) {
						this.set(prop, value);
					}, this);
				}
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

		/**
		 * @function can-define/list/list.prototype.splice splice
		 * @parent can-define/list/list.prototype
		 * @description Insert and remove elements from a DefineList.
		 * @signature `list.splice(index[, howMany[, ...newItems]])`
		 *
		 * Removes `howMany` items at `index` and adds `newItems` in their place.
		 *
		 *
		 *
		 * @param {Number} index Where to start removing or inserting elements.
		 *
		 * @param {Number} [howMany] The number of elements to remove
		 * If _howMany_ is not provided, `splice` will remove all elements from `index` to the end of the DefineList.
		 *
		 * @param {*} newItems Items to insert into the DefineList
		 *
		 * @return {Array} The elements removed by `splice`.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * `splice` lets you remove elements from and insert elements into a DefineList.
		 *
		 * This example demonstrates how to do surgery on a list of numbers:
		 *
		 * ```
		 * var list = new DefineList([0, 1, 2, 3]);
		 *
		 * // starting at index 2, remove one element and insert 'Alice' and 'Bob':
		 * list.splice(2, 1, 'Alice', 'Bob');
		 * list.get(); // [0, 1, 'Alice', 'Bob', 3]
		 * ```
		 *
		 * ## Events
		 *
		 * `splice` causes the DefineList it's called on to emit
		 * _add_ events, _remove_ events, and _length_ events. If there are
		 * any elements to remove, a _remove_ event, and a
		 * _length_ event will be fired. If there are any elements to insert, a
		 * separate _add_ event, and a separate _length_ event
		 * will be fired.
		 *
		 */
		splice: function(index, howMany) {
			var args = makeArray(arguments),
				added = [],
				i, len, listIndex,
				allSame = args.length > 2;

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

			canBatch.start();
			if (howMany > 0) {
				// tears down bubbling
				this._triggerChange("" + index, "remove", undefined, removed);
			}
			if (args.length > 2) {
				this._triggerChange("" + index, "add", added, removed);
			}

			canEvent.dispatch.call(this, 'length', [ this._length ]);

			canBatch.stop();
			return removed;
		},

		/**
		 * @function can-define/list/list.prototype.serialize serialize
		 * @parent can-define/list/list.prototype
		 *
		 * Returns the a serialized version of this list.
		 *
		 * @signature `list.serialize()`
		 *
		 * Goes through each item in the list and gets its serialized
		 * value and returns them in a plain Array.
		 *
		 * Each items serialized value is the result of calling `.serialize()`
		 * on the item or if the item doesn't have a `serialize` method,
		 * the item itself.
		 *
		 * ```
		 * var list = new DefineList(["first", {foo: "bar"}]);
		 * var serializedList = list.serialize();
		 *
		 * serializedList //-> ["first", {foo: "bar"}]
		 * ```
		 *
		 *   @return {Array} An array with each item's serialied value.
		 */
		serialize: function() {
			return defineHelpers.serialize(this, 'serialize', []);
		}
	});

// Converts to an `array` of arguments.
var getArgs = function(args) {
	return args[0] && Array.isArray(args[0]) ?
		args[0] :
		makeArray(args);
};
// Create `push`, `pop`, `shift`, and `unshift`
each({
		/**
		 * @function can-define/list/list.prototype.push push
		 * @description Add elements to the end of a list.
		 * @signature `list.push(...elements)`
		 *
		 * `push` adds elements onto the end of a DefineList.
		 *
		 * ```
		 * var names = new DefineList(['Alice']);
		 * names.push('Bob', 'Eve');
		 * names //-> DefineList['Alice','Bob', 'Eve']
		 * ```
		 *
		 *   @param {*} elements the elements to add to the DefineList
		 *
		 *   @return {Number} the new length of the DefineList
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * `push` adds elements onto the end of a DefineList here is an example:
		 *
		 * ```
		 * var list = new DefineList(['Alice']);
		 *
		 * list.push('Bob', 'Eve');
		 * list.get(); // ['Alice', 'Bob', 'Eve']
		 * ```
		 *
		 * If you have an array you want to concatenate to the end
		 * of the DefineList, you can use `apply`:
		 *
		 * ```
		 * var names = ['Bob', 'Eve'],
		 *     list = new DefineList(['Alice']);
		 *
		 * list.push.apply(list, names);
		 * list.get(); // ['Alice', 'Bob', 'Eve']
		 * ```
		 *
		 * ## Events
		 *
		 * `push` causes _add_, and _length_ events to be fired.
		 *
		 * ## See also
		 *
		 * `push` has a counterpart in [can-define/list/list::pop pop], or you may be
		 * looking for [can-define/list/list::unshift unshift] and its counterpart [can-define/list/list::shift shift].
		 */
	push: "length",
		/**
		 * @function can-define/list/list.prototype.unshift unshift
		 * @description Add items to the beginning of a DefineList.
		 * @signature `list.unshift(...items)`
		 *
		 * `unshift` adds items onto the beginning of a DefineList.
		 *
		 * ```
		 * var list = new DefineList(['Alice']);
		 *
		 * list.unshift('Bob', 'Eve');
		 * list; // DefineList['Bob', 'Eve', 'Alice']
		 * ```
		 *
		 * @param {*} items The items to add to the DefineList.
		 *
		 * @return {Number} The new length of the DefineList.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 *
		 *
		 * If you have an array you want to concatenate to the beginning
		 * of the DefineList, you can use `apply`:
		 *
		 * ```
		 * var names = ['Bob', 'Eve'],
		 *     list = new DefineList(['Alice']);
		 *
		 * list.unshift.apply(list, names);
		 * list.get(); // ['Bob', 'Eve', 'Alice']
		 * ```
		 *
		 * ## Events
		 *
		 * `unshift` causes _add_ and _length_ events to be fired.
		 *
		 * ## See also
		 *
		 * `unshift` has a counterpart in [can-define/list/list::shift shift], or you may be
		 * looking for [can-define/list/list::push push] and its counterpart [can-define/list/list::pop pop].
		 */
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
				canBatch.start();
				this._triggerChange("" + len, "add", args, undefined);
				canEvent.dispatch.call(this, 'length', [ this._length ]);
				canBatch.stop();
			}

			return res;
		};
	});

each({
		/**
		 * @function can-define/list/list.prototype.pop pop
		 * @description Remove an element from the end of a DefineList.
		 * @signature `list.pop()`
		 *
		 * `pop` removes an element from the end of a DefineList.
		 *
		 * ```js
		 * var names = new DefineList(['Alice', 'Bob', 'Eve']);
		 * names.pop() //-> 'Eve'
		 * ```
		 *
		 *   @return {*} The element just popped off the DefineList, or `undefined` if the DefineList was empty
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * `pop` is the opposite action from [can-define/list/list::push push]:
		 *
		 * ```
		 * var list = new DefineList(['Alice', 'Bob', 'Eve']);
		 *
		 * list.pop(); // 'Eve'
		 * list.pop(); // 'Bob'
		 * list.pop(); // 'Alice'
		 * list.pop(); // undefined
		 * ```
		 *
		 * ## Events
		 *
		 * `pop` causes _remove_ and _length_ events to be fired if the DefineList is not empty
		 * when it is called.
		 *
		 * ## See also
		 *
		 * `pop` has its counterpart in [can-define/list/list::push push], or you may be
		 * looking for [can-define/list/list::unshift unshift] and its counterpart [can-define/list/list::shift shift].
		 */
	pop: "length",
		/**
		 * @function can-define/list/list.prototype.shift shift
		 * @description Remove an item from the front of a list.
		 * @signature `list.shift()`
		 *
		 * `shift` removes an element from the beginning of a DefineList.
		 *
		 * ```
		 * var list = new DefineList(['Alice','Adam']);
		 * list.shift(); //-> 'Alice'
		 * list.shift(); //-> 'Adam'
		 * list.shift(); //-> undefined
		 * ```
		 *
		 * @return {*} The element just shifted off the DefineList, or `undefined` if the DefineList is empty
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * `shift` is the opposite action from `[can-define/list/list::unshift unshift]`:
		 *
		 * ## Events
		 *
		 * `pop` causes _remove_ and _length_ events to be fired if the DefineList is not empty
		 * when it is called.
		 *
		 * ## See also
		 *
		 * `shift` has a counterpart in [can-define/list/list::unshift unshift], or you may be
		 * looking for [can-define/list/list::push push] and its counterpart [can-define/list/list::pop pop].
		 */
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
			canBatch.start();
			this._triggerChange("" + len, "remove", undefined, [ res ]);
			canEvent.dispatch.call(this, 'length', [ this._length ]);
			canBatch.stop();

			return res;
		};
	});

each({
	/**
	 * @function can-define/list/list.prototype.map map
	 * @description Map the values in this list to another list.
	 *
	 * @signature `list.map(callback[, thisArg])`
	 *
	 * Loops through the values of the list, calling `callback` for each one until the list
	 * ends.  The return values of `callback` are used to populate the returned list.
	 *
	 * ```js
	 * var todos = new DefineList([
	 *   {name: "dishes", complete: false},
	 *   {name: "lawn", complete: true}
	 * ]);
	 * var names = todos.map(function(todo){
	 *   return todo.name;
	 * });
	 * names //-> DefineList["dishes","lawn"]
	 * ```
	 *
	 * @param {function(item, index, list)} callback A function to call with each element of the DefineList.
	 * The three parameters that callback gets passed are:
	 *    - item (*) - the element at index.
	 *    - index (Integer) - the index of the current element of the list.
	 *    - list (DefineList) - the `DefineList` the elements are coming from.
	 *
	 * The return value of `callback`, including `undefined` values are used to populate the resulting list.
	 *
	 * @param {Object} [thisArg] The object to use as `this` inside the callback.
	 * @return {can-define/list/list} a new `DefineList` with the results of the map transform.
	 * @body
	 *
	 */
	"map": 3,
	/**
	 * @function can-define/list/list.prototype.filter filter
	 *
	 * Filter a list to a new list of the matched items.
	 *
	 * @signature `list.filter( callback [,thisArg] )`
	 *
	 * Filters `list` based on the return value of `callback`.
	 *
	 * ```
	 * var names = new DefineList(["alice","adam","zack","zeffer"]);
	 * var aNames = names.filter(function(name){
	 *   return name[0] === "a"
	 * });
	 * aNames //-> DefineList["alice","adam"]
	 * ```
	 *
	 *   @param  {function(*, Number, can-define/list/list)} callback(item, index, list) A
	 *   function to call with each element of the DefineList. The three parameters that callback gets passed are:
	 *    - item (*) - the element at index.
	 *    - index (Integer) - the index of the current element of the list.
	 *    - list (DefineList) - the `DefineList` the elements are coming from.
	 *
	 *   If `callback` returns a truthy result, `item` will be added to the result.  Otherwise, the `item` will be
	 *   excluded.
	 *
	 *   @param  {Object}  thisArg  What `this` should be in the `callback`.
	 *   @return {can-define/list/list} A new instance of this `DefineList` (may be a subclass), containing the items that passed the filter.
	 *
	 * @signature `list.filter( props )`
	 *
	 * Filters items in `list` based on the property values in `props`.
	 *
	 * ```
	 * var todos = new DefineList([
	 *   {name: "dishes", complete: false},
	 *   {name: "lawn", complete: true}
	 * ]);
	 * var complete = todos.filter({complete: true});
	 * complete //-> DefineList[{name: "lawn", complete: true}]
	 * ```
	 *
	 *    @param  {Object}  props An object of key-value properties.  Each key and value in
	 *    `props` must be present on an `item` for the `item` to be in the returned list.
	 *    @return {can-define/list/list} A new `DefineList` of the same type.
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
	 *    @return {Boolean} `true` if every element in `list` matches `props`, `false` otherwise
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
		Observation.add(this, "length");
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
		Observation.add(this, "length");
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
		each(arguments, function(arg) {
			if (types.isListLike(arg) || Array.isArray(arg)) {
				// If it is list-like we want convert to a JS array then
				// pass each item of the array to this.__type
				var arr = types.isListLike(arg) ? makeArray(arg) : arg;
				each(arr, function(innerArg) {
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
		return new this.constructor(Array.prototype.concat.apply(makeArray(this), args));
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

		canBatch.start();
		for (var i = 0, len = patches.length; i < len; i++) {
			this.splice.apply(this, [
				patches[i].index,
				patches[i].deleteCount
			].concat(patches[i].insert));
		}
		canBatch.stop();

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
		var removed = Array.prototype.slice.call(this);
		Array.prototype.sort.call(this, compareFunction);
		var added = Array.prototype.slice.call(this);

		canBatch.start();
		canEvent.dispatch.call(this, 'remove', [ removed, 0 ]);
		canEvent.dispatch.call(this, 'add', [ added, 0 ]);
		canEvent.dispatch.call(this, 'length', [ this._length, this._length ]);
		canBatch.stop();
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
			Observation.add(this, "length");
		}
		return this._length;
	},
	set: function(newVal) {
		if (runningNative) {
			this._length = newVal;
			return;
		}

		if (newVal === this._length) {
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

var oldIsListLike = types.isListLike;
types.isListLike = function(obj) {
	return obj instanceof DefineList || oldIsListLike.apply(this, arguments);
};

DefineList.prototype.each = DefineList.prototype.forEach;
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

types.DefineList = DefineList;
types.DefaultList = DefineList;
module.exports = ns.DefineList = DefineList;
