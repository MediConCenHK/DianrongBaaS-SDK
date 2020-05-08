const Gateway = require('khala-fabric-network/gateway');
const ContractManager = require('khala-fabric-network/contract');
const Config = require('./configHelper');
exports.queryOnPeers = async (channelName, chaincodeId, fcn, args = [], transientMap, userID, targetPeers) => {
	const gateway = new Gateway();
	const client = Config.getClientOfUser(userID);
	const network = await gateway.connect(client, channelName, targetPeers, undefined, undefined);
	const contract = new ContractManager(network.getContract(chaincodeId));
	const result = contract.evaluateTransaction(fcn, transientMap, ...args);

	return result;
};

exports.query = async (channelName, chaincodeId, fcn, args, transientMap, userID, endorserFilter) => {
	const targetPeers = await Config.getActivePeers(endorserFilter);
	return await exports.queryOnPeers(channelName, chaincodeId, fcn, args, transientMap, userID, targetPeers);
};
exports.transactionOnPeers = async (channelName, chaincodeId, fcn, args = [], transientMap, userID, targetPeers) => {
	const gateway = new Gateway();
	const client = Config.getClientOfUser(userID);
	const orderers = await Config.getActiveOrderers();
	const orderer = orderers[0];
	const network = await gateway.connect(client, channelName, targetPeers, orderer);

	const contract = new ContractManager(network.getContract(chaincodeId));
	const result = contract.submitTransaction(fcn, transientMap, ...args);
	return result;

};
exports.transaction = async (channelName, chaincodeId, fcn, args, transientMap, userID, endorserFilter) => {
	const activePeers = await Config.getActivePeers(endorserFilter);
	return await exports.transactionOnPeers(channelName, chaincodeId, fcn, args, transientMap, userID, activePeers);

};
