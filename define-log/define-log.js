var canReflect = require("can-reflect");
var dev = require("can-log/dev/dev");
var ensureMeta = require("../ensure-meta");

var defineLog = function defineLog(key) {
	var instance = this;

	var quoteString = function quoteString(x) {
		return typeof x === "string" ? JSON.stringify(x) : x;
	};

	var meta = ensureMeta(instance);
	var allowed = meta.allowedLogKeysSet || new Set();
	meta.allowedLogKeysSet = allowed;

	if (key) {
		allowed.add(key);
	}

	meta._log = function(event, data) {
		var type = event.type;

		if (
			type === "can.onPatches" || (key && !allowed.has(type)) || 
			type === "can.keys" || (key && !allowed.has(type))
			) {
			return;
		}

		if (type === "add" || type === "remove") {
			dev.log(
				canReflect.getName(instance),
				"\n how   ", quoteString(type),
				"\n what  ", quoteString(data[0]),
				"\n index ", quoteString(data[1])
			);
		} else {
			// log `length` and `propertyName` events
			dev.log(
				canReflect.getName(instance),
				"\n key ", quoteString(type),
				"\n is  ", quoteString(data[0]),
				"\n was ", quoteString(data[1])
			);
		}
	};
};

module.exports = defineLog;