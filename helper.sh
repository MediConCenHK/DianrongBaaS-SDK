#!/usr/bin/env bash
set -e
linkPeer() {
	sudo ln -s /opt/dianrong/hyperledger/peer /usr/bin/peer
}
linkOrderer() {
	sudo ln -s /opt/dianrong/hyperledger/orderer /usr/bin/orderer
}
peerLog() {
	tail -f /data/hyperledger/log/peer/peer.log
}
ordererLog() {
	tail -f /data/hyperledger/log/orderer/orderer.log
}
ordererService() {
	modes=('start' 'stop' 'restart')
	if [[ " ${modes[*]} " == *"$1"* ]]; then
		sudo service orderer $1
	fi
}
peerService() {
	modes=('start' 'stop' 'restart')
	if [[ " ${modes[*]} " == *"$1"* ]]; then
		sudo service peer $1
	fi
}
couchdbService() {
	modes=('start' 'stop' 'restart')
	if [[ " ${modes[*]} " == *"$1"* ]]; then
		sudo service couchdb $1
	fi
}

disableDockerAutoUpgrade() {
	local NotToUpgradeList=/etc/apt/apt.conf.d/50unattended-upgrades
	echo "To disable docker auto upgrade"

	if ! docker --version; then
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
