if (!process.env.channelsJSONPath) {
	throw Error('process.env.channelsJSONPath not found');
}
const globalConfig = require(process.env.channelsJSONPath);

const path = require('path');
const fs = require('fs');
const Peer = require('khala-fabric-sdk-node/peer');
const Orderer = require('khala-fabric-sdk-node/orderer');
const User = require('khala-fabric-sdk-node/user');
const Client = require('khala-fabric-sdk-node/client');
const {homeResolve} = require('khala-light-util');
const {findKeyFiles, findCertFiles} = require('khala-fabric-sdk-node/path');

exports.globalConfig = globalConfig;

const parsePeerConfig = ({tlsCaCert, hostname, url, clientKey, clientCert}) => {
	const pem = fs.readFileSync(homeResolve(tlsCaCert)).toString();
	if (url) {
		return new Peer.Peer(url, {
			pem,
			'ssl-target-name-override': hostname
		});
	}
	clientKey = fs.readFileSync(homeResolve(clientKey)).toString();
	clientCert = fs.readFileSync(homeResolve(clientCert)).toString();
	return Peer.new({peerPort: 7051, host: hostname, pem, clientKey, clientCert});
};
exports.PeerFromConfig = parsePeerConfig;
/**
 *
 * @returns {Promise<Client.Peer[]>}
 */
exports.getActiveDiscoveryPeers = async () => {
	const allPeers = globalConfig.discoveryPeers.map(parsePeerConfig);
	const result = [];
	for (const peer of allPeers) {
		if (await Peer.ping(peer)) {
			result.push(peer);
		}
	}
	return result;
};
/**
 *
 * @param {function} [peerFilter]
 * @returns {Promise<Client.Peer[]>}
 */
exports.getActivePeers = async (peerFilter = () => true) => {
	const allPeers = globalConfig.peers.map(parsePeerConfig);
	const result = [];
	for (const peer of allPeers.filter(peerFilter)) {
		if (await Peer.ping(peer)) {
			result.push(peer);
		}
	}
	return result;
};

exports.getUser = (userID = 'appUser') => {
	const {username, mspId, credentialPath} = globalConfig.users[userID];
	const {keyPath, certPath} = getUserKeyPathFromDRClientOutput(credentialPath);

	const key = fs.readFileSync(keyPath).toString();
	const certificate = fs.readFileSync(certPath).toString();
	return User.build(username, {key, certificate}, mspId);
};
exports.getClientOfUser = (userID) => {
	const client = Client.new();
	const user = exports.getUser(userID);
	Client.setUser(client, user);
	return client;
};
/**
 *
 * @param {function} ordererFilter
 * @return {Promise<Orderer[]>}
 */
exports.getActiveOrderers = async (ordererFilter = () => true) => {
	const orderers = globalConfig.orderers.map(({tlsCaCert, hostname, url, clientKey, clientCert}) => {
		const pem = fs.readFileSync(homeResolve(tlsCaCert)).toString();
		if (url) {
			return new Orderer.Orderer(url, {
				pem,
				'ssl-target-name-override': hostname
			});
		} else {
			clientKey = fs.readFileSync(homeResolve(clientKey)).toString();
			clientCert = fs.readFileSync(homeResolve(clientCert)).toString();
			return Orderer.new({
				ordererPort: 7050, host: hostname,
				pem,
				clientKey, clientCert
			});
		}
	});
	const result = [];
	for (const orderer of orderers.filter(ordererFilter)) {
		if (await Orderer.ping(orderer)) {
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
/**
 * Fabric (v1.4) has a bug:
 * when orderers belongs to different organizations, the service discovery mismatches the orderer to other org's MSP,
 * which leads to the fabric-client uses the wrong tls CA cert to verify the orderer's tls server cert during SSL
 * handshake.
 * At client side, it prints log:
 *    "E0201 21:23:54.835298000 4531140032 ssl_transport_security.cc:1227]
 *     Handshake failed with fatal error SSL_ERROR_SSL:
 *     error:14090086:SSL routines:ssl3_get_server_certificate:certificate verify failed."
 * The solution is: after channel initialization based on the service discovery, correct the channel's orderers with
 * the static configuration. However, the client also can retry other one, if one orderer is fault.
 *
 * @param {Channel} channel
 * @param {Orderer[]} orderers
 */
exports.fixChannelOrderers = (channel, orderers) => {
	channel._orderers = orderers;
};
