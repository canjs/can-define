"use strict";
var Construct = require("can-construct");
var define = require("can-define");
var defineHelpers = require("../define-helpers/define-helpers");
var ObservationRecorder = require("can-observation-recorder");
var ns = require("can-namespace");
var canLog = require("can-log");
var canLogDev = require("can-log/dev/dev");
var canReflect = require("can-reflect");
var canSymbol = require("can-symbol");
var queues = require("can-queues");
var addTypeEvents = require("can-event-queue/type/type");

var keysForDefinition = function(definitions) {
	var keys = [];
	for(var prop in definitions) {
		var definition = definitions[prop];
		if(typeof definition !== "object" || ("serialize" in definition ? !!definition.serialize : !definition.get)) {
			keys.push(prop);
		}
	}
	return keys;
};

function assign(source) {
	queues.batch.start();
	canReflect.assignMap(this, source || {});
	queues.batch.stop();
}
function update(source) {
	queues.batch.start();
	canReflect.updateMap(this, source || {});
	queues.batch.stop();
}
function assignDeep(source){
	queues.batch.start();
	// TODO: we should probably just throw an error instead of cleaning
	canReflect.assignDeepMap(this, source || {});
	queues.batch.stop();
}
function updateDeep(source){
	queues.batch.start();
	// TODO: we should probably just throw an error instead of cleaning
	canReflect.updateDeepMap(this, source || {});
	queues.batch.stop();
}
function setKeyValue(key, value) {
	var defined = defineHelpers.defineExpando(this, key, value);
	if(!defined) {
		this[key] = value;
	}
}
function getKeyValue(key) {
	var value = this[key];
	if(value !== undefined || key in this || Object.isSealed(this)) {
		return value;
	} else {
		ObservationRecorder.add(this, key);
		return this[key];
	}
}

var getSchemaSymbol = canSymbol.for("can.getSchema");

function getSchema() {
	var def = this.prototype._define;
	var definitions = def ? def.definitions : {};
	var schema = {
		type: "map",
		identity: [],
		keys: {}
	};
	return define.updateSchemaKeys(schema, definitions);
}

