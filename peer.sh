#!/usr/bin/env bash
set -e
export CORE_PEER_ADDRESS=peer1.test.mediconcen.com:7051
export CORE_PEER_LOCALMSPID=mccMSP
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt
export CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key
export CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt

linkPeer() {
    sudo ln -s /home/setup/config/peer/peer /usr/bin/peer
}

$1
