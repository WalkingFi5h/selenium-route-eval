There is only one code file index.js. Implementation is based on selenium-webdriver with nodeJS.

1. Install nodeJS 8.9 in Mac 
    https://nodejs.org/en/

2. Go to code directory and run 
    'npm install'

3. Replace 'resources/inputs.csv' file when needed or put in other csv file and change "csvFilePath" in index.js accordingly. 
    Note: column headers should be: ID, Name, Latitude, Longitude.

4. Run 'npm start' to start automation on Safari. Safari is supported on Mac by default. Go to "Safari > Preferences > Advanced" and check "Show Develop Menu" option and then check "Allow Remote Automation" in "Develop" menu.

If you need to run Chrome/Firefox on window/mac, you'll need to 
    - Download Chrome/Firefox driver. Follow instruction here: https://github.com/SeleniumHQ/selenium/tree/master/javascript/node/selenium-webdriver
    - Append '-b firefox' or '-b chrome' to "node index.js" in "scripts.start" of package.json

5. Result will be output to log-$timestamp.csv in logs folder. Open it with excel or open office.

6. Have fun