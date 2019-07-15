const {chaincodesInstantiated} = require('khala-fabric-sdk-node/query');
const ChannelUtil = require('khala-fabric-sdk-node/channel');
const ClientUtil = require('khala-fabric-sdk-node/client');
const Config = require('../configHelper');

const {channelName} = Config;
const getCurrentVersion = async (peer, user) => {
	const client = ClientUtil.new();
	ClientUtil.setUser(client, user);
	const channel = ChannelUtil.new(client, channelName);
	return await chaincodesInstantiated(peer, channel);
};
const taskGetCurrentVersion = async () => {
	const peers = await Config.getActivePeers();
	const user = await Config.getUser('appUser');
	const currentVersion = await getCurrentVersion(peers[0], user);
	console.log(currentVersion);
};

taskGetCurrentVersion();
