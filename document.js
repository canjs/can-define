var bitDocs = require("bit-docs");
var path = require("path");
var readmeGenerate = require("bit-docs-generate-readme");

bitDocs(
    path.join(__dirname, "package.json"),
    {
        debug: true,
        readme: {
            apis: "./docs/apis.json"
        },
        generators: [readmeGenerate]
    }).catch(function(e){

        setTimeout(function(){
            throw e;
        }, 1);
    });
