const path = require('path');
const testFolder = path.resolve(__dirname, '../');
const fs = require('fs');
describe('smokeTest', () => {
	process.env.channelsJSONPath = path.resolve(__dirname, 'artifacts/channels.json');
	it('require all js', () => {
		const allFiles = fs.readdirSync(testFolder).filter(fileName => fileName.endsWith('.js'));
		allFiles.forEach(file => {
			require(path.resolve(testFolder, file));
		});
	});
});

