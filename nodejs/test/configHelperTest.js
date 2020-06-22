const path = require('path');
const logger = require('khala-logger/log4js').consoleLogger('configHelperTest');
describe('configHelper', () => {
	process.env.channelsJSONPath = path.resolve(__dirname, 'artifacts/channels.json');
	const configHelper = require('../configHelper');
	it('getActivePeers', async function () {
		this.timeout(30000);
		const peers = await configHelper.getActivePeers();
		logger.info({peers});
		const orgPeers = await configHelper.getActivePeers('astri.org');
		logger.info({orgPeers});
	});
	it('getActiveOrderers', async function () {
		this.timeout(30000);
		const orderers = await configHelper.getActiveOrderers();
		logger.info({orderers});
	});
	it('getUser', async () => {
		const user = await configHelper.getUser();
		logger.info({user});
	});
	it('getClientOfUser', async () => {
		const client = await configHelper.getClientOfUser();
		logger.info(client);
	});
});

