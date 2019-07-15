#!/usr/bin/env bash
set -e
linkPeer() {
    sudo ln -s /home/setup/config/peer/peer /usr/bin/peer
}
attachLog() {
    tail -f /data/hyperledger/log/peer.log
}
disableDockerAutoUpgrade() {
    local NotToUpgradeList=/etc/apt/apt.conf.d/50unattended-upgrades
    echo "To disable docker auto upgrade"

    if ! docker --version ; then
        echo "Skipped, docker is not installed"
        return
    fi

    if [[ ! -f "$NotToUpgradeList" ]]; then
        echo "Skipped, because /etc/apt/apt.conf.d/50unattended-upgrades not exist"
        return
    fi

    if sudo grep "docker" ${NotToUpgradeList}; then
        echo "Skipped, because already added docker into upgrade package-blacklist in ${NotToUpgradeList}"
        return
    fi

    sudo sed -i '/Unattended-Upgrade::Package-Blacklist/a\    "docker";' /etc/apt/apt.conf.d/50unattended-upgrades
    echo "Added docker into upgrade package-blacklist in ${NotToUpgradeList}"
}

$1
