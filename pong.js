'use strict';

const fs = require('fs'),
    dgram = require('dgram');

const MAGIC = Buffer.from([0x00, 0xff, 0xff, 0x00, 0xfe, 0xfe, 0xfe, 0xfe, 0xfd, 0xfd, 0xfd, 0xfd, 0x12, 0x34, 0x56, 0x78]),
    ID_UNCONNECTED_PING = 0x01,
    ID_UNCONNECTED_PONG = 0x1c;

var config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
config.host = config.host || '0.0.0.0';
config.port = config.port || 19132;
config.game = config.game || 'MCPE';
config.motd = config.motd || ['RakNet Pong'];
config.protocol = config.protocol || 361;
config.version = config.version || '1.12.1';
config.player_count = config.player_count || {};
config.max_player_count = config.max_player_count || {};
config.sub_motd = config.sub_motd || ['PING PING PONG PONG'];
config.game_type = config.game_type || 'Survival';
config.player_count.min = config.player_count.min || 0;
config.player_count.max = config.player_count.max || 19;
config.max_player_count.min = config.max_player_count.min || 20;
config.max_player_count.max = config.max_player_count.max || 99;
if (Object.prototype.toString.apply(config.motd) === '[object String]' && config.motd.length) {
    config.motd = [config.motd];
} else if (Object.prototype.toString.apply(config.motd) !== '[object Array]' || config.motd.length == 0) {
    config.motd = ['RakNet Pong'];
}
if (Object.prototype.toString.apply(config.sub_motd) === '[object String]' && config.sub_motd.length) {
    config.sub_motd = [config.sub_motd];
} else if (Object.prototype.toString.apply(config.sub_motd) !== '[object Array]' || config.sub_motd.length == 0) {
    config.sub_motd = ['PING PING PONG PONG'];
}

var server = dgram.createSocket('udp4'),
    serverId = BigInt(Math.floor(Math.random() * 10000000000000000)),
    timer,
    motdIndex = 0,
    subMotdIndex = 0;

function pong(port, host, pingTime) {
    let data = Buffer.alloc(17),
        serverName = `${config.game};${config.motd[motdIndex]};${config.protocol};${config.version};${Math.floor(Math.random() * (config.player_count.max - config.player_count.min + 1) + config.player_count.min)};${Math.floor(Math.random() * (config.max_player_count.max - config.max_player_count.min + 1) + config.max_player_count.min)};${serverId};${config.sub_motd[subMotdIndex]};${config.game_type};1`;
    data.writeInt8(ID_UNCONNECTED_PONG, 0); // pid
    data.writeBigInt64BE(pingTime, 1);
    data.writeBigInt64BE(serverId, 9);
    data = Buffer.concat([data, MAGIC], 1024);
    data.writeInt16BE(serverName.length, 33);
    data.write(serverName, 35, serverName.length, 'utf8');
    server.send(data.subarray(0, 35 + serverName.length), port, host, (err) => {});
}

server.on('error', (err) => {
    console.error(`server error:\n${err}`);
});

server.on('message', (msg, rinfo) => {
    try {
        if ((msg.readInt8(0) & 0xff) == ID_UNCONNECTED_PING) { // pid
            pong(rinfo.port, rinfo.address, msg.readBigInt64BE(1));
            //msg.readMagic(9);
            //msg.readBigInt64BE(25); // clientId
        }
    } catch (err) {
        console.error(`server received incorrect data:\n${msg}\n${err}`);
    }
});

server.on('listening', () => {
    const address = server.address();
    console.log(`server started on ${address.address}:${address.port}`);
    timer = setInterval(() => {
        if (motdIndex < config.motd.length - 1) {
            ++motdIndex;
        } else {
            motdIndex = 0;
        }
        if (subMotdIndex < config.motd.length - 1) {
            ++subMotdIndex;
        } else {
            subMotdIndex = 0;
        }
    }, 5000);
});

server.on('close', () => {
    try {
        clearInterval(timer);
    } catch (err) {}
});

server.bind(config.port, config.host);
