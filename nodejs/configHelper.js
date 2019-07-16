if (!process.env.channelsJSONPath) {
	throw Error('process.env.channelsJSONPath not found');
}
const globalConfig = require(process.env.channelsJSONPath);

const path = require('path');
const fs = require('fs');
const UserUtil = require('khala-fabric-sdk-node/user');
const OrdererUtil = require('khala-fabric-sdk-node/orderer');
const PeerUtil = require('khala-fabric-sdk-node/peer');
const {nodeUtil} = require('khala-fabric-sdk-node/helper');
const {homeResolve} = nodeUtil.helper();
const {findKeyFiles, findCertFiles} = require('khala-fabric-sdk-node/path');

exports.globalConfig = globalConfig;

/**
 *
 * @returns {Promise<Peer[]>}
 */
exports.getActivePeers = async () => {
	const allPeers = globalConfig.peers.map(({tlsCaCert, hostname}) => {
		const pem = fs.readFileSync(homeResolve(tlsCaCert)).toString();
		return PeerUtil.new({peerPort: 7051, host: hostname, peerHostName: hostname, pem});
	});
	const result = [];
	for (const peer of allPeers) {
		if (await PeerUtil.ping(peer)) {
			result.push(peer);
		}
	}
	return result;
};

exports.getUser = async (userID = 'appUser') => {
	const {username, mspId, credentialPath} = globalConfig.users[userID];
	const {keyPath, certPath} = getUserKeyPathFromDRClientOutput(credentialPath);

	const key = fs.readFileSync(keyPath).toString();
	const certificate = fs.readFileSync(certPath).toString();
	return await UserUtil.build(username, {key, certificate}, mspId);
};

exports.getActiveOrderers = async () => {
	const orderers = globalConfig.orderers.map(({tlsCaCert, hostname}) => {
		return OrdererUtil.new({
			ordererPort: 7050,
			ordererHostName: hostname,
			host: hostname,
			cert: homeResolve(tlsCaCert)
		});
	});
	const result = [];
	for (const orderer of orderers) {
		if (await OrdererUtil.ping(orderer)) {
			result.push(orderer);
		}
	}
	return result;

};


const getUserKeyPathFromDRClientOutput = (credentialPath) => {
	const absoluteCredentialPath = homeResolve(credentialPath);
	const keyDirPath = path.resolve(absoluteCredentialPath, 'keystore');
	const certDirPath = path.resolve(absoluteCredentialPath, 'signcerts');


	return {
		keyPath: findKeyFiles(keyDirPath)[0],
		certPath: findCertFiles(certDirPath)[0]
	};
};
