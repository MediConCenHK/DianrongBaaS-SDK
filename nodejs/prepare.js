const Channel = require('khala-fabric-sdk-node/channel');
const {initialize} = require('khala-fabric-sdk-node/serviceDiscovery');
const Config = require('./configHelper');
/**
 *
 * @param {string} channelName
 * @param {string} userID
 * @param {Peer} [discoveryPeer]
 * @return {Promise<Client.Channel>}
 */
const prepareChannel = async (channelName, userID, discoveryPeer) => {
	const client = Config.getClientOfUser(userID);
	const channel = Channel.new(client, channelName);

	if (discoveryPeer) {
		await initialize(channel, discoveryPeer, {asLocalhost: false, TLS: true});
	}
	return channel;
};
exports.prepareChannel = prepareChannel;