var DefineMap = Construct.extend("DefineMap",{
	setup: function(base){
		var key,
			prototype = this.prototype;
		if(DefineMap) {
			// we have already created
			var result = define(prototype, prototype, base.prototype._define);
				define.makeDefineInstanceKey(this, result);

			addTypeEvents(this);
			for(key in DefineMap.prototype) {
				define.defineConfigurableAndNotEnumerable(prototype, key, prototype[key]);
			}

			this.prototype.setup = function(props){
				define.setup.call(
					this,
					props || {},
					this.constructor.seal
				);
			};
		} else {
			for(key in prototype) {
				define.defineConfigurableAndNotEnumerable(prototype, key, prototype[key]);
			}
		}
		define.defineConfigurableAndNotEnumerable(prototype, "constructor", this);
		this[getSchemaSymbol] = getSchema;
	}
},{
	// setup for only dynamic DefineMap instances
	setup: function(props, sealed){
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
		define.setup.call(
			this,
			props || {},
			sealed === true
		);
	},
	/**
	 * @function can-define/map/map.prototype.get get
	 * @parent can-define/map/map.prototype
	 *
	 * @description Get a value or all values from a DefineMap.
	 *
	 * @signature `map.get()`
	 *
	 * Returns a plain JavaScript object that contains the properties and values of the map instance.  Any property values
	 * that also have a `get` method will have their `get` method called and the resulting value will be used as
	 * the property value.  This can be used to recursively convert a map instance to an object of other plain
	 * JavaScript objects.  Cycles are supported and only create one object.
	 *
	 * `.get()` can still return other non plain JS objects like Date.
	 * Use [can-define/map/map.prototype.serialize] when a form proper for `JSON.stringify` is needed.
	 *
	 * ```js
	 * var map = new DefineMap({foo: new DefineMap({bar: "zed"})});
	 * map.get() //-> {foo: {bar: "zed"}};
	 * ```
	 *
	 *   @return {Object} A plain JavaScript `Object` that contains all the properties and values of the map instance.
	 *
	 * @signature `map.get(propName)`
	 *
	 * Get a single property on a DefineMap instance.
	 *
	 * `.get(propName)` only should be used when reading properties that might not have been defined yet, but
	 * will be later via [can-define/map/map.prototype.set].
	 *
	 * ```js
	 * var map = new DefineMap();
	 * map.get("name") //-> undefined;
	 * ```
	 *
	 *   @param {String} propName The property name of a property that may not have been defined yet.
	 *   @return {*} The value of that property.
	 */
	get: function(prop){
		if(prop) {
			return getKeyValue.call(this, prop);
		} else {
			return canReflect.unwrap(this, Map);
		}
	},
	/**
	 * @function can-define/map/map.prototype.set set
	 * @parent can-define/map/map.prototype
	 *
	 *
	 * @description Sets multiple properties on a map instance or a property that wasn't predefined.
	 *
	 * @signature `map.set(propName, value)`
	 *
	 * Assigns _value_ to a property on this map instance called _propName_.  This will define
	 * the property if it hasn't already been predefined.
	 *
	 *   @param {String} propName The property to set.
	 *   @param {*} value The value to assign to `propName`.
	 *   @return {can-define/map/map} This map instance, for chaining.
	 *
	 * @signature `map.set(props [,removeProps])`
	 * 
	 * Assigns each value in `props` to a property on this map instance named after the
	 * corresponding key in `props`, effectively merging `props` into the Map. If `removeProps` is true, properties not in
	 * `props` will be set to `undefined`.
	 *
	 * <section class="warnings">
   * <div class="deprecated warning">
   * <h3>Deprecated 3.10.1</h3>
   * <div class="signature-wrapper">
   * <p>Passing an {Object} to <code>.set</code> has been deprecated in favor of <a href="map.prototype.assign.html" title="Sets multiple properties on a map instance or a property that wasn't predefined.">assign</a> or <a href="map.prototype.update.html" title="Sets multiple properties on a map instance or a property that wasn't predefined.">update</a>. <code>map.set(propName, value)</code> is <em>not</em> deprecated.</p>
   * </div>
   * </div>
	 * </section>
	 * 
	 *   @param {Object} props A collection of key-value pairs to set.
	 *   If any properties already exist on the map, they will be overwritten.
	 *
	 *   @param {Boolean} [removeProps=false] Whether to set keys not present in `props` to `undefined`.
	 *
	 *   @return {can-define/map/map} The map instance for chaining.
	 *
	 
	 */
	set: function(prop, value){
		if(typeof prop === "object") {
			//!steal-remove-start
			if(process.env.NODE_ENV !== 'production') {
				canLogDev.warn('can-define/map/map.prototype.set is deprecated; please use can-define/map/map.prototype.assign or can-define/map/map.prototype.update instead');
			}
			//!steal-remove-end
			if(value === true) {
				updateDeep.call(this, prop);
			} else {
				assignDeep.call(this, prop);
			}

		} else {
			setKeyValue.call(this, prop, value);
		}

		return this;
	},
	/**
	 * @function can-define/map/map.prototype.assignDeep assignDeep
	 * @parent can-define/map/map.prototype
	 *
	 * @description Sets multiple properties on a map instance or a property that wasn't predefined.
	 *
	 * @signature `map.assignDeep(props)`
	 *
	 * Assigns each value in `props` to a property on this map instance named after the
	 * corresponding key in `props`, effectively replacing `props` into the Map.
	 * Properties not in `props` will not be changed.
	 *
	 * ```js
	 * var MyMap = DefineMap.extend({
	 * 	list: DefineList,
	 * 	name: 'string'
	 * });
	 * var obj = new MyMap({
	 * 	list: ['1', '2', '3'],
	 * 	foo: 'bar'
	 * });
	 * obj.assignDeep({
	 * 	list: ['first']
 	 * });
	 *
	 * obj.list //-> ['first']
	 * obj.foo //-> 'bar'
	 * ```
	 *   @param {Object} props A collection of key-value pairs to set.
	 *   If any properties already exist on the map, they will be overwritten.
	 *
	 *   @return {can-define/map/map} The map instance for chaining.
	 *
	 */
	assignDeep: function(prop) {
		assignDeep.call(this, prop);
		return this;
	},
	/**
	 * @function can-define/map/map.prototype.updateDeep updateDeep
	 * @parent can-define/map/map.prototype
	 *
	 * @description Sets multiple properties on a map instance or a property that wasn't predefined.
	 *
	 * @signature `map.updateDeep(props)`
	 *
	 * Assigns each value in `props` to a property on this map instance named after the
	 * corresponding key in `props`, effectively merging `props` into the Map.
	 * Properties not in `props` will be set to `undefined`.
	 *
	 * ```js
	 * var MyMap = DefineMap.extend({
	 * 	list: DefineList,
	 * 	name: 'string'
	 * });
	 * var obj = new MyMap({
	 * 	list: ['1', '2', '3'],
	 * 	name: 'bar',
	 * 	foo: {
	 * 		bar: 'zed',
	 * 		boo: 'goo'
	 * 	}
	 * });
	 * obj.updateDeep({
	 * 	list: ['first'],
	 * 	foo: {
	 * 		bar: 'abc'
	 * 	}
 	 * });
	 *
	 * obj.list //-> ['first', '2', '3']
	 * obj.foo	//-> { bar: 'abc', boo: undefined }
	 * obj.name //-> 'undefined'
	 * ```
	 *   @param {Object} props A collection of key-value pairs to set.
	 *   If any properties already exist on the map, they will be overwritten.
	 *
	 *   @return {can-define/map/map} The map instance for chaining.
	 *
	 */
	updateDeep: function(prop) {
		updateDeep.call(this, prop);
		return this;
	},
	/**
	 * @function can-define/map/map.prototype.assign assign
	 * @parent can-define/map/map.prototype
	 *
	 * @description Sets multiple properties on a map instance or a property that wasn't predefined.
	 *
	 * @signature `map.assign(props)`
	 *
	 * ```js
	 * var MyMap = DefineMap.extend({
	 * 	list: DefineList,
	 * 	name: 'string'
	 * });
	 * var obj = new MyMap({
	 * 	list: ['1', '2', '3'],
	 * 	foo: 'bar'
	 * });
	 * obj.assign({
	 * 	list: ['first']
 	 * });
	 *
	 * obj.list //-> ['first']
	 * obj.foo //-> 'bar'
	 * ```
	 * Assigns each value in `props` to a property on this map instance named after the
	 * corresponding key in `props`, effectively replacing `props` into the Map.
	 * Properties not in `props` will not be changed.
	 *
	 *   @param {Object} props A collection of key-value pairs to set.
	 *   If any properties already exist on the map, they will be overwritten.
	 *
	 *   @return {can-define/map/map} The map instance for chaining.
	 *
	 */
	assign: function(prop) {
		assign.call(this, prop);
		return this;
	},
	/**
	 * @function can-define/map/map.prototype.update update
	 * @parent can-define/map/map.prototype
	 *
	 * @description Sets multiple properties on a map instance or a property that wasn't predefined.
	 *
	 * @signature `map.update(props)`
	 *
	 * ```js
	 * var MyMap = DefineMap.extend({
	 * 	list: DefineList,
	 * 	name: 'string'
	 * });
	 * var obj = new MyMap({
	 * 	list: ['1', '2', '3'],
	 * 	foo: 'bar'
	 * });
	 * obj.update({
	 * 	list: ['first']
 	 * });
	 *
	 * obj.list //-> ['first', '2', '3']
	 * obj.foo //-> 'undefined'
	 * ```
	 * Assigns each value in `props` to a property on this map instance named after the
	 * corresponding key in `props`, effectively merging `props` into the Map.
	 * Properties not in `props` will be set to `undefined`.
	 *
	 *   @param {Object} props A collection of key-value pairs to set.
	 *   If any properties already exist on the map, they will be overwritten.
	 *
	 *   @return {can-define/map/map} The map instance for chaining.
	 *
	 */
	update: function(prop) {
		update.call(this, prop);
		return this;
	},
	/**
	 * @function can-define/map/map.prototype.serialize serialize
	 * @parent can-define/map/map.prototype
	 *
	 * @description Get a serialized representation of the map instance and its children.
	 *
	 * @signature `map.serialize()`
	 *
	 * Get the serialized Object form of the map.  Serialized
	 * data is typically used to send back to a server.  Use [can-define.types.serialize]
	 * to customize a property's serialized value or if the property should be added to
	 * the result or not.
	 *
	 * `undefined` serialized values are not added to the result.
	 *
	 * ```js
	 * var MyMap = DefineMap.extend({
	 *   date: {
	 *     type: "date",
	 *     serialize: function(date){
	 *       return date.getTime()
	 *     }
	 *   }
	 * });
	 *
	 * var myMap = new MyMap({date: new Date(), count: 5});
	 * myMap.serialize() //-> {date: 1469566698504, count: 5}
	 * ```
	 *
	 *   @return {Object} A JavaScript Object that can be serialized with `JSON.stringify` or other methods.
	 *
	 */
	serialize: function () {
		return canReflect.serialize(this, Map);
	},
	deleteKey: defineHelpers.deleteKey,
	forEach: (function(){

		var forEach = function(list, cb, thisarg){
			return canReflect.eachKey(list, cb, thisarg);
		},
			noObserve = ObservationRecorder.ignore(forEach);

		return function(cb, thisarg, observe) {
			return observe === false ? noObserve(this, cb, thisarg) : forEach(this, cb, thisarg);
		};

	})(),
	"*": {
		type: define.types.observable
	}
});

