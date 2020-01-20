const {invoke} = require('khala-fabric-sdk-node/chaincodeHelper');
const {transactionProposal} = require('khala-fabric-sdk-node/chaincode');
const {prepareChannel} = require('./prepare');
const EventHub = require('khala-fabric-sdk-node/eventHub');
const Config = require('./configHelper');
exports.queryOnPeers = async (channelName, chaincodeId, fcn, args = [], transientMap, userID, targetPeers) => {
	const client = await Config.getClientOfUser(userID);
	return await transactionProposal(client, targetPeers, channelName, {
		chaincodeId, fcn, args, transientMap
	});
};

exports.query = async (channelName, chaincodeId, fcn, args, transientMap, userID, endorserFilter) => {
	const targetPeers = await Config.getActivePeers(endorserFilter);
	return await exports.queryOnPeers(channelName, chaincodeId, fcn, args, transientMap, userID, targetPeers);
};
exports.transactionOnPeers = async (channelName, chaincodeId, fcn, args = [], transientMap, userID, targetPeers) => {
	const channel = await prepareChannel(channelName, userID, false);
	const client = channel._clientContext;

	const eventHubs = targetPeers.map(peer => new EventHub(channel, peer));

	for (const eventHub of eventHubs) {
		await eventHub.connect();
	}
	const orderers = await Config.getActiveOrderers();
	const orderer = orderers[0];
	return await invoke(client, channelName, targetPeers, eventHubs,
		{chaincodeId, fcn, args, transientMap},
		orderer);
};
exports.transaction = async (channelName, chaincodeId, fcn, args, transientMap, userID, endorserFilter) => {
	const activePeers = await Config.getActivePeers(endorserFilter);
	return await exports.transactionOnPeers(channelName, chaincodeId, fcn, args, transientMap, userID, activePeers);

};
