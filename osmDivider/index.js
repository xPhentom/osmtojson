var cmd = require('node-cmd');
var fs = require('fs');
var async = require('async');
var solr = require('solr-client');
var ProgressBar = require('progress');
var stopwatch = require('node-stopwatch').Stopwatch;

const execSync = require('child_process').execSync;

//Storing coordinates boundaries
var horizontaldivision = [];
var verticaldivision = [];

var max_lat; // MaxLat
var min_lat; // MinLat
var max_lon; // MaxLon
var min_lon; // MinLon
var resultingfilename;

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
                console.log("Looks like osmconvert isn't installed yet");
            }
            osmconvert = true;
        });
    cmd.get(
        'osmosis',
        function (data) {
            if (data.indexOf('not recognized') == -1) {
                osmconvert = true;
            } else {
                console.log("Looks like osmosis isn't installed yet");
            }
        });
    cmd.get(
        'osmtogeojson --help',
        function (data) {
            if (data.indexOf('not recognized') == -1) {
                osmconvert = true;
            } else {
                console.log("Looks like osmtogeojson isn't installed yet");
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
        ConvertOsmToGeojson();
        console.log("Converting to GeoJSON completed.");

        //OSMDivider();
        //ConvertOsmToGeojson();
        //SendToSolr(); TODO: still needs to be tested
    }
}


//Setting up essential parts
function Setup() {
    console.log("Creating all necessary folders");
    cmd.run('mkdir osmparts geojson');
}


//Read the osm.pbf folder
//Convert osm.pbf to osm files and place them into osm folder
function readosmpbffolder() {

    console.log("Reading osmpbf folder...");

    fs.readdir("osmpbf", (err, files) => {
        if (files.length === 0) {
            console.log("Looks like there are no osm.pbf files in the osmpbf folder");
            return;
        }

        //console.log("The next files are found");

        files.forEach(filename => {
            //console.log(filename);
            resultingfilename = filename.replace('-latest.osm.pbf', '');
            CreateBoundaries(filename);
        });
    });
}

/*function OSMDivider() {
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
}*/

// Retrieving Data

function CreateBoundaries(Filename) {

    // Setting startdata 

    RetrieveCoordinates(Filename);
    //Bounadries Denmark
    //	min_lat = 54.45; //bottom
    //	max_lat = 57.96; //top
    //	min_lon = 7.71; //left
    // 	max_lon = 15.56; //right


    //console.log("Starting values: " + " max_lat: " + max_lat + ", min_lat: " + min_lat + ", max_lon: " + max_lon + ", min_lon: " + min_lon);

    var height = max_lat - min_lat;
    var width = max_lon - min_lon;

    var surface = width * height;

    var divider = Math.ceil(parseInt(surface) / 2);

    // dividing country from max_lat to min_lat

    var heightpart = height / divider;

    var startmax_lat = min_lat;



    for (i = 0; i <= divider; i++) {
        horizontaldivision.push((Math.round(startmax_lat * 100) / 100).toFixed(2));
        //horizontaldivision.push(startmax_lat);
        startmax_lat += heightpart;
    }

    //console.log("Horizontale verdeling: " + horizontaldivision);

    // dividing country from min_lon to max_lon

    var widthpart = width / divider;

    var startmax_lon = min_lon;



    for (i = 0; i <= divider; i++) {
        verticaldivision.push((Math.round(startmax_lon * 100) / 100).toFixed(2));
        //verticaldivision.push(startmax_lon);
        startmax_lon += widthpart;
    }

    //console.log("Verticale verdeling: " + verticaldivision);

    DivideOSM(Filename, max_lat, min_lat, max_lon, min_lon);
    //console.log("Converting to OSM completed.");
    //ConvertOsmToGeojson();
    //console.log("Converting to GeoJSON completed.");
    //PostToSolR();
    //console.log("Posting to SolR completed.");
}


//Retrieving coordinates from osm.pbf file
function RetrieveCoordinates(Filename) {

    // osmconvert --out-statistics return the north, east, south and west values of the osm.pbf file
    execSync('osmconvert osmpbf/' + Filename + ' --out-statistics > statistics.txt');

    // execSync('cat statistics.txt');

    //To make the script system independant, we quickly create a small file from which we will get the coordinates
    var array = fs.readFileSync("statistics.txt").toString().split('\n');

    for (var i = 0; i < array.length; i++) {

        if (array[i].indexOf("lon min") > -1) {
            min_lon = parseFloat(array[i].substr(array[i].indexOf(":") + 1));

        } else if (array[i].indexOf("lon max") > -1) {
            max_lon = parseFloat(array[i].substr(array[i].indexOf(":") + 1));


        } else if (array[i].indexOf("lat min") > -1) {
            min_lat = parseFloat(array[i].substr(array[i].indexOf(":") + 1));

        } else if (array[i].indexOf("lat max") > -1) {
            max_lat = parseFloat(array[i].substr(array[i].indexOf(":") + 1));

        }
    }
}




//Function to divide the original OSM file into multiple, smaller OSM files and stores it in the folder 'osmParts'

var stopwatch = stopwatch.create(); //Keeps ahold of the time to create the osm files

//Example osmconvert command: osmconvert belgium-latest.osm -b=2.54,49.49,3.09,49.78 -o=nuernberg.osm
function DivideOSM(Filename, _maxlat, _minlat, _maxlon, _minlon) {

    var filecounter = 0;

    var bar = new ProgressBar('Converting to osm [:bar] :percent (:current / :total)', {
        complete: '=',
        incomplete: ' ',
        total: verticaldivision.length + horizontaldivision.length + 1
    });

    if (verticaldivision.length == 1) {
        //console.log("This country is too small, using boundaries instead");
        //console.log('osmconvert osmpbf/' + Filename + ' -b=' + _maxlat + ',' + _minlon + ',' + _minlat + ',' + _maxlon + ' -o=osmparts/' + resultingfilename + '.osm --verbose');
        stopwatch.start();
        execSync('osmosis -q --read-pbf file=osmpbf/' + Filename + ' --write-xml osmparts/' + resultingfilename + '.osm');
        console.log("Country: " + resultingfilename);
        bar.total = 1;
        stopwatch.stop();
        bar.tick();
        if (bar.complete) {
            console.log("Elapsed time (HH:MM:SS) : " + stopwatch.elapsed.hours + ":" + stopwatch.elapsed.minutes + ":" + stopwatch.elapsed.seconds);
        }
    } else {

        //Giving the variables the right value
        console.log("Country: " + resultingfilename);
        stopwatch.reset();
        stopwatch.start;
        for (i = 0; i < verticaldivision.length - 1; i++) {
            for (j = 0; j < horizontaldivision.length - 1; j++) {
                var min_lon = verticaldivision[i];
                var min_lat = horizontaldivision[j];
                var max_lon = verticaldivision[i + 1];
                var max_lat = horizontaldivision[j + 1];

                //console.log('osmosis --read-pbf file=osmpbf/' + Filename  + ' --bounding-box top=' + min_lat  + ' left=' + max_lon + ' bottom=' + max_lat + ' right=' + min_lon + ' --write-xml osmparts/' + resultingfilename + filecounter + '.osm');
                //console.log('osmconvert osmpbf/' + Filename + ' -b=' + min_lon + ',' + min_lat + ',' + max_lon + ',' + max_lat + ' -o=osmparts/' + resultingfilename + filecounter + '.osm --drop-broken-refs --verbose');
                //console.log("Dit is de filename " + Filename);
                //execSync('osmosis --read-pbf file=osmpbf/' + Filename  + ' --bounding-box top=' + min_lat  + ' left=' + min_lon + ' bottom=' + max_lat + ' right=' + max_lon + ' --write-xml osmparts/' + resultingfilename + filecounter + '.osm' );           
                execSync('osmconvert osmpbf/' + Filename + ' -b=' + min_lon + ',' + min_lat + ',' + max_lon + ',' + max_lat + ' --add-bbox-tags -o=osmparts/' + resultingfilename + filecounter + '.osm');
                //console.log(resultingfilename);
                stopwatch.stop();
                bar.tick();
                if (bar.complete) {
                   console.log("Elapsed time (HH:MM:SS) : " + stopwatch.elapsed.hours + ":" + stopwatch.elapsed.minutes + ":" + stopwatch.elapsed.seconds);
                }
                filecounter++;
            }
        }
    }
    console.log("Converting to OSM completed.");
    //ConvertOsmToGeojson();
    //console.log("Converting to GeoJSON completed.");
    verticaldivision = [];
    horizontaldivision = [];

}


//Converting Osm files to Geojson and placing them into the folder geojson
function ConvertOsmToGeojson() {
    console.log("Reading osmparts folder...");

    fs.readdir("osmparts", (err, files) => {
        if (files.length === 0) {
            console.log("Looks like there are no osm files in the osmparts folder");
            return;
        }
        console.log("TEST");

        files.forEach(filename => {
            var geojsonfilename = filename.replace('osm', 'json');
            //console.log("converting " + filename + " to " + geojsonfilename);
            console.log(files.length);
            console.log("osmtogeojson osmparts/" + filename + " > geojson/" + geojsonfilename);
            execSync("osmtogeojson osmparts/" + filename + " > geojson/" + geojsonfilename);
            //execSync("head -n -9 geojson/" + geojsonfilename + " > geojson/" + geojsonfilename);
            execSync("echo ']' >> geojson/" + geojsonfilename);
            console.log("rm osmparts/" + filename);
            execSync("rm osmparts/" + filename);
            //SendToSolr(geojsonfilename);
        });
        return;
    });
}


//Upload all the files found in the geojson folder
function SendToSolr(filename) {

    console.log("/opt/solr-5.5.3/bin/post -c CE_OSM -p 8989 -type application/json geojson/" + filename + " is being executed." + "\nIf this doesn't work, check the existance of the core and document.");
    execSync("/opt/solr-5.5.3/bin/post -c CE_OSM -p 8989 -type application/json geojson/" + filename);

}