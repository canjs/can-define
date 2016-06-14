var bitDocs = require("bit-docs");
var path = require("path");

bitDocs(
    path.join(__dirname, "package.json"),
    {
        debug: true,
        readme: {
            apis: [
                {"can-define": ["can-define.types.propDefinition","can-define.types"]},
                {"can-define/map.extend": ["can-define/map.seal"]},
                {"can-define/map": [
                    "can-define/map.prototype.each",
                    "can-define/map.prototype.toObject",
                    "can-define/map.prototype.serialize",
                    "can-define/map.prototype.get",
                    "can-define/map.prototype.set",
                ]},
                {"can-define/list": [
                    "can-define/list.prototype.item",
                    "can-define/list.prototype.items",
                    "can-define/list.prototype.each",
                    "can-define/list.prototype.forEach",
                    "can-define/list.prototype.splice",
                    "can-define/list.prototype.replace",
                    "can-define/list.prototype.push",
                    "can-define/list.prototype.unshift",
                    "can-define/list.prototype.pop",
                    "can-define/list.prototype.shift",
                    "can-define/list.prototype.indexOf",
                    "can-define/list.prototype.join",
                    "can-define/list.prototype.reverse",
                    "can-define/list.prototype.slice",
                    "can-define/list.prototype.concat",
                ]}
            ]
        }
    }).catch(function(e){

        setTimeout(function(){
            throw e;
        }, 1);
    })
