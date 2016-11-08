var cmd = require('node-cmd');
var fs = require('fs');
var async = require('async');
var solr = require('solr-client');

const execSync = require('child_process').execSync;

//Storing coordinates boundaries
var horizontaldivision = [];
var verticaldivision = [];

var North; // MaxLat
var South; // MinLat
var East; // MaxLon
var West; // MinLon

var osmconvert = true;
var osmosis = true;
var osmtogeojson = true;

// CheckApplications();


//Checking whether or not all necessary applications are available
function CheckApplications() {

    cmd.get(
        'osmconvert -h',
        function (data) {
            if (data.indexOf('not recognized') == -1) {
                osmconvert = true;
            } else {
                console.log("Looks like osmconvert isn't installed yet")
            }
            osmconvert = true;
        });
    cmd.get(
        'osmosis',
        function (data) {
            if (data.indexOf('not recognized') == -1) {
                osmconvert = true;
            } else {
                console.log("Looks like osmosis isn't installed yet")
            }
        });
    cmd.get(
        'osmtogeojson --help',
        function (data) {
            if (data.indexOf('not recognized') == -1) {
                osmconvert = true;
            } else {
                console.log("Looks like osmtogeojson isn't installed yet")
            }
        });



}

Startup();

// Main function
function Startup() {

    console.log("Starting...");
    console.log(osmconvert + "," + osmosis + "," + osmtogeojson);
    if (osmconvert && osmosis && osmtogeojson) {
        console.log("All applications are installed, let's go");
        Setup();
        readosmpbffolder();
        OSMDivider();
        ConvertOsmToGeojson();
        //SendToSolr(); TODO: still needs to be tested
    }
}


//Setting up essential parts
function Setup() {
    console.log("Creating all necessary folders");
    cmd.run('mkdir osm osmparts geojson');
}


//Read the osm.pbf folder
//Convert osm.pbf to osm files and place them into osm folder
function readosmpbffolder() {

    console.log("Reading osmpbf folder...");

    fs.readdir("osmpbf", (err, files) => {
        if (files.length == 0) {
            console.log("Looks like there are no osm.pbf files in the osmpbf folder");
            return;
        }
        files.forEach(filename => {
            console.log(filename);
            var osmfilename = filename.replace('osm.pbf', 'osm');
            console.log("converting " + filename + " to " + osmfilename);
            execSync("osmosis --read-pbf osmpbf/" + filename + " --write-xml osm/" + osmfilename);
        });
    })
};

function OSMDivider() {
    fs.readdir("osm", (err, files) => {
        if (files.length == 0) {
            console.log("Looks like there are no osm files in the osm folder");
            return;
        }
        files.forEach(filename => {
            CreateBoundaries(filename);
            DivideOSM(filename);
        });
    })
}

// Retrieving Data

function CreateBoundaries(Filename) {

    // Setting startdata 

    RetrieveCoordinates(Filename);

    console.log("Startwaarden: " + " North: " + North + ", South: " + South + ", East: " + East + ", West: " + West);

    var height = North - South;
    var width = East - West;

    var multiply = width * height;

    var divider = parseInt(multiply, 10);

    // dividing country from North to South

    var heightpart = height / divider;

    var startNorth = South;



    for (i = 0; i <= divider; i++) {
        horizontaldivision.push((Math.round(startNorth * 100) / 100).toFixed(2));
        startNorth += heightpart;
    }

    console.log("Horizontale verdeling: " + horizontaldivision);

    // dividing country from West to East

    var widthpart = width / divider;

    var startEast = West;



    for (i = 0; i <= divider; i++) {
        verticaldivision.push((Math.round(startEast * 100) / 100).toFixed(2));
        startEast += widthpart;
    }

    console.log("Verticale verdeling: " + verticaldivision);
}


//Retrieving coordinates from osm.pbf file
function RetrieveCoordinates(Filename) {

    // osmconvert --out-statistics return the north, east, south and west values of the osm.pbf file
    execSync('osmconvert osm/' + Filename + ' --out-statistics > statistics.txt');

    //To make the script system independant, we quickly create a small file from which we will get the coordinates
    var array = fs.readFileSync("statistics.txt").toString().split('\n');

    for (var i = 0; i < array.length; i++) {

        if (array[i].indexOf("lon min") > -1) {
            West = parseFloat(array[i].substr(array[i].indexOf(":") + 1));

        } else if (array[i].indexOf("lon max") > -1) {
            East = parseFloat(array[i].substr(array[i].indexOf(":") + 1));

        } else if (array[i].indexOf("lat min") > -1) {
            South = parseFloat(array[i].substr(array[i].indexOf(":") + 1));

        } else if (array[i].indexOf("lat max") > -1) {
            North = parseFloat(array[i].substr(array[i].indexOf(":") + 1));

        }
    }
}




//Function to divide the original OSM file into multiple, smaller OSM files and stores it in the folder 'osmParts'

//Example osmconvert command: osmconvert belgium-latest.osm -b=2.54,49.49,3.09,49.78 -o=nuernberg.osm
function DivideOSM(Filename) {

    var filecounter = 0;

    //Giving the variables the right value
    for (i = 0; i < verticaldivision.length - 1; i++) {
        for (j = 0; j < horizontaldivision.length - 1; j++) {
            var North = verticaldivision[i];
            var West = horizontaldivision[j];
            var South = verticaldivision[i + 1];
            var East = horizontaldivision[j + 1];

            console.log('osmconvert osm/' + Filename + ' -b=' + North + ',' + West + ',' + South + ',' + East + ' -o=osmParts/belgium' + filecounter + '.osm --verbose');

            execSync('osmconvert osm/' + Filename + ' -b=' + North + ',' + West + ',' + South + ',' + East + ' -o=osmParts/belgium' + filecounter + '.osm --verbose');

            filecounter++;

        }
    }
}


//Converting Osm files to Geojson and placing them into the folder geojson
function ConvertOsmToGeojson() {
    fs.readdir("osmparts", (err, files) => {
        if (files.length == 0) {
            console.log("Looks like there are no osm files in the osmparts folder");
            return;
        }
        files.forEach(filename => {
            var geojsonfilename = filename.replace('osm', 'geojson');
            console.log("converting " + filename + " to " + geojsonfilename);
            execSync("osmtogeojson osmparts/" + filename + " > geojson/" + geojsonfilename);
        });
    })
};


//Upload all the files found in the geojson folder
function SendToSolr() {
    var client = solr.createClient();
    client = solr.createClient();

    fs.readdir("geojson", (err, files) => {
        if (files.length == 0) {
            console.log("Looks like there are no geojson files in the osmparts folder");
            return;
        }
        files.forEach(filename => {
            console.log("Uploading " + filename + " to Solr");
            var jsontext = fs.readFileSync("geojson/" + filename).toString();;
            client.add(jsontext, function (err, obj) {
                if (err) {
                    console.log(err);
                } else {
                    console.log('Solr response:', obj);
                }
            })
        });
    })

}