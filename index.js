const net = require('net');
const dns = require('dns');

const servName = "irc.drakeluce.com"

class IRCChannel{
    constructor(name){
        this.name = name;
        this.clients = [];
    }
    addClient(client){
        this.clients.push(client);
        const resp = ":" + client.nick + "!~" + client.username + "@" + client.hostname + " JOIN " + this.name;
        this.clients.forEach(function(anyClient){
            anyClient.socket.write(resp + "\r\n");
        });
    }
}

class IRCChannelList{
    constructor(){
        this.list = [];
    }
    addChannel(channelName){
        this.list.push(channelName);
    }
    exists(channelName){
        for(let channel in this.list){
            if(channel.name == channelName){
                return true;
            }
        }
        return false;
    }
    getChannel(channelName){
        let found = null;
        for(let channel in this.list){
            if(channel.name == channelName){
                return channel;
            }
        }
        return null;
    }
}

class IRCClient {
    constructor(ip, socket){
        this.ip = ip;
        this.socket = socket;
    }
    setRealName(realName){
        this.realName = realName;
    }
    setUsername(username){
        this.username = username;
    }
    setMode(mode){
        this.mode = mode;
    }
    setNick(nick){
        this.nick = nick;
    }
    createUser(username, mode, realName){
        this.setUsername(username);
        this.setMode(mode);
        this.setRealName(realName);
    }
    checkComplete(){
        if(this.ip && this.realName && this.username && this.mode && this.nick){
            return true;
        }
        return false;
    }
    toString(){
        return this.username + ", " + this.mode + ", " + this.realName + ", " + this.nick;
    }
}

const channelList = new IRCChannelList();

const server = net.createServer(function(socket) {
    socket.write("Echo server\r\n");

    const newClient = new IRCClient(socket.remoteAddress, socket);
    socket.pipe(socket);

    const sendMOTD = function(){
        socket.write("Yo, welcome to the server " + newClient.nick + "!\r\n");
    }

    socket.on('error', function(err){
        console.log(err);
    })

    socket.on('data', function (data) {
        const commands = data.toString().split(/\r?\n/);
        commands.forEach(function(command){
            const commandParts = command.split(" ");
            switch(commandParts[0]){
                case "USER":
                    const username = commandParts[1];
                    const mode = commandParts[2];
                    const realName = commandParts.slice(4).join(" ");
                    newClient.createUser(username, mode, realName);
                    console.log(newClient.toString());
                    break;
                case "NICK":
                    const nick = commandParts[1];
                    newClient.setNick(nick);
                    console.log(newClient.toString());
                    break;
                case "PING":
                    const data = commandParts[1];
                    socket.write("PONG" + data + "\r\n");
                    break;
                case "JOIN":
                    const channelName = commandParts[1];
                    if(!channelList.exists(channelName)){
                        console.log("New channel " + channelName);
                        const channel = new IRCChannel(channelName);
                        channel.addClient(newClient);
                        channelList.addChannel(channel);
                    }else{
                        const channel = channelList.getChannel(channelName);
                        channel.addClient(newClient)
                    }
            }
            if(newClient.checkComplete() && !newClient.done){
                newClient.done = true;
                if(!newClient.ip){
                    newClient.ip = "99.251.71.140";
                }
                dns.reverse(newClient.ip, function(err, hostnames){
                    newClient.hostname = hostnames[0];
                    sendMOTD();
                });
            }
        });
    });
});

server.listen(6667, '127.0.0.1');