var defineMapProto = {
	// -type-
	"can.isMapLike": true,
	"can.isListLike":  false,
	"can.isValueLike": false,

	// -get/set-
	"can.getKeyValue": getKeyValue,
	"can.setKeyValue": setKeyValue,
	"can.deleteKeyValue": defineHelpers.deleteKey,

	// -shape
	"can.getOwnKeys": function() {
		var keys = canReflect.getOwnEnumerableKeys(this);
		if(this._computed) {
			var computedKeys = canReflect.getOwnKeys(this._computed);

			var key;
			for (var i=0; i<computedKeys.length; i++) {
				key = computedKeys[i];
				if (keys.indexOf(key) < 0) {
					keys.push(key);
				}
			}
		}

		return keys;
	},
	"can.getOwnEnumerableKeys": function(){
		ObservationRecorder.add(this, 'can.keys');
		return keysForDefinition(this._define.definitions).concat(keysForDefinition(this._instanceDefinitions) );
	},
	"can.hasOwnKey": function(key) {
		return Object.hasOwnProperty.call(this._define.definitions, key);
	},
	"can.hasKey": function(key) {
		return !!this._define.definitions[key];
	},

	// -shape get/set-
	"can.assignDeep": assignDeep,
	"can.updateDeep": updateDeep,
	"can.unwrap": defineHelpers.reflectUnwrap,
	"can.serialize": defineHelpers.reflectSerialize,

	// observable
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
	}
};

