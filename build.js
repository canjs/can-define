var stealTools = require("steal-tools");

stealTools.export({
    system: {
        main: ["can-define", "can-define/map/map", "can-define/list/list"],
        config: __dirname + "/package.json!npm"
    },
    outputs: {
        "+amd": {},
        "+standalone": {
          modules: ["can-define", "can-define/map/map", "can-define/list/list"],
          exports: {
            "can-util/namespace": "can"
          }
        }
    }
}).catch(function(e){
    setTimeout(function(){
        throw e;
    }, 1);
});
