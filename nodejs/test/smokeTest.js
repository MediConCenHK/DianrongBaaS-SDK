const path = require('path');
process.env.channelsJSONPath = path.resolve(__dirname, 'artifacts/channels.json');
const testFolder = path.resolve(__dirname, '../');
const fs = require('fs');
const allFiles = fs.readdirSync(testFolder).filter(fileName => fileName.endsWith('.js'));
allFiles.forEach(file => {
	require(path.resolve(testFolder, file));
});
