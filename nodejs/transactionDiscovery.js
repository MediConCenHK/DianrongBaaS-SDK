const Config = require('./configHelper');
const Gateway = require('khala-fabric-network/gateway');
const ContractManager = require('khala-fabric-network/contract');
const UserUtil = require('khala-fabric-sdk-node-builder/user');

const networkConfig = Config.globalConfig;
const getPeersCallback = (orgName) => {
	const orgConfig = networkConfig.organizations[orgName];
	return orgConfig.peers.map(peerConfig => Config.PeerFromConfig(peerConfig));
};
exports.queryDefault = async (channelName, userID, {chaincodeId, fcn, args, transientMap}) => {

	const gateway = new Gateway();
	const client = Config.getClientOfUser(userID);


	const mspId = new UserUtil(undefined, client._userContext).getMSPID();
	const discoveryOptions = {mspId, networkConfig, getPeersCallback};

	const network = await gateway.connect(client, channelName, undefined, undefined, discoveryOptions);
	const contract = new ContractManager(network.getContract(chaincodeId));
	return contract.evaluateTransaction(fcn, transientMap, ...args);
};

exports.invokeDefault = async (channelName, userID, {chaincodeId, fcn, args, transientMap}) => {
	const gateway = new Gateway();
	const client = Config.getClientOfUser(userID);

	const mspId = new UserUtil(undefined, client._userContext).getMSPID();
	const discoveryOptions = {mspId, networkConfig, getPeersCallback};
	const orderers = await Config.getActiveOrderers();
	const orderer = orderers[0];
	const network = await gateway.connect(client, channelName, undefined, orderer, discoveryOptions, true);
	const contract = new ContractManager(network.getContract(chaincodeId));
	return contract.submitTransaction(fcn, transientMap, ...args);
};

module.exports = {
	queryDefault,
	invokeDefault
};