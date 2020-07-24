bot.on('challstr', function(parts) {
    require("./login.js")(parts[2], parts[3])
});

bot.on('updateuser', (parts) => {
    logger.emit('log', 'Logged in as ' + parts[2]);
    let skipnext = false;
    let found = false;
    for (let i of parts) {
        if (!found && i !== 'formats') continue;
        if (!found && i === 'formats') {
            found = true;
            continue;
        }
        if (skipnext) {
            skipnext = false;
            continue;
        }
        if (i.match(/,\d/)) {
            skipnext = true;
            continue;
        }
        
        let format = i.split(',')[0];
        Tournament.formats[toId(format)] = format;
    }
});

bot.on('c', (parts) => {
    let room = Utils.getRoom(parts[0]);
    let user = Users[toId(parts[3])];
    if (!parts[4]) return;
    let message = parts.slice(4).join('|').trim();
    for (let i in Rooms) {
    if (Rooms[i].tournament && !Rooms[i].tournament.started) Rooms[i].tournament.checkstart();    
    }
    Rooms[room].runChecks(message);
    Monitor.monitor(user.name, message);
    logger.emit('chat', Utils.getRoom(parts[0]), user.name, message);
    if (message.startsWith('/log') && Rooms[room].settings.autohide) {
        if (message.includes("was muted by")) {
            let username = message.split(' was muted ')[0].split(' ').slice(1).join(' ');
            Rooms[room].send('/hidetext ' + username);
        }
    }
    if (message.startsWith('/raw')) {
        message = message.slice(5);
        let regex = new RegExp("<[^\>]+[^/]>", "gi");
        message = message.replace('</summary>', '<br />').replace(regex, '').replace(/<br \/>/gi, '\n')
            .replace(/&gt;/gi, '>').replace(/&lt;/gi, '<').replace(/&quot;/gi, '"').replace(/&amp;/gi, '&').replace(/&apos;/gi, '\'').replace(/&#x2f;/gi, '/');
    }
    let time = parts[2];
    let [cmd, args, val] = Utils.SplitMessage(message);
    const command = cmd;
    if (cmd in Commands) {
        if (typeof Commands[cmd] === 'string') cmd = Commands[cmd];
        let func = Commands[cmd];
        if (typeof func === 'object') {
        let target = toId(args[0]);
        if (!target || !func[target]) {
            target = '';
            args = [''].concat(args);
        }
        if (target in func && typeof func[target] === 'string') target = func[target];
            func = func[target];
            args.shift();
        }
        func(Rooms[room], user, args, val, time, command);
        logger.emit('cmd', cmd, val);
    }
});

bot.on('pm', (parts) => {
    let room = null;
    let user = Users[toId(parts[2])];
    let message = parts.slice(4).join('|').trim();
    if (message.startsWith('|requestpage')) {
        let [blank, type, target, ...page] = message.split('|');
        if (page === "leaderboard") {
            if (!Commands.leaderboard) return user.send("No leaderboard response configured... Contact a bot owner.");
            return Commands.leaderboard(user, user, []);
        } 
    }
    if (message.startsWith('/raw')) {
        message = message.slice(5);
        let regex = new RegExp("<[^\>]+[^/]>", "gi");
        message = message.replace('</summary>', '<br />').replace(regex, '').replace(/<br \/>/gi, '\n')
            .replace(/&gt;/gi, '>').replace(/&lt;/gi, '<').replace(/&quot;/gi, '"').replace(/&amp;/gi, '&').replace(/&apos;/gi, '\'').replace(/&#x2f;/gi, '/');;
    }
    if (!user) {
        Users.add(parts[2]);
        user = Users[toId(parts[2])];
    }
    else logger.emit('pm', user.name, message); // Note: No PM handler exists for the logger.
    let [cmd, args, val] = Utils.SplitMessage(message);
    const command = cmd;
    if (cmd in Commands) {
        if (typeof Commands[cmd] === 'string') cmd = Commands[cmd];
        let func = Commands[cmd];
        if (typeof func === 'object') {
        let target = toId(args[0]);
        if (!target || !func[target]) {
            target = '';
            args = [''].concat(args);
        }
        if (target in func && typeof func[target] === 'string') target = func[target];
            func = func[target];
            args.shift();
        }
        func(user, user, args, val, null, command);
        logger.emit('cmd', cmd, val);
    }
});

bot.on('j', (parts) => {
    let room = Utils.getRoom(parts[0]);
    let p = parts[2].substring(1).split("@")
    let user = parts[2].substring(0, 1) + p[0];
    logger.emit('join', room, user);
    if (!Users[toId(user)]) Users.add(user);
    for (let i in CmdObj) {
        if (CmdObj[i].onJoin) {
            CmdObj[i].onJoin(room, user);
        }
    }
    Users[toId(user)].join(room, user);
});

bot.on('l', (parts) => {
    let room = Utils.getRoom(parts[0]);
    let p = parts[2].split("@")
    let user = toId(p[0]);
    // This sometimes crashes when PS sends a message to the client that a Guest is leaving the room when the guest never joined the room in the first place which honestly makes no sense.
    if (Users[user]) Users[user].leave(room);
    else logger.emit('error', `${user} can't leave ${room}`);
});

bot.on('n', (parts) => {
    let room = Utils.getRoom(parts[0]);
    let oldname = parts[3];
    let p = parts[2].substring(1).split("@")
    let newname = parts[2].substring(0, 1) + p[0]
    try {Rooms[room].rename(oldname, newname);}
    catch (e) {}
});

bot.on('deinit', (parts) => {
    let room = Utils.getRoom(parts[0]);
    if (Rooms[room]) Rooms[room].leave();
});

bot.on('tournament', (parts, data) => {
    let room = Rooms[Utils.getRoom(parts[0])];
    let dt = data.split('\n');
    dt.shift();
    for (let line of dt) {
        parts = line.split("|");
        let type = parts[2];
        if (type === "create") {
            if (!room.tournament) room.startTour(false);
            room.tournament.format = Tournament.formats[parts[3]];
        }
        if (type === "end" || type === "forceend") room.endTour(parts[3]);
        if (type === "update") {
            let data = JSON.parse(parts[3]);
            if (data.isStarted) {
                room.tournament.started = true;
                return;
            }
            if (!data.format) return;
            if (data.format in Tournament.formats) room.tournament.name = Tournament.formats[data.format];
            else room.tournament.name = data.format;
        }
        if (type === "join") {
            room.tournament.players[toId(parts[3])] = true;
        }
        if (type === "leave") {
            delete room.tournament.players[toId(parts[3])];
        }
    }
});

bot.on('dereg', (type, name) => {
    if (type === 'user') {
        delete Users[name];
    }
    else if (type === 'room') {
        delete Rooms[name];
    }
    else logger.emit('error', 'Invalid dereg type: ' + type);
});

bot.on('init', (parts, data) => {
    let room = Utils.getRoom(parts[0]);
    logger.emit('log', 'Joined ' + room);
    Rooms.add(room);
    parts = data.split("\n");
    for (let l in parts) {
        let line = parts[l];
        let part = line.split('|');
        if (part[1] === 'title') Rooms[room].name = part[2];
        if (part[1] === 'users') {
            let users = part[2].split(',')
            for (let i in users) {
                let user = users[i];
                user = user.substring(0, 1) + user.substring(1).split("@")[0];
                if (i == 0) continue;
                if (!Users[toId(user)]) Users.add(user);
                Users[toId(user)].join(room, user);
            }
        }
        if (part[1] === 'tournament') {
            if (part[2] === "end" || part[1] === "forceend") {
                Rooms[room].endTour(part[2] === "end" ? part[3] : part[2]);
            }
            else { 
                if (!Rooms[room].tournament) Rooms[room].startTour("late");
            }
        }
    }
});

module.exports = {
    cmd: function(room, user, message) {
        let [cmd, args, val] = Utils.SplitMessage(message);
        if (cmd in Commands) {
            if (typeof Commands[cmd] === 'string') cmd = Commands[cmd];
            Commands[cmd](Rooms[room], user, args, val);
            logger.emit('fakecmd', cmd, val);
        }
    }
};
