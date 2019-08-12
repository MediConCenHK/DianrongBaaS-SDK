const logger = require('khala-fabric-sdk-node/logger').new('transactionDiscovery');
const {transientMapTransform, transactionProposalResponseErrorHandler} = require('khala-fabric-sdk-node/chaincode');
const ClientUtil = require('khala-fabric-sdk-node/client');
const ChannelUtil = require('khala-fabric-sdk-node/channel');
const {initialize, endorsementHintsBuilder} = require('khala-fabric-sdk-node/serviceDiscovery');
const {txTimerPromise} = require('khala-fabric-sdk-node/chaincodeHelper');
const Config = require('./configHelper');
const prepareChannel = async (channelName, userID) => {
	const activePeers = await Config.getActiveDiscoveryPeers();
	const peer = activePeers[0];
	const user = await Config.getUser(userID);
	const client = ClientUtil.new();
	ClientUtil.setUser(client, user);
	const channel = ChannelUtil.new(client, channelName);

	await initialize(channel, peer, {asLocalhost: false, TLS: true});
	return channel;
};
exports.prepareChannel = prepareChannel;
/**
 * This method is enhanced to use the discovered peers to send the endorsement proposal
 *
 * @param channel
 * @param channelName
 * @param userID
 * @param endorsement_hints
 * @param chaincodeId
 * @param fcn
 * @param args
 * @param transientMap
 * @param proposalTimeout
 * @returns {Promise<[TransactionRequest,Channel]>}
 */
const transactionProposalDefault = async (
	channelName, userID,
	endorsement_hints,
	{chaincodeId, fcn, args, transientMap},
	proposalTimeout = 30000
) => {
	const channel = await prepareChannel(channelName, userID);
	const txId = channel._clientContext.newTransactionID();
	const request = {
		txId,
		chaincodeId,
		fcn,
		args,
		transientMap: transientMapTransform(transientMap),
		endorsement_hints: endorsementHintsBuilder(endorsement_hints)
	};

	const [proposalResponses, proposal] = await channel.sendTransactionProposal(request, proposalTimeout);
	transactionProposalResponseErrorHandler(proposalResponses, proposal);
	return [{
		proposalResponses,
		proposal,
		txId
	}, channel];
};
exports.queryDefault = async (channelName, userID,
                              endorsement_hints,
                              {chaincodeId, fcn, args, transientMap},
                              proposalTimeout) => {
	const result = await transactionProposalDefault(channelName, userID,
		endorsement_hints,
		{chaincodeId, fcn, args, transientMap},
		proposalTimeout);
	return result[0];
};
const invokeCommitDefault = async (channel, nextRequest, timeout = 30000) => {
	// The invokeCommit method is enhanced by service discovery, so no need to pass in orderer
	return channel.sendTransaction(nextRequest, timeout);
};
/**
 * Invoke chaincode in an complete transaction flow:
 *
 * @param channelName
 * @param userID
 * @param endorsement_hints
 * @param {ChannelEventHub[]} [eventHubs] optional
 * @param chaincodeId
 * @param fcn
 * @param args
 * @param transientMap
 * @param proposalTimeout
 * @param commitTimeout
 * @param eventTimeout
 * @returns {Promise<{txEventResponses: *, proposalResponses: *, status: string}>}
 */
const invokeDefault = async (
	channelName, userID,
	endorsement_hints,
	eventHubs = [],
	{chaincodeId, fcn, args, transientMap},
	proposalTimeout,
	commitTimeout,
	eventTimeout = 30000
) => {
	logger.info('chaincode:invokeDefault', `Invoke chaincode [${chaincodeId}::${fcn}]`);
	const [nextRequest, channel] = await transactionProposalDefault(
		channelName, userID,
		endorsement_hints,
		{chaincodeId, fcn, args, transientMap},
		proposalTimeout
	);

	const {txId, proposalResponses} = nextRequest;
	const promises = [];

	if (eventHubs.length === 0) {
		const mspids = channel.getOrganizations().map(({id}) => id);
		eventHubs = mspids.map(mspid => channel.getChannelEventHubsForOrg(mspid)).reduce((c1, c2) => c1.concat(c2));
	}

	for (const eventHub of eventHubs) {
		eventHub.connect(true);
		promises.push(txTimerPromise(eventHub, {txId}, eventTimeout));
	}
	const orderers = await Config.getActiveOrderers();
	Config.fixChannelOrderers(channel, orderers);
	const res = await invokeCommitDefault(channel, nextRequest, commitTimeout);
	const txEventResponses = await Promise.all(promises);

	return {txEventResponses, proposalResponses, status: res.status};
};

exports.invokeDefault = invokeDefault;