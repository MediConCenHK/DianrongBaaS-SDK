#!/usr/bin/env bash
set -e
user=$(whoami)
if [[ ! -d "/data/hyperledger/log" ]]; then
    mkdir -p /data/hyperledger/log
fi
stopPeer() {

    pid=$(ps -fu $user | grep peer | egrep -v "grep|setup" | awk '{print $2}')
    if [[ -n "$pid" ]]; then
        sudo kill -TERM ${pid}
    fi
}
startPeer() {

    export FABRIC_CFG_PATH=/etc/hyperledger/fabric
    export CORE_VM_ENDPOINT=unix:///var/run/docker.sock
    export GODEBUG=netdns=go

    export CORE_PEER_FILESYSTEMPATH=/data/hyperledger/production
    export CORE_PEER_ID=peer1.test.mediconcen.com
    export CORE_PEER_ADDRESS=peer1.test.mediconcen.com:7051
    export CORE_PEER_CHAINCODELISTENADDRESS=peer1.test.mediconcen.com:7052
    export CORE_PEER_GOSSIP_EXTERNALENDPOINT=peer1.test.mediconcen.com:7051
    export CORE_PEER_LOCALMSPID=mccMSP
    export CORE_LOGGING_LEVEL=INFO
    export CORE_PEER_ENDORSER_ENABLED=true
    export CORE_PEER_GOSSIP_USELEADERELECTION=true
    export CORE_PEER_GOSSIP_ORGLEADER=false
    export CORE_PEER_GOSSIP_SKIPHANDSHAKE=true
    export CORE_PEER_PROFILE_ENABLED=false
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt
    export CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key
    export CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt
    export PATH=/home/setup/config/peer:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games
    peer node start >/data/hyperledger/log/peer.log 2>&1
}
restartPeer() {
    stopPeer
    startPeer &
}
stopOrderer() {
    pid=$(ps -fu $user | grep orderer | egrep -v "grep|setup" | awk '{print $2}')
    if [[ -n "$pid" ]]; then
        sudo kill -TERM ${pid}
    fi

}
startOrderer() {
    export FABRIC_CFG_PATH=/etc/hyperledger/fabric
    export ORDERER_GENERAL_LISTENADDRESS=0.0.0.0
    export GODEBUG=netdns=go

    export ORDERER_GENERAL_LOCALMSPID=mccMSP
    export ORDERER_FILELEDGER_LOCATION=/data/hyperledger/production/orderer
    export ORDERER_KAFKA_TLS_ENABLED=true
    export ORDERER_KAFKA_TLS_PRIVATEKEY_FILE=/home/setup/config/orderer/ordererKafkaTLS0/client-key-orderer.pem
    export ORDERER_KAFKA_TLS_CERTIFICATE_FILE=/home/setup/config/orderer/ordererKafkaTLS0/client-cert-signed-orderer.pem
    export ORDERER_KAFKA_TLS_ROOTCAS_FILE=/home/setup/config/orderer/ordererKafkaTLS0/ca-cert.pem
    export ORDERER_GENERAL_LOGLEVEL=INFO
    export ORDERER_GENERAL_GENESISMETHOD=file
    export ORDERER_GENERAL_GENESISFILE=/var/hyperledger/orderer/genesis.block
    export ORDERER_GENERAL_LOCALMSPDIR=/var/hyperledger/orderer/msp
    export ORDERER_KAFKA_RETRY_SHORTINTERVAL=1s
    export ORDERER_KAFKA_RETRY_SHORTTOTAL=10m
    export ORDERER_GENERAL_TLS_ENABLED=true
    export ORDERER_GENERAL_TLS_PRIVATEKEY=/var/hyperledger/orderer/tls/server.key
    export ORDERER_GENERAL_TLS_CERTIFICATE=/var/hyperledger/orderer/tls/server.crt
    export ORDERER_GENERAL_TLS_ROOTCAS=[/var/hyperledger/orderer/tls/ca.crt]
    export CONFIGTX_ORDERER_ORDERERTYPE=kafka
    export CONFIGTX_ORDERER_KAFKA_BROKERS=[kafka0.prod.mediconcen.com:9093,kafka1.prod.mediconcen.com:9093,kafka2.prod.mediconcen.com:9093,kafka3.prod.mediconcen.com:9093]
    export PATH=/home/setup/config/orderer:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games
    orderer >/data/hyperledger/log/orderer.log 2>&1

}
restartOrderer() {
    stopOrderer
    startOrderer &
}

$1
