const logger = require('khala-fabric-sdk-node/logger').new('transactionDiscovery');
const {transientMapTransform, transactionProposalResponseErrorHandler} = require('khala-fabric-sdk-node/chaincode');
const {initialize, endorsementHintsBuilder} = require('khala-fabric-sdk-node/serviceDiscovery');
const {txTimerPromise} = require('khala-fabric-sdk-node/chaincodeHelper');
exports.prepareChannel = async (channel, peer = channel.getPeers()[0]) => {
	return await initialize(channel, peer, {asLocalhost: false, TLS: true});
};
/**
 * This method is enhanced to use the discovered peers to send the endorsement proposal
 *
 * @param channel
 * @param endorsement_hints
 * @param chaincodeId
 * @param fcn
 * @param args
 * @param transientMap
 * @param proposalTimeout
 * @returns {Promise<TransactionRequest>}
 */
const transactionProposalDefault = async (
	channel,
	endorsement_hints,
	{chaincodeId, fcn, args, transientMap},
	proposalTimeout = 30000
) => {
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
	return {
		proposalResponses,
		proposal,
		txId
	};
};
exports.queryDefault = transactionProposalDefault;
const invokeCommitDefault = async (channel, nextRequest, timeout = 30000) => {
	// The invokeCommit method is enhanced by service discovery, so no need to pass in orderer
	return channel.sendTransaction(nextRequest, timeout);
};
/**
 * Invoke chaincode in an complete transaction flow:
 *
 * @param channel
 * @param discoveryRestrictions
 * @param {string[]} [mspids] optional target mspid array for eventHub
 * @param chaincodeId
 * @param fcn
 * @param args
 * @param transientMap
 * @param proposalTimeout
 * @param commitTimeout
 * @param eventTimeout
 * @returns {Promise<{txEventResponses: any[], proposalResponses: TransactionRequest.proposalResponses}>}
 */
exports.invokeDefault = async (
	channel,
	discoveryRestrictions,
	mspids,
	{chaincodeId, fcn, args, transientMap},
	proposalTimeout,
	commitTimeout,
	eventTimeout = 30000
) => {
	logger.info('chaincode:invokeEnhanced', `Invoke chaincode [${chaincodeId}::${fcn}]`);

	const nextRequest = await transactionProposalDefault(
		channel,
		discoveryRestrictions,
		{
			chaincodeId,
			fcn,
			args,
			transientMap
		},
		proposalTimeout
	);

	const {txId, proposalResponses} = nextRequest;
	const promises = [];

	mspids = Array.isArray(mspids) && mspids.length > 0 ? mspids : channel.getOrganizations().map(({id}) => id);
	const eventHubs = mspids.map(mspid => channel.getChannelEventHubsForOrg(mspid)).reduce((c1, c2) => c1.concat(c2));

	for (const eventHub of eventHubs) {
		eventHub.connect(true);
		promises.push(txTimerPromise(eventHub, {txId}, eventTimeout));
	}

	const res = await invokeCommitDefault(channel, nextRequest, commitTimeout);
	logger.info('SendTransaction response: ', res.status);
	const txEventResponses = await Promise.all(promises);

	return {txEventResponses, proposalResponses};
};
