const Channel = require('khala-fabric-sdk-node/channel');
const {initialize} = require('khala-fabric-sdk-node/serviceDiscovery');
const Config = require('./configHelper');
const prepareChannel = async (channelName, userID, useDiscover) => {
	const client = await Config.getClientOfUser(userID);
	const channel = Channel.new(client, channelName);

	if (useDiscover) {
		const activePeers = await Config.getActiveDiscoveryPeers();
		const peer = activePeers[0];
		await initialize(channel, peer, {asLocalhost: false, TLS: true});
	}
	return channel;
};
exports.prepareChannel = prepareChannel;

