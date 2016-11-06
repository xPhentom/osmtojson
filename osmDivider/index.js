var cmd = require('node-cmd');
var fs = require('fs');
var async = require('async');

const execSync = require('child_process').execSync;

// var execSync = require('exec-sync');
// var sleep = require('sleep');


//Storing coordinates boundaries
var horizontaldivision = [];
var verticaldivision = [];

RetrieveBoundaries();
DivideOSM();

//CheckOsmConverter();

// Main function
function CheckOsmConverter() {
    cmd.get(
        'osmconvert',
        function (data) {
            if (data.indexOf('not recognized') == -1) {
                console.log("It seems like osmconvert isn't installed yet");
                return;
            } else {
                Setup();
                RetrieveBoundaries();
            }
        }
    );
}

//Setting up essential parts
function Setup() {
    cmd.run('mkdir osmParts');
}

// Retrieving Data

function RetrieveBoundaries() {

    // Setting startdata 

    var North = 51.49;
    var South = 49.49;
    var East = 6.40;
    var West = 2.54;

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


//Function to divide the original OSM file into multiple, smaller OSM files and stores it in the folder 'osmParts'

//Example osmconvert command: osmconvert belgium-latest.osm -b=2.54,49.49,3.09,49.78 -o=nuernberg.osm
function DivideOSM() {

    var filecounter = 0;

    for (i = 0; i < verticaldivision.length - 1; i++) {
        for (j = 0; j < horizontaldivision.length - 1; j++) {
            var North = verticaldivision[i];
            var West = horizontaldivision[j];
            var South = verticaldivision[i + 1];
            var East = horizontaldivision[j + 1];

            console.log('osmconvert belgium-latest.osm -b=' + North + ',' + West + ',' + South + ',' + East + ' -o=belgium' + filecounter + '.osm');


            // cmd.run('osmconvert belgium-latest.osm -b=' + North + ',' + West + ',' + South + ',' + East + ' -o=belgium' + filecounter + '.osm');

            // var test = execSync('osmconvert belgium-latest.osm -b=' + North + ',' + West + ',' + South + ',' + East + ' -o=belgium' + filecounter + '.osm');

            execSync('osmconvert belgium-latest.osm -b=' + North + ',' + West + ',' + South + ',' + East + ' -o=belgium' + filecounter + '.osm');

            // sleep.sleep(5);

            filecounter++;

        }
    }
}