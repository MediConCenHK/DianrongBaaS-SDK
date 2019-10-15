const Config = require('./configHelper');
const {invoke} = require('khala-fabric-sdk-node/chaincodeHelper');
const {transactionProposal} = require('khala-fabric-sdk-node/chaincode');
const {prepareChannel} = require('./transactionDiscovery');
const {newEventHub} = require('khala-fabric-sdk-node/eventHub');
const _prepare = async (channelName, userID, endorserFilter = () => true) => {
	const activePeers = await Config.getActivePeers(endorserFilter);
	const channel = await prepareChannel(channelName, userID);
	const client = channel._clientContext;
	return {channel, activePeers, client};
};
exports.query = async (channelName, chaincodeId, fcn, args = [], transientMap, endorserFilter, userID) => {
	const {activePeers, client} = await _prepare(channelName, userID, endorserFilter);


	const resp = await transactionProposal(client, activePeers, channelName, {
		chaincodeId, fcn, args, transientMap
	});
	return resp;
};
exports.transaction = async (channelName, chaincodeId, fcn, args, transientMap, endorserFilter, userID) => {
	const {channel, activePeers, client} = await _prepare(channelName, userID, endorserFilter);

	const eventHubs = activePeers.map(peer => newEventHub(channel, peer, true));
	const orderers = await Config.getActiveOrderers();
	const orderer = orderers[0];
	const resp = await invoke(client, channelName, activePeers, eventHubs,
		{chaincodeId, fcn, args, transientMap},
		orderer);
	return resp;
};
