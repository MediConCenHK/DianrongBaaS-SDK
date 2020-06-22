if (!process.env.channelsJSONPath) {
	throw Error('process.env.channelsJSONPath not found');
}
const globalConfig = require(process.env.channelsJSONPath);

const path = require('path');
const fs = require('fs');
const PeerUtil = require('khala-fabric-sdk-node-builder/peer');
const Peer = require('fabric-client/lib/Peer');
const OrdererUtil = require('khala-fabric-sdk-node-builder/orderer');
const Orderer = require('fabric-client/lib/Orderer');
const UserBuilder = require('khala-fabric-sdk-node-builder/user');
const ClientUtil = require('khala-fabric-sdk-node-builder/client');
const {homeResolve} = require('khala-light-util');
const {findKeyFiles, findCertFiles} = require('khala-fabric-formatter/path');


const parsePeerConfig = ({tlsCaCert, hostname, url, clientKey, clientCert}) => {
	const pem = fs.readFileSync(homeResolve(tlsCaCert)).toString();
	if (url) {
		return new Peer(url, {
			pem,
			'ssl-target-name-override': hostname
		});
	}
	clientKey = fs.readFileSync(homeResolve(clientKey)).toString();
	clientCert = fs.readFileSync(homeResolve(clientCert)).toString();
	const peerUtil = new PeerUtil({peerPort: 7051, host: hostname, pem, clientKey, clientCert});
	return peerUtil.peer;
};

const getPeersCallback = (orgName) => {
	const orgConfig = globalConfig.organizations[orgName];
	return orgConfig.peers.map(parsePeerConfig);
};

const getAllPeers = () => {
	return Object.keys(globalConfig.organizations).map(getPeersCallback).reduce((result, peers) => {
		return result.concat(peers);
	}, []);
};
/**
 *
 * @param {string} [orgName]
 * @returns {Promise<Client.Peer[]>}
 */
const getActivePeers = async (orgName) => {
	const peers = orgName ? getPeersCallback(orgName) : getAllPeers();
	const result = [];
	for (const peer of peers) {
		if (await PeerUtil.ping(peer)) {
			result.push(peer);
		}
	}
	return result;
};

const getUser = (userID = 'appUser') => {
	const {username, mspId, credentialPath} = globalConfig.users[userID];
	const {keyPath, certPath} = getUserKeyPathFromDRClientOutput(credentialPath);

	const key = fs.readFileSync(keyPath).toString();
	const certificate = fs.readFileSync(certPath).toString();
	const userBuilder = new UserBuilder({name: username});
	return userBuilder.build({key, certificate, mspId});
};
const getClientOfUser = (userID) => {
	const clientUtil = new ClientUtil();
	const user = getUser(userID);
	clientUtil.setUser(user);
	return clientUtil.client;
};
/**
 *
 * @param {function} ordererFilter
 * @return {Promise<OrdererUtil[]>}
 */
const getActiveOrderers = async (ordererFilter = () => true) => {
	const orderers = globalConfig.orderers.map(({tlsCaCert, hostname, url, clientKey, clientCert}) => {
		const pem = fs.readFileSync(homeResolve(tlsCaCert)).toString();
		if (url) {
			return new Orderer(url, {
				pem,
				'ssl-target-name-override': hostname
			});
		} else {
			clientKey = fs.readFileSync(homeResolve(clientKey)).toString();
			clientCert = fs.readFileSync(homeResolve(clientCert)).toString();
			const ordererBuilder = new OrdererUtil({
				ordererPort: 7050, host: hostname,
				pem,
				clientKey, clientCert
			});
			return ordererBuilder.orderer;
		}
	});
	const result = [];
	for (const orderer of orderers.filter(ordererFilter)) {
		if (await OrdererUtil.ping(orderer)) {
			result.push(orderer);
		}
	}
	return result;
};

const getUserKeyPathFromDRClientOutput = credentialPath => {
	const absoluteCredentialPath = homeResolve(credentialPath);
	const keyDirPath = path.resolve(absoluteCredentialPath, 'keystore');
	const certDirPath = path.resolve(absoluteCredentialPath, 'signcerts');

	return {
		keyPath: findKeyFiles(keyDirPath)[0],
		certPath: findCertFiles(certDirPath)[0]
	};
};

module.exports = {
	globalConfig,
	getPeersCallback,
	PeerFromConfig: parsePeerConfig,
	getActivePeers,
	getActiveOrderers,
	getClientOfUser,
	getUser,
};
