#!/usr/bin/env bash
set -e
export CORE_PEER_ADDRESS=peer1.test.mediconcen.com:7051
export CORE_PEER_LOCALMSPID=mccMSP

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt
export CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key
export CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt

remain_params=""
for ((i = 2; i <= ${#}; i++)); do
	j=${!i}
	remain_params="$remain_params $j"
done

peerSDK="curl --silent --show-error https://raw.githubusercontent.com/davidkhala/fabric-common/release-1.4/bash/peer.sh"
$peerSDK | bash -s $1 $remain_params