//!steal-remove-start
if(process.env.NODE_ENV !== 'production') {
	defineMapProto["can.getName"] = function() {
		return canReflect.getName(this.constructor) + "{}";
	};
}
//!steal-remove-end

canReflect.assignSymbols(DefineMap.prototype, defineMapProto);

canReflect.setKeyValue(DefineMap.prototype, canSymbol.iterator, function() {
	return new define.Iterator(this);
});

// Add necessary event methods to this object.
for(var prop in define.eventsProto) {
	DefineMap[prop] = define.eventsProto[prop];
	Object.defineProperty(DefineMap.prototype, prop, {
		enumerable:false,
		value: define.eventsProto[prop],
		writable: true
	});
}
// @@can.onKeyValue and @@can.offKeyValue are also on define.eventsProto
//  but symbols are not enumerated in for...in loops
var eventsProtoSymbols = ("getOwnPropertySymbols" in Object) ?
  Object.getOwnPropertySymbols(define.eventsProto) :
  [canSymbol.for("can.onKeyValue"), canSymbol.for("can.offKeyValue")];

eventsProtoSymbols.forEach(function(sym) {
  Object.defineProperty(DefineMap.prototype, sym, {
    enumerable:false,
    value: define.eventsProto[sym],
    writable: true
  });
});


//!steal-remove-start
if(process.env.NODE_ENV !== 'production') {
	// call `map.log()` to log all event changes
	// pass `key` to only log the matching property, e.g: `map.log("foo")`
	DefineMap.prototype.log = defineHelpers.log;
}
//!steal-remove-end

// tells `can-define` to use this
define.DefineMap = DefineMap;

Object.defineProperty(DefineMap.prototype, "toObject", {
	enumerable: false,
	writable: true,
	value: function(){
		canLog.warn("Use DefineMap::get instead of DefineMap::toObject");
		return this.get();
	}
});

module.exports = ns.DefineMap = DefineMap;
