var Construct = require("can-construct");
var define = require("can-define");
var make = define.make;
var canBatch = require("can-event/batch/batch");
var ObserveInfo = require("can-observe-info");

var defineHelpers = require("../define-helpers/define-helpers");

var assign = require("can-util/js/assign/assign");
var each = require("can-util/js/each/each");
var isArray = require("can-util/js/is-array/is-array");
var isPlainObject = require("can-util/js/is-plain-object/is-plain-object");
var makeArray = require("can-util/js/make-array/make-array");
var CID = require("can-util/js/cid/cid");
var types = require("can-util/js/types/types");

var splice = [].splice;

var identity = function(x){
    return x;
};

var makeFilterCallback = function(props) {
    return function(item){
        for(var prop in props) {
            if(!item[prop] === props[prop]) {
                return false;
            }
        }
        return true;
    };
}
/** @add can-define/list/list */
var DefineList = Construct.extend("DefineList",
/** @static */
{
    setup: function(){
        if(DefineList) {
            // remove "*" because it means something else
            var prototype = this.prototype;
            var itemsDefinition = prototype["*"];
            if(itemsDefinition) {
                delete prototype["*"];
                define(prototype,  prototype);
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
        CID(this);
        this._length = 0;
        if(items) {
            this.splice.apply(this, [0,0].concat(items));
        }
    },
    __type: defineHelpers.simpleTypeConvert,
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
     * @function can-define/list/list.prototype.item item
     * @parent can-define/list/list.prototype
     *
     * @description Get a value that was not predefined.
     *
     * @signature `map.item(index, [newVal])`
     */
    item: function(index, newVal){
        if(arguments.length === 1) {
            ObserveInfo.observe(this,""+index);
            return this[index];
        } else {
            this.__set(index, newVal)
        }
    },
    /**
     * @function can-define/list/list.prototype.items items
     * @parent can-define/list/list.prototype
     *
     * @description Get a value that was not predefined.
     *
     * @signature `map.items()`
     */
    items: function(){
        var arr = [];
        each(this, function(item){
            arr.push(item);
        });
        return arr;
    },
    _items: function(){
        var arr = [];
        this._each(function(item){
            arr.push(item);
        });
        return arr;
    },
    __set: function (prop, value) {
        // We want change events to notify using integers if we're
        // setting an integer index. Note that <float> % 1 !== 0;
        prop = isNaN(+prop) || (prop % 1) ? prop : +prop;

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
    },
    ___set: function (attr, val) {
        this[attr] = val;
        if (+attr >= this._length) {
            this.length = (+attr + 1);
        }
    },

    _each: function (callback) {
        for (var i = 0, len = this._length; i < len; i++) {
            callback(this[i], i);
        }
    },

    /**
     * @function can-define/list/list.prototype.each each
     * @parent can-define/list/list.prototype
     *
     * @description Call a function on each element of a DefineList.
     *
     * @signature `list.each( callback(item, index) )`
     *
     * `each` iterates through the Map, calling a function
     * for each element.
     *
     * @param {function(*, Number)} callback the function to call for each element
     * The value and index of each element will be passed as the first and second
     * arguments, respectively, to the callback. If the callback returns false,
     * the loop will stop.
     *
     * @return {can.DefineList} this DefineList, for chaining
     *
     * @body
     * ```
     * var i = 0;
     * new can.Map([1, 10, 100]).each(function(element, index) {
     *     i += element;
     * });
     *
     * i; // 111
     *
     * i = 0;
     * new can.Map([1, 10, 100]).each(function(element, index) {
     *     i += element;
     *     if(index >= 1) {
     *         return false;
     *     }
     * });
     *
     * i; // 11
     * ```
     */
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
     * var list = new can.DefineList([0, 1, 2, 3]);
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
     * var list = new can.DefineList(['a', 'b', 'c', 'd']);
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
     * More information about binding to these events can be found under [can.DefineList.attr attr].
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
    },
    toObject: function () {
        return defineHelpers.serialize(this, 'toObject', []);
    },
    /*_getAttrs: function(){
        return mapHelpers.serialize(this, 'attr', []);
    },
    _setAttrs: function (items, remove) {
        // Create a copy.
        items = makeArray(items);

        canBatch.start();
        this._updateAttrs(items, remove);
        canBatch.stop();
    },

    _updateAttrs: function (items, remove) {
        var len = Math.min(items.length, this._length);

        for (var prop = 0; prop < len; prop++) {
            var curVal = this[prop],
                newVal = items[prop];

            if ( types.isMapLike(curVal) && mapHelpers.canMakeObserve(newVal)) {
                curVal.attr(newVal, remove);
                //changed from a coercion to an explicit
            } else if (curVal !== newVal) {
                this._set(prop+"", newVal);
            } else {

            }
        }
        if (items.length > this._length) {
            // Add in the remaining props.
            this.push.apply(this, items.slice(this.length));
        } else if (items.length < this.length && remove) {
            this.splice(items.length);
        }
    }*/
});

// Converts to an `array` of arguments.
getArgs = function (args) {
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
     * var list = new can.DefineList(['Alice']);
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
     *     list = new can.DefineList(['Alice']);
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
     * `push` has a counterpart in [can.DefineList::pop pop], or you may be
     * looking for [can.DefineList::unshift unshift] and its counterpart [can.DefineList::shift shift].
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
     * var list = new can.DefineList(['Alice']);
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
     *     list = new can.DefineList(['Alice']);
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
     * `unshift` has a counterpart in [can.DefineList::shift shift], or you may be
     * looking for [can.DefineList::push push] and its counterpart [can.DefineList::pop pop].
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
     * `pop` is the opposite action from `[can.DefineList.push push]`:
     *
     * ```
     * var list = new can.DefineList(['Alice', 'Bob', 'Eve']);
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
     * `pop` has its counterpart in [can.DefineList::push push], or you may be
     * looking for [can.DefineList::unshift unshift] and its counterpart [can.DefineList::shift shift].
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
     * `shift` is the opposite action from `[can.DefineList::unshift unshift]`:
     *
     * ```
     * var list = new can.DefineList(['Alice']);
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
     * `shift` has a counterpart in [can.DefineList::unshift unshift], or you may be
     * looking for [can.DefineList::push push] and its counterpart [can.DefineList::pop pop].
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
     * @param {*} item the item to find
     *
     * @return {Number} the position of the item in the DefineList, or -1 if the item is not found.
     *
     * @body
     * ```
     * var list = new can.DefineList(['Alice', 'Bob', 'Eve']);
     * list.indexOf('Alice');   // 0
     * list.indexOf('Charlie'); // -1
     * ```
     *
     * It is trivial to make a `contains`-type function using `indexOf`:
     *
     * ```
     * function(list, item) {
     *     return list.indexOf(item) >= 0;
     * }
     * ```
     */
    indexOf: function (item, fromIndex) {
        for(var i = fromIndex || 0, len = this.length; i < len; i++) {
            if(this.attr(i) === item) {
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
     * var list = new can.DefineList(['Alice', 'Bob', 'Eve']);
     * list.join(', '); // 'Alice, Bob, Eve'
     *
     * var beatles = new can.DefineList(['John', 'Paul', 'Ringo', 'George']);
     * beatles.join('&'); // 'John&Paul&Ringo&George'
     * ```
     */
    join: function () {
        ObserveInfo.observe(this, "length");
        return [].join.apply(this, arguments);
    },

    /**
     * @function can-define/list/list.prototype.reverse reverse
     * @description Reverse the order of a DefineList.
     * @signature `list.reverse()`
     *
     * `reverse` reverses the elements of the DefineList in place.
     *
     * @return {can.DefineList} the DefineList, for chaining
     *
     * @body
     * ```
     * var list = new can.DefineList(['Alice', 'Bob', 'Eve']);
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
     * @return {can.DefineList} a new `can.DefineList` with the extracted elements
     *
     * @body
     * ```
     * var list = new can.DefineList(['Alice', 'Bob', 'Charlie', 'Daniel', 'Eve']);
     * var newList = list.slice(1, 4);
     * newList.attr(); // ['Bob', 'Charlie', 'Daniel']
     * ```
     *
     * `slice` is the simplest way to copy a DefineList:
     *
     * ```
     * var list = new can.DefineList(['Alice', 'Bob', 'Eve']);
     * var copy = list.slice();
     *
     * copy.attr();   // ['Alice', 'Bob', 'Eve']
     * list === copy; // false
     * ```
     */
    slice: function () {
        // tells computes to listen on length for changes.
        ObserveInfo.observe(this, "length");
        var temp = Array.prototype.slice.apply(this, arguments);
        return new this.constructor(temp);
    },

    /**
     * @function can-define/list/list.prototype.concat concat
     * @description Merge many collections together into a DefineList.
     * @signature `list.concat(...args)`
     * @param {Array|can.DefineList|*} args Any number of arrays, Lists, or values to add in
     * For each parameter given, if it is an Array or a DefineList, each of its elements will be added to
     * the end of the concatenated DefineList. Otherwise, the parameter itself will be added.
     *
     * @body
     * `concat` makes a new DefineList with the elements of the DefineList followed by the elements of the parameters.
     *
     * ```
     * var list = new can.DefineList();
     * var newList = list.concat(
     *     'Alice',
     *     ['Bob', 'Charlie']),
     *     new can.DefineList(['Daniel', 'Eve']),
     *     {f: 'Francis'}
     * );
     * newList.attr(); // ['Alice', 'Bob', 'Charlie', 'Daniel', 'Eve', {f: 'Francis'}]
     * ```
     */
    concat: function () {
        var args = [];
        each(makeArray(arguments), function (arg, i) {
            args[i] = arg instanceof DefineList ? arg.serialize() : arg;
        });
        return new this.constructor(Array.prototype.concat.apply(this.serialize(), args));
    },

    /**
     * @function can-define/list/list.prototype.forEach forEach
     * @description Call a function for each element of a DefineList.
     * @signature `list.forEach(callback[, thisArg])`
     * @param {function(element, index, list)} callback a function to call with each element of the DefineList
     * The three parameters that _callback_ gets passed are _element_, the element at _index_, _index_ the
     * current element of the list, and _list_ the DefineList the elements are coming from.
     * @param {Object} [thisArg] the object to use as `this` inside the callback
     *
     * @body
     * `forEach` calls a callback for each element in the DefineList.
     *
     * ```
     * var list = new can.DefineList([1, 2, 3]);
     * list.forEach(function(element, index, list) {
     *     list.attr(index, element * element);
     * });
     * list.attr(); // [1, 4, 9]
     * ```
     */
    forEach: function (cb, thisarg) {
        var item;
        for (var i = 0, len = this.length; i < len; i++) {
            item = this.attr(i);
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
     * @param {Array|can.DefineList|can.Deferred} collection the collection of new elements to use
     * If a [can.Deferred] is passed, it must resolve to an `Array` or `can.DefineList`.
     * The elements of the list are not actually removed until the Deferred resolves.
     *
     * @body
     * `replace` replaces all the elements of this DefineList with new ones.
     *
     * `replace` is especially useful when `can.DefineList`s are live-bound into `[can.Control]`s,
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
     * var attrList = new can.DefineList(['Alexis', 'Bill']);
     * attrList.bind('change', function(ev, index, how, newVals, oldVals) {
     *     console.log(index + ', ' + how + ', ' + newVals + ', ' + oldVals);
     * });
     *
     * var replaceList = new can.DefineList(['Alexis', 'Bill']);
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
        var filteredList = new Define.DefineList(),
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

var length = 0;
Object.defineProperty(DefineList.prototype, "length", {
    get: function(){
        if(!this.__inSetup) {
            ObserveInfo.observe(this,"length");
        }
        return this._length;
    },
    set: function(newVal){
        this._length = newVal;
    },
    enumerable:true
});

DefineList.prototype.each = DefineList.prototype.forEach;
DefineList.prototype.attr = function(prop){
    var type = typeof prop;
    if(type === "undefined" || (prop && type === "object") ) {
        return this.items.apply(this, arguments);
    } else {
        return this.item.apply(this, arguments);
    }
}
defineHelpers.DefineList = DefineList;
types.DefaultList = DefineList;
module.exports = DefineList;
