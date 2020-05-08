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

exports.globalConfig = globalConfig;

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
exports.PeerFromConfig = parsePeerConfig;

/**
 *
 * @param [orgName]
 * @param {function} [peerFilter]
 * @returns {Promise<Client.Peer[]>}
 */
exports.getActivePeers = async (orgName, peerFilter = () => true) => {
	const orgFilter = orgName ? _orgName => _orgName === _orgName : () => true;
	const orgs = Object.keys(globalConfig.organizations).filter(orgFilter);
	const result = [];
	for (const orgName of orgs) {
		const orgPeers = globalConfig.organizations[orgName].peers.map(parsePeerConfig);
		for(const peer of orgPeers){
			if (await Peer.ping(peer)) {
				result.push(peer);
			}
		}
	}
	return result;
};

exports.getUser = (userID = 'appUser') => {
	const {username, mspId, credentialPath} = globalConfig.users[userID];
	const {keyPath, certPath} = getUserKeyPathFromDRClientOutput(credentialPath);

	const key = fs.readFileSync(keyPath).toString();
	const certificate = fs.readFileSync(certPath).toString();
	const userBuilder = new UserBuilder({name: username});
	return userBuilder.build({key, certificate, mspId});
};
exports.getClientOfUser = (userID) => {
	const clientUtil = new ClientUtil();
	const user = exports.getUser(userID);
	clientUtil.setUser(user);
	return clientUtil.client;
};
/**
 *
 * @param {function} ordererFilter
 * @return {Promise<OrdererUtil[]>}
 */
exports.getActiveOrderers = async (ordererFilter = () => true) => {
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
