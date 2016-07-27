var Construct = require("can-construct");
var define = require("can-define");
var make = define.make;
var canBatch = require("can-event/batch/batch");
var Observation = require("can-observation");

var defineHelpers = require("../define-helpers/define-helpers");

var assign = require("can-util/js/assign/assign");
var each = require("can-util/js/each/each");
var isArray = require("can-util/js/is-array/is-array");
var makeArray = require("can-util/js/make-array/make-array");
var types = require("can-util/js/types/types");


var splice = [].splice;

var identity = function(x){
    return x;
};

var makeFilterCallback = function(props) {
    return function(item){
        for(var prop in props) {
            if(item[prop] !== props[prop]) {
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
    setup: function(){
        if(DefineList) {
            // remove "*" because it means something else
            var prototype = this.prototype;
            var itemsDefinition = prototype["*"];
            delete prototype["*"];
            define(prototype,  prototype);
            if(itemsDefinition) {
                prototype["*"] = itemsDefinition;
                itemsDefinition = define.getDefinitionOrMethod("*", itemsDefinition, {});

                if(itemsDefinition.Type) {
                    this.prototype.__type = make.set.Type("*",itemsDefinition.Type, identity);
                } else if(itemsDefinition.type) {
                    this.prototype.__type = make.set.type("*",itemsDefinition.type, identity);
                }
            }
        }
    }
},
/** @prototype */
{
    // setup for only dynamic DefineMap instances
    setup: function(items){
        if(!this._define) {
            Object.defineProperty(this,"_define",{
                enumerable: false,
                value: {
                    definitions: {}
                }
            });
            Object.defineProperty(this,"_data",{
                enumerable: false,
                value: {}
            });
        }
        define.setup.call(this, {}, false);
        this._length = 0;
        if(items) {
            this.splice.apply(this, [0,0].concat(defineHelpers.toObject(this, items,[], DefineList)));
        }
    },
    __type: define.types.observable,
    _triggerChange: function (attr, how, newVal, oldVal) {

        canBatch.trigger.call(this, {
            type: ""+attr,
            target: this
        }, [newVal, oldVal]);

        var index = +attr;
        // `batchTrigger` direct add and remove events...

        // Make sure this is not nested and not an expando
        if (!~(""+attr).indexOf('.') && !isNaN(index)) {

            if (how === 'add') {
                canBatch.trigger.call(this, how, [newVal, index]);
                canBatch.trigger.call(this, 'length', [this._length]);
            } else if (how === 'remove') {
                canBatch.trigger.call(this, how, [oldVal, index]);
                canBatch.trigger.call(this, 'length', [this._length]);
            } else {
                canBatch.trigger.call(this, how, [newVal, index]);
            }

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
     * This can be used to recursively convert a list instance to an Array of other plain JavaScript objects. Cycles are supported and only create one object.
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
    get: function(index){
        if(arguments.length) {
            Observation.add(this,""+index);
            return this[index];
        } else {
            return defineHelpers.serialize(this, 'get', []);
        }
    },
    /**
     * @function can-define/list/list.prototype.set set
     * @parent can-define/list/list.prototype
     *
     * @signature `list.set(index, value)`
     *
     * Sets the item at `index`.
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
     *
     * @signature `list.set(prop, value)`
     *
     * Sets the property at `prop`.
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
     */
    set: function(prop, value){
        // if we are setting a single value
        if(typeof prop !== "object") {
            // We want change events to notify using integers if we're
            // setting an integer index. Note that <float> % 1 !== 0;
            prop = isNaN(+prop) || (prop % 1) ? prop : +prop;
            if(typeof prop === "number") {
                // Check to see if we're doing a .attr() on an out of
                // bounds index property.
                if (typeof prop === "number" &&
                    prop > this._length - 1) {
                    var newArr = new Array((prop + 1) - this._length);
                    newArr[newArr.length-1] = value;
                    this.push.apply(this, newArr);
                    return newArr;
                }
                this.splice(prop,1,value);
            } else {
                var defined = defineHelpers.defineExpando(this, prop, value);
                if(!defined) {
                    this[prop] = value;
                }
            }

        }
        // otherwise we are setting multiple
        else {
            if(isArray(prop)) {
                if(value) {
                    this.replace(prop);
                } else {
                    this.splice.apply(this, [0, prop.length].concat(prop) );
                }
            } else {
                each(prop, function(value, prop){
                    this.set(prop, value);
                }, this);
            }
        }
        return this;
    },
    _items: function(){
        var arr = [];
        this._each(function(item){
            arr.push(item);
        });
        return arr;
    },
    _each: function (callback) {
        for (var i = 0, len = this._length; i < len; i++) {
            callback(this[i], i);
        }
    },
    //
    /**
     * @function can-define/list/list.prototype.splice splice
     * @parent can-define/list/list.prototype
     * @description Insert and remove elements from a DefineList.
     * @signature `list.splice(index[, howMany[, ...newElements]])`
     * @param {Number} index where to start removing or inserting elements
     *
     * @param {Number} [howMany] the number of elements to remove
     * If _howMany_ is not provided, `splice` will remove all elements from `index` to the end of the DefineList.
     *
     * @param {*} newElements elements to insert into the DefineList
     *
     * @return {Array} the elements removed by `splice`
     *
     * @body
     * `splice` lets you remove elements from and insert elements into a DefineList.
     *
     * This example demonstrates how to do surgery on a list of numbers:
     *
     * ```
     * var list = new DefineList([0, 1, 2, 3]);
     *
     * // starting at index 2, remove one element and insert 'Alice' and 'Bob':
     * list.splice(2, 1, 'Alice', 'Bob');
     * list.attr(); // [0, 1, 'Alice', 'Bob', 3]
     * ```
     *
     * ## Events
     *
     * `splice` causes the DefineList it's called on to emit _change_ events,
     * _add_ events, _remove_ events, and _length_ events. If there are
     * any elements to remove, a _change_ event, a _remove_ event, and a
     * _length_ event will be fired. If there are any elements to insert, a
     * separate _change_ event, an _add_ event, and a separate _length_ event
     * will be fired.
     *
     * This slightly-modified version of the above example should help
     * make it clear how `splice` causes events to be emitted:
     *
     * ```
     * var list = new DefineList(['a', 'b', 'c', 'd']);
     * list.bind('change', function(ev, attr, how, newVals, oldVals) {
     *     console.log('change: ' + attr + ', ' + how + ', ' + newVals + ', ' + oldVals);
     * });
     * list.bind('add', function(ev, newVals, where) {
     *     console.log('add: ' + newVals + ', ' + where);
     * });
     * list.bind('remove', function(ev, oldVals, where) {
     *     console.log('remove: ' + oldVals + ', ' + where);
     * });
     * list.bind('length', function(ev, length) {
     *     console.log('length: ' + length + ', ' + this.attr());
     * });
     *
     * // starting at index 2, remove one element and insert 'Alice' and 'Bob':
     * list.splice(2, 1, 'Alice', 'Bob'); // change: 2, 'remove', undefined, ['c']
     *                                    // remove: ['c'], 2
     *                                    // length: 5, ['a', 'b', 'Alice', 'Bob', 'd']
     *                                    // change: 2, 'add', ['Alice', 'Bob'], ['c']
     *                                    // add: ['Alice', 'Bob'], 2
     *                                    // length: 5, ['a', 'b', 'Alice', 'Bob', 'd']
     * ```
     *
     * More information about binding to these events can be found under [can-define/list/list.attr attr].
     */
    splice: function (index, howMany) {
        var args = makeArray(arguments),
            added =[],
            i, len, listIndex,
            allSame = args.length > 2;

        index = index || 0;

        // converting the arguments to the right type
        for (i = 0, len = args.length-2; i < len; i++) {
            listIndex = i + 2;
            args[listIndex] = this.__type(args[listIndex], listIndex);
            added.push(args[listIndex]);

            // Now lets check if anything will change
            if(this[i+index] !== args[listIndex]) {
                allSame = false;
            }
        }

        // if nothing has changed, then return
        if(allSame && this._length <= added.length) {
            return added;
        }

        // default howMany if not provided
        if (howMany === undefined) {
            howMany = args[1] = this._length - index;
        }

        var removed = splice.apply(this, args);

        canBatch.start();
        if (howMany > 0) {
            // tears down bubbling
            this._triggerChange("" + index, "remove", undefined, removed);
        }
        if (args.length > 2) {
            this._triggerChange("" + index, "add", added, removed);
        }
        canBatch.stop();
        return removed;
    },
    serialize: function () {
        return defineHelpers.serialize(this, 'serialize', []);
    }
});

// Converts to an `array` of arguments.
var getArgs = function (args) {
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
     * @param {*} elements the elements to add to the DefineList
     *
     * @return {Number} the new length of the DefineList
     *
     * @body
     * `push` adds elements onto the end of a DefineList here is an example:
     *
     * ```
     * var list = new DefineList(['Alice']);
     *
     * list.push('Bob', 'Eve');
     * list.attr(); // ['Alice', 'Bob', 'Eve']
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
     * list.attr(); // ['Alice', 'Bob', 'Eve']
     * ```
     *
     * ## Events
     *
     * `push` causes _change_, _add_, and _length_ events to be fired.
     *
     * ## See also
     *
     * `push` has a counterpart in [can-define/list/list::pop pop], or you may be
     * looking for [can-define/list/list::unshift unshift] and its counterpart [can-define/list/list::shift shift].
     */
    push: "length",
    /**
     * @function can-define/list/list.prototype.unshift unshift
     * @description Add elements to the beginning of a DefineList.
     * @signature `list.unshift(...elements)`
     *
     * `unshift` adds elements onto the beginning of a DefineList.
     *
     * @param {*} elements the elements to add to the DefineList
     *
     * @return {Number} the new length of the DefineList
     *
     * @body
     * `unshift` adds elements to the front of the list in bulk in the order specified:
     *
     * ```
     * var list = new DefineList(['Alice']);
     *
     * list.unshift('Bob', 'Eve');
     * list.attr(); // ['Bob', 'Eve', 'Alice']
     * ```
     *
     * If you have an array you want to concatenate to the beginning
     * of the DefineList, you can use `apply`:
     *
     * ```
     * var names = ['Bob', 'Eve'],
     *     list = new DefineList(['Alice']);
     *
     * list.unshift.apply(list, names);
     * list.attr(); // ['Bob', 'Eve', 'Alice']
     * ```
     *
     * ## Events
     *
     * `unshift` causes _change_, _add_, and _length_ events to be fired.
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
function (where, name) {
    var orig = [][name];
    DefineList.prototype[name] = function () {
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
        res = orig.apply(this, args);

        if (!this.comparator || args.length) {

            this._triggerChange("" + len, "add", args, undefined);
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
     * @return {*} the element just popped off the DefineList, or `undefined` if the DefineList was empty
     *
     * @body
     * `pop` is the opposite action from `[can-define/list/list.push push]`:
     *
     * ```
     * var list = new DefineList(['Alice', 'Bob', 'Eve']);
     * list.attr(); // ['Alice', 'Bob', 'Eve']
     *
     * list.pop(); // 'Eve'
     * list.pop(); // 'Bob'
     * list.pop(); // 'Alice'
     * list.pop(); // undefined
     * ```
     *
     * ## Events
     *
     * `pop` causes _change_, _remove_, and _length_ events to be fired if the DefineList is not empty
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
     * @description Remove en element from the front of a list.
     * @signature `list.shift()`
     *
     * `shift` removes an element from the beginning of a DefineList.
     *
     * @return {*} the element just shifted off the DefineList, or `undefined` if the DefineList is empty
     *
     * @body
     * `shift` is the opposite action from `[can-define/list/list::unshift unshift]`:
     *
     * ```
     * var list = new DefineList(['Alice']);
     *
     * list.unshift('Bob', 'Eve');
     * list.attr(); // ['Bob', 'Eve', 'Alice']
     *
     * list.shift(); // 'Bob'
     * list.shift(); // 'Eve'
     * list.shift(); // 'Alice'
     * list.shift(); // undefined
     * ```
     *
     * ## Events
     *
     * `pop` causes _change_, _remove_, and _length_ events to be fired if the DefineList is not empty
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
function (where, name) {
    DefineList.prototype[name] = function () {
        if (!this._length) {
            // For shift and pop, we just return undefined without
            // triggering events.
            return undefined;
        }

        var args = getArgs(arguments),
            len = where && this._length ? this._length - 1 : 0;

        var res = [][name].apply(this, args);

        // Create a change where the args are
        // `len` - Where these items were removed.
        // `remove` - Items removed.
        // `undefined` - The new values (there are none).
        // `res` - The old, removed values (should these be unbound).
        this._triggerChange("" + len, "remove", undefined, [res]);

        return res;
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
    indexOf: function (item, fromIndex) {
        for(var i = fromIndex || 0, len = this.length; i < len; i++) {
            if(this.get(i) === item) {
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
     * @param {String} separator the string to seperate elements with
     *
     * @return {String} the joined string
     *
     * @body
     * ```
     * var list = new DefineList(['Alice', 'Bob', 'Eve']);
     * list.join(', '); // 'Alice, Bob, Eve'
     *
     * var beatles = new DefineList(['John', 'Paul', 'Ringo', 'George']);
     * beatles.join('&'); // 'John&Paul&Ringo&George'
     * ```
     */
    join: function () {
        Observation.add(this, "length");
        return [].join.apply(this, arguments);
    },

    /**
     * @function can-define/list/list.prototype.reverse reverse
     * @description Reverse the order of a DefineList.
     * @signature `list.reverse()`
     *
     * `reverse` reverses the elements of the DefineList in place.
     *
     * @return {can-define/list/list} the DefineList, for chaining
     *
     * @body
     * ```
     * var list = new DefineList(['Alice', 'Bob', 'Eve']);
     * var reversedList = list.reverse();
     *
     * reversedList.attr(); // ['Eve', 'Bob', 'Alice'];
     * list === reversedList; // true
     * ```
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
     * @param {Number} [start=0] the index to start copying from
     *
     * @param {Number} [end] the first index not to include in the copy
     * If _end_ is not supplied, `slice` will copy until the end of the list.
     *
     * @return {can-define/list/list} a new `DefineList` with the extracted elements
     *
     * @body
     * ```
     * var list = new DefineList(['Alice', 'Bob', 'Charlie', 'Daniel', 'Eve']);
     * var newList = list.slice(1, 4);
     * newList.attr(); // ['Bob', 'Charlie', 'Daniel']
     * ```
     *
     * `slice` is the simplest way to copy a DefineList:
     *
     * ```
     * var list = new DefineList(['Alice', 'Bob', 'Eve']);
     * var copy = list.slice();
     *
     * copy.attr();   // ['Alice', 'Bob', 'Eve']
     * list === copy; // false
     * ```
     */
    slice: function () {
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
    concat: function () {
        var args = [];
        each(makeArray(arguments), function (arg, i) {
            args[i] = arg instanceof DefineList ? arg.get() : arg;
        });
        return new this.constructor(Array.prototype.concat.apply(this.get(), args));
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
     * list.each(function(item, index, list){ ... })
     * ```
     *
     * @param {function(item, index, list)} callback A function to call with each element of the DefineList
     * The three parameters that _callback_ gets passed are _element_, the element at _index_, _index_ the
     * current element of the list, and _list_ the DefineList the elements are coming from.
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
    forEach: function (cb, thisarg) {
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
     * @param {Array|can-define/list/list|can.Deferred} collection the collection of new elements to use
     * If a [can.Deferred] is passed, it must resolve to an `Array` or `DefineList`.
     * The elements of the list are not actually removed until the Deferred resolves.
     *
     * @body
     * `replace` replaces all the elements of this DefineList with new ones.
     *
     * `replace` is especially useful when `DefineList`s are live-bound into `[can.Control]`s,
     * and you intend to populate them with the results of a `[can.Model]` call:
     *
     * ```
     * can.Control({
     *     init: function() {
     *         this.list = new Todo.DefineList();
     *         // live-bind the list into the DOM
     *         this.element.html(can.view('list.stache', this.list));
     *         // when this AJAX call returns, the live-bound DOM will be updated
     *         this.list.replace(Todo.findAll());
     *     }
     * });
     * ```
     *
     * Learn more about [can.Model.DefineList making Lists of models].
     *
     * ## Events
     *
     * A major difference between `replace` and `attr(newElements, true)` is that `replace` always emits
     * an _add_ event and a _remove_ event, whereas `attr` will cause _set_ events along with an _add_ or _remove_
     * event if needed. Corresponding _change_ and _length_ events will be fired as well.
     *
     * The differences in the events fired by `attr` and `replace` are demonstrated concretely by this example:
     * ```
     * var attrList = new DefineList(['Alexis', 'Bill']);
     * attrList.bind('change', function(ev, index, how, newVals, oldVals) {
     *     console.log(index + ', ' + how + ', ' + newVals + ', ' + oldVals);
     * });
     *
     * var replaceList = new DefineList(['Alexis', 'Bill']);
     * replaceList.bind('change', function(ev, index, how, newVals, oldVals) {
     *     console.log(index + ', ' + how + ', ' + newVals + ', ' + oldVals);
     * });
     *
     * attrList.attr(['Adam', 'Ben'], true);         // 0, set, Adam, Alexis
     *                                               // 1, set, Ben, Bill
     * replaceList.replace(['Adam', 'Ben']);         // 0, remove, undefined, ['Alexis', 'Bill']
     *                                               // 0, add, ['Adam', 'Ben'], ['Alexis', 'Bill']
     *
     * attrList.attr(['Amber'], true);               // 0, set, Amber, Adam
     *                                               // 1, remove, undefined, Ben
     * replaceList.replace(['Amber']);               // 0, remove, undefined, ['Adam', 'Ben']
     *                                               // 0, add, Amber, ['Adam', 'Ben']
     *
     * attrList.attr(['Alice', 'Bob', 'Eve'], true); // 0, set, Alice, Amber
     *                                               // 1, add, ['Bob', 'Eve'], undefined
     * replaceList.replace(['Alice', 'Bob', 'Eve']); // 0, remove, undefined, Amber
     *                                               // 0, add, ['Alice', 'Bob', 'Eve'], Amber
     * ```
     */
    replace: function (newList) {
        this.splice.apply(this, [0, this._length].concat(makeArray(newList || [])));
        return this;
    },
    filter: function (callback, thisArg) {
        var filteredList = [],
            self = this,
            filtered;
        if(typeof callback === "object") {
            callback = makeFilterCallback(callback);
        }
        this.each(function(item, index, list){
            filtered = callback.call( thisArg | self, item, index, self);
            if(filtered){
                filteredList.push(item);
            }
        });
        return new this.constructor(filteredList);
    },
    map: function (callback, thisArg) {
        var filteredList = new DefineList(),
            self = this;
        this.each(function(item, index, list){
            var mapped = callback.call( thisArg | self, item, index, self);
            filteredList.push(mapped);

        });
        return filteredList;
    }
});



// Add necessary event methods to this object.
for(var prop in define.eventsProto) {
    Object.defineProperty(DefineList.prototype, prop, {
        enumerable:false,
        value: define.eventsProto[prop],
        writable: true
    });
}

Object.defineProperty(DefineList.prototype, "length", {
    get: function(){
        if(!this.__inSetup) {
            Observation.add(this,"length");
        }
        return this._length;
    },
    set: function(newVal){
        this._length = newVal;
    },
    enumerable:true
});

DefineList.prototype.each = DefineList.prototype.forEach;
DefineList.prototype.attr = function(prop, value){
    console.warn("DefineMap::attr shouldn't be called");
    if(arguments.length === 0) {
        return this.get();
    } else if(prop && typeof prop === "object") {
        return this.set.apply(this, arguments);
    } else if(arguments.length === 1) {
        return this.get(prop);
    } else {
        return this.set(prop, value);
    }
};
DefineList.prototype.item = function(index, value){
    if(arguments.length === 1) {
        return this.get(index);
    } else {
        return this.set(index, value);
    }
};
DefineList.prototype.items = function(){
   console.warn("DefineList::get should should be used instead of DefineList::items");
   return this.get();
};

types.DefineList = DefineList;
types.DefaultList = DefineList;
module.exports = DefineList;
