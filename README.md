# DianrongBaaS-sdk
点融区块链云服务平台 开发软件包

## Notes
- channels.json
    - 如果peer，orderer没有url，则必须提供clientKey和clientPem的相对$HOME路径; if no `url` property specified in peer, orderer config, 
    then `clientKey` and `clientPem` are required as path relative to $HOME