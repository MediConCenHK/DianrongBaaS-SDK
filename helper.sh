#!/usr/bin/env bash
set -e
linkPeer() {
    sudo ln -s /home/setup/config/peer/peer /usr/bin/peer
}
attachLog(){
    tail -f /data/hyperledger/log/peer.log
}
$1
