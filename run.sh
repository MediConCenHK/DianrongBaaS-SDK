#!/usr/bin/env bash
set -e
stop(){
    user=$(whoami)
    pid=$(ps -fu $user| grep peer | egrep -v "grep|setup" | awk '{print $2}')
    if [ -n "$pid" ]; then
        sudo kill -TERM $pid
    fi
}
start(){

    if [ ! -d "/data/hyperledger/log" ]; then
      mkdir -p /data/hyperledger/log
    fi

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
    peer node start > /data/hyperledger/log/peer.log 2>&1
}
restart(){
    stop
    start &
}
$1

