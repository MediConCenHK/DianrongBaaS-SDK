const {invoke} = require('khala-fabric-sdk-node/chaincodeHelper');
const {transactionProposal} = require('khala-fabric-sdk-node/chaincode');
const {prepareChannel} = require('./prepare');
const EventHub = require('khala-fabric-sdk-node/eventHub');
const Config = require('./configHelper');
exports.queryOnPeers = async (channelName, chaincodeId, fcn, args = [], transientMap, userID, targetPeers) => {
	const client = await Config.getClientOfUser(userID);
	const resp = await transactionProposal(client, targetPeers, channelName, {
		chaincodeId, fcn, args, transientMap
	});
	return resp;
};

exports.query = async (channelName, chaincodeId, fcn, args, transientMap, endorserFilter, userID) => {
	const targetPeers = await Config.getActivePeers(endorserFilter);
	const resp = await exports.queryOnPeers(channelName, chaincodeId, fcn, args, transientMap, userID, targetPeers);
	return resp;
};
exports.transaction = async (channelName, chaincodeId, fcn, args = [], transientMap, endorserFilter, userID) => {

	const activePeers = await Config.getActivePeers(endorserFilter);
	const channel = await prepareChannel(channelName, userID, false);
	const client = channel._clientContext;

	const eventHubs = activePeers.map(peer => new EventHub(channel, peer));

	for (const eventHub of eventHubs) {
		await eventHub.connect();
	}
	const orderers = await Config.getActiveOrderers();
	const orderer = orderers[0];
	const resp = await invoke(client, channelName, activePeers, eventHubs,
		{chaincodeId, fcn, args, transientMap},
		orderer);
	return resp;
};
