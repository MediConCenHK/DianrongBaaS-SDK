const Gateway = require('khala-fabric-network/gateway');
const ContractManager = require('khala-fabric-network/contract');
const Config = require('./configHelper');
const queryOnPeers = async (channelName, chaincodeId, fcn, args = [], transientMap, userID, targetPeers) => {
	const gateway = new Gateway();
	const client = Config.getClientOfUser(userID);
	const network = await gateway.connect(client, channelName, targetPeers, undefined, undefined);
	const contract = new ContractManager(network.getContract(chaincodeId));
	const result = await contract.evaluateTransaction(fcn, transientMap, ...args);

	return result;
};

const query = async (channelName, chaincodeId, fcn, args, transientMap, userID, orgName) => {
	const targetPeers = await Config.getActivePeers(orgName);
	return await queryOnPeers(channelName, chaincodeId, fcn, args, transientMap, userID, targetPeers);
};
const transactionOnPeers = async (channelName, chaincodeId, fcn, args = [], transientMap, userID, targetPeers) => {
	const gateway = new Gateway();
	const client = Config.getClientOfUser(userID);
	const orderers = await Config.getActiveOrderers();
	const orderer = orderers[0];
	const network = await gateway.connect(client, channelName, targetPeers, orderer);

	const contract = new ContractManager(network.getContract(chaincodeId));
	const result = await contract.submitTransaction(fcn, transientMap, ...args);
	return result;

};
const transaction = async (channelName, chaincodeId, fcn, args, transientMap, userID, orgName) => {
	const activePeers = await Config.getActivePeers(orgName);
	return await transactionOnPeers(channelName, chaincodeId, fcn, args, transientMap, userID, activePeers);
};

module.exports = {
	queryOnPeers,
	query,
	transactionOnPeers,
	transaction,
};
