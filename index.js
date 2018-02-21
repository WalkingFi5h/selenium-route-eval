// Modules
const {Builder, By, Key, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const convertCSVToJson = require('csvtojson');
const Pouchdb = require('pouchdb');

// Constants
const csvFilePath = 'resources/inputs.csv';
const routeEvalUrl = 'https://www.doogal.co.uk/RouteElevation.php';
const browsers = {
    firefox: "firefox",
    chrome: "chrome",
    safari: "safari"
};
const headers = [ "Index", "Loc1", "Loc1.lat", "Loc1.lng", "Loc2", "Loc2.lat", "Loc2.lng", "Distance", "Ascent", "Descend" ];

let argv = require('minimist')(process.argv.slice(2));
let browser = browsers[argv.b] ? browsers[argv.b] : browsers.safari;

let driver = new Builder().forBrowser(browser).build();
let db = new Pouchdb("database");

function readCSV(filePath) {

  var dataSet = [];
  var promise = new Promise((resolve, reject) => {
    convertCSVToJson()
    .fromFile(filePath)
    .on('json', (jsonObj) => {
        // console.log("Json object: ", jsonObj);
        dataSet.push(jsonObj);
    })
    .on('done', (error) => {
      if (error) {
        reject(error);
        console.log("ERROR");
      }
      else {
        resolve(dataSet);
        // console.log('DONE');
      }
    });
  });

  return promise;
}

function addLocation(location) {
    return new Promise((resolve, reject) => {
        var typeLat = driver.findElement(By.id('lat')).sendKeys(location.Latitude, Key.RETURN);
        typeLat.then(_ => {
            // console.log("Type LAT completes");
            var typeLng = driver.findElement(By.id('lng')).sendKeys(location.Longitude, Key.RETURN);
            typeLng.then(_ => {
                // console.log("Type LNG completes");
                driver.findElement(By.css('input[value="Add lat/lng"]')).click().
                    then(_ => { /* console.log("Add Location completes"); */ resolve(true); }, e => { console.error("Add location fails"); reject(false); });
            }, e => { reject(false); });
        }, e => { reject(false); });
    });
}

function calculate() {
    return new Promise((resolve, reject) => {
        var retryCount = 10;

        var retry = function(count) {
            if (count > 0) {
                var submit = driver.findElement(By.css('input[value="Get elevation"]')).click();
                submit.then(_ => {
                    // console.log("Submit completes");
                    driver.wait(until.elementTextIs(driver.findElement(By.id('info')), "Complete"), 10000).
                        then(_ => { /*console.log("Calculate completes");*/ resolve(true); }, e => { /* console.error("Calculate fails x ", retryCount - (--count));*/ retry(--count); });
                }, e => { console.error("Submit fails x ", retryCount - (--count)); retry(count); });
            }
            else {
                console.error("Calculate fails after 10 retries..");
                reject(false);
            }
        };
        
        retry(retryCount);
    });
}

function collectResults(index, loc1, loc2) {
    return new Promise((resolve, reject) => {
        Promise.all([
            driver.findElement(By.id("distance")).getText(),
            driver.findElement(By.id("ascent")).getText(),
            driver.findElement(By.id("descent")).getText()
        ]).then((results) => {
            var distance = results[0],
                ascent = results[1],
                descend = results[2];
            
            var logValues = [index, loc1.Name, loc1.Latitude, loc1.Longitude, loc2.Name, loc1.Latitude, loc2.Longitude, distance, ascent, descend];
            db.put({
                "_id": genDbKey(loc1, loc2),
                "value": logValues.slice(1).join(',')
            }).then(_ => {
                console.log(logValues.join(','));
                resolve(logValues);
            });
            
        }, (error) => {
            console.error("Collect Result fails");
            reject(false);
        });
    });
}

function clear() {
    return new Promise((resolve, reject) => {
        var clear = driver.findElement(By.css('input[value="Clear"]')).click();
        clear.then(_ => {
            driver.wait(until.elementTextIs(driver.findElement(By.id('info')), ""), 5000).
                then(_ => { resolve(true); }, e => { console.error("Clear fails"); reject(false); });
        }, e => { reject(false); });
    });
}

function genDbKey(loc1, loc2) {
    return loc1.Name + "_" + loc2.Name;
}

try {
    readCSV(csvFilePath).then((locations) => {
        // console.log("Result count = " + locations.length);
    
        // console.log("Loop through all location pairs");
    
        driver.get(routeEvalUrl).
        then(_ => {
            (async function() {
                var index = 0;
                // Pair the locations
                console.log(headers.join(','));
                for (var i = 0; i < locations.length; i++) {
                    var loc1 = locations[i];
                    for (var j = 0; j < locations.length; j++) {
                        if (i != j) {
                            var loc2 = locations[j];
                            
                            await new Promise(next => {

                                db.get(genDbKey(loc1, loc2)).then((doc) => {
                                    if (doc) {
                                        index++;
                                        console.log(index + "," + doc.value);
                                        next();
                                    }
                                    else {
                                        throw "Error";
                                    }
                                }).catch((err) => {
                                    // console.log(err);
                                    // console.log("New Location");
                                    addLocation(loc1).then(_ => {
                                        addLocation(loc2).then(_ => { 
                                            calculate().then(_ => {
                                                index++;
                                                collectResults(index, loc1, loc2).then((results) => {
                                                    setTimeout(_ => {
                                                        clear().then(_ => next(), e => next());
                                                    }, 2000);
                                                }, e => next());
                                            }, e => {
                                                setTimeout(_ => {
                                                    // The calculation has failed more than 10 times
                                                    // wait 60s first before retrying
                                                    // Revert the iterator
                                                    if (j == 0) {
                                                        i--;
                                                    }
                                                    else {
                                                        j--;
                                                    }
                                                    next();
                                                }, 60000);
                                            });
                                        }, e => next());
                                    }, e => next());
                                });
                            });
                        }
                    }
                }
            })();
        }, e => {
            // TODO
        });
    }, (error) => {
    
    });    
}
finally {
    
}
