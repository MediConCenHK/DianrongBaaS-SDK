const path = require('path');
process.env.channelsJSONPath = path.resolve(__dirname, 'artifacts/channels.json');
const configHelper = require('../configHelper');
const task = async () => {
	const discoveryPeers = await configHelper.getActiveDiscoveryPeers();
	console.debug({discoveryPeers});
	const peers = await configHelper.getActivePeers();
	console.debug({peers});
	const orderers = await configHelper.getActiveOrderers();
	console.debug({orderers});
	const user = await configHelper.getUser();
	console.debug({user});
};
task();