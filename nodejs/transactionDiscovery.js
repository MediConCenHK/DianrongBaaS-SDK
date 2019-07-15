const logger = require('khala-fabric-sdk-node/logger').new('transactionDiscovery');
const {transientMapTransform} = require('khala-fabric-sdk-node/chaincode');
const {txTimerPromise} = require('khala-fabric-sdk-node/chaincodeHelper');
/**
 * This method is enhanced to use the discovered peers to send the endorsement proposal
 *
 * @param channel
 * @param targets: Optional. use the peers included in the "targets" to endorse the proposal. If there is no "targets" parameter, the endorsement request will be handled by the endorsement handler.
 * @param required: Optional. An array of strings that represent the names of peers that are required for the endorsement. These will be the only peers which the proposal will be sent. This list only applies to endorsements using the discovery service.
 * @param ignore: Optional. An array of strings that represent the names of peers that should be ignored by the endorsement. This list only applies to endorsements using the discovery service.
 * @param preferred: Optional. An array of strings that represent the names of peers that should be given priority by the endorsement. Priority means that these peers will be chosen first for endorsements when an endorsement plan has more peers in a group then needed to satisfy the endorsement policy. This list only applies to endorsements using the discovery service.
 * @param requiredOrgs: Optional. An array of strings that represent the names of an organization's MSP id that are required for the endorsement. Only peers in these organizations will be sent the proposal. This list only applies to endorsements using the discovery service.
 * @param ignoreOrgs: Optional. An array of strings that represent the names of an organization's MSP id that should be ignored by the endorsement. This list only applies to endorsements using the discovery service.
 * @param preferredOrgs: Optional. An array of strings that represent the names of an organization's MSP id that should be given priority by the endorsement. Peers within an organization may have their ledger height considered using the optional property preferredHeightGap before being added to the priority list. This list only applies to endorsements using the discovery service.
 * @param chaincodeId
 * @param fcn
 * @param args
 * @param transientMap
 * @param proposalTimeout
 * @returns {Promise<TransactionRequest>}
 */
const transactionProposalDefault = async (channel,
                                          targets,
                                          {required, ignore, preferred, requiredOrgs, ignoreOrgs, preferredOrgs},
                                          {chaincodeId, fcn, args, transientMap},
                                          proposalTimeout) => {
	const txId = channel._clientContext.newTransactionID();
	const request = {
		txId,
		chaincodeId,
		fcn,
		args,
		transientMap: transientMapTransform(transientMap),
		required, ignore, preferred, requiredOrgs, ignoreOrgs, preferredOrgs
	};

	const [proposalResponses, proposal] = await channel.sendTransactionProposal(request, proposalTimeout);

	return {
		proposalResponses, proposal, txId
	};
};
exports.queryDefault = transactionProposalDefault;
const invokeCommitDefault = async (channel, nextRequest, timeout = 30000) => {
	//The invokeCommit method is enhanced by service discovery, so no need to pass in orderer
	return channel.sendTransaction(nextRequest, timeout);
};
/**
 * Invoke chaincode in an complete transaction flow:
 * 1. send transaction proposal to endorsers
 * 2. validate and combine the proposal response, then send the transaction to orderer
 * 3. wait until the transaction event received
 *
 * @param channel
 * @param targets: Optional. use the peers included in the "targets" to endorse the proposal. If there is no "targets" parameter, the endorsement request will be handled by the endorsement handler.
 * @param required: Optional. An array of strings that represent the names of peers that are required for the endorsement. These will be the only peers which the proposal will be sent. This list only applies to endorsements using the discovery service.
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
exports.invokeDefault = async (channel,
                               targets,
                               discoveryRestrictions,
                               mspids,
                               {chaincodeId, fcn, args, transientMap},
                               proposalTimeout = 30000,
                               commitTimeout = 30000,
                               eventTimeout = 30000) => {
	logger.info('chaincode:invokeEnhanced', `Invoke chaincode [${chaincodeId}::${fcn}]`);

	const nextRequest = await transactionProposalDefault(
		channel,
		targets,
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
	const eventHubs = mspids.map(
		mspid => channel.getChannelEventHubsForOrg(mspid)
	).reduce((c1, c2) => c1.concat(c2));

	for (const eventHub of eventHubs) {
		eventHub.connect(true);
		promises.push(txTimerPromise(eventHub, {txId}, eventTimeout));
	}

	const res = await invokeCommitDefault(channel, nextRequest, commitTimeout);
	logger.info('SendTransaction response: ', res.status);
	const txEventResponses = await Promise.all(promises);

	return {txEventResponses, proposalResponses};
};
