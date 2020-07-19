global.Banlist = JSON.parse(FS.readFileSync('data/banlist.json'));
global.PokeDex = require('./data/pokedex.js');
global.fdata = require('./data/formats-data.js');
global.Items = require('./data/items.js');

let CmdObj = {};
let commands = {
    // Utilities
	th: 'tourhistory',
	tourhistory: function(room, user, args) {
		if (!user.can(room, '+')) return;
		if (!room.pasttours.length) return room.send("This room has no past tours recorded.");
		room.send("**Tour history** (most recent first): " + room.pasttours.reverse().join(', '));
		room.pasttours.reverse();
	},
	lasttour: function(room, user, args) {
		if (!user.can(room, '+')) return;
		if (!room.lasttour[0]) return room.send("This room has no past tours recorded.");
		let ago = Math.floor((Date.now() - room.lasttour[0]) / 60000);
		return room.send(`**${room.lasttour[1]}** ${ago} minute${ago === 1 ? '' : 's'} ago.`);
	},
    hangmon: function(room, user, args) {
        if (!user.can(room, '%')) return;
        if (room.tournament) return room.send("You can't play hangman while a tournament is going on");
        let mons = Object.values(PokeDex);
        let mon = Utils.select(mons);
        let gen = getGen(mon);
        if (gen === 0) gen = "Unofficial";
        room.send(`/hangman create ${mon.name}, Generation ${gen}`);
    },
    mail: function(room, user, args, val) {
        let target = args[0];
        let targetid = toId(target);
        let msg = val.substring(target.length + 1).trim();
        if (args.length < 2 || !targetid || !msg) return user.send("Usage: ``" + Config.char + "mail [user], [message]``");
        let message = `[mail] ${user.name}: ${msg}`;
        if (message.length > 300) return user.send("Your message is too long...");
        if (Users[targetid]) return Users[targetid].send(message);
        FS.readFile(`mail/${targetid}.json`, (err, data) => {
            let maildata = [];
            if (err) {}
            else {
                try { maildata = JSON.parse(data); }
                catch (e) { };
            }
            if (maildata.length === Config.mail.inboxSize) return user.send("That user's mailbox is full.");
            maildata.push(message);
            FS.writeFile(`mail/${targetid}.json`, JSON.stringify(maildata, null, 4), (err) => {
                if (err) throw err;
                user.send("Mail sent successfully.");
            });
        });
    },
    help: function(room, user, args) {
        let target = user.can(room, '+') ? room : user;
        return target.send('https://pastebin.com/70HvhWUA');
    },

    kill: function(room, user, args) {
        if (!user.can(Quills.room, '@')) return;
        Quills.room.send('/logout');
    },
    // Staff things 
    settype: 'st',
    st: function(room, user, args) {
        if (!user.can(room, '%')) return;
        let type = args[0];
        if (!type) return;
        if (type.startsWith("rr")) {
            let count = parseInt(type.substring(2));
            if (count) room.send("/tour settype rr,, " + count);
            else room.send("/tour settype rr");
        }
        else if (type.startsWith("e")){
            let count = parseInt(type.substring(1));
            if (count) room.send("/tour settype elim,, " + count);
            else room.send("/tour settype elim");
        }
        else {
            room.send('Invalid type.');
        }
    },    
    
    modnote: function(room, user, args, val) {
        if (room != user) return;
        if (!args[0]) return user.send(Utils.errorCommand('modnote [room], [message]'));
        room = Utils.toRoomId(args[0]);
        if (!Rooms[room]) return user.send("Room doesn't exist, or I'm not in it");
        let self = Users[toId(Config.username)];
        if (self.rooms[room] != "*") return user.send("I'm not a bot in that room");
        if (!user.can(room, "%")) return user.send('Access denied.');
        let htmlescape = require('escape-html');
        let msg = val.substring(args[0].length + 1).trim();
        if (Config.devs.indexOf(user.id) == -1) msg = htmlescape(msg);
        let ret = `/addrankhtmlbox %,<b>${htmlescape(user.rooms[room])}${user.name}:</b> ${msg}<br><span style='color:#444444;font-size:10px'>Note: Only users ranked % and above can see this.</span>`
        Send(room, ret);
    },
    // Dev stuff
    git: function(room, user, args) {
        let target = user.can(room, '+') ? room : user;
        if (!target) target = user;
        let msg = "No git url is configured for this bot."
        if (Config.git) msg = Config.git;
        target.send(msg);
    },

    rl: 'reload',
    reload: function(room, user, args) {
        if (!user.can(room, 'all')) return;
        bot.emit('reload', args[0], room);
    },
    
    update: function(room, user, args) {
        if (!user.can(room, 'all')) return;
        if (!Config.git) return room.say("No git url is configured for this bot.");
        const child_process = require('child_process');
        child_process.execSync('git pull ' + Config.git + ' master', {stdio: 'inherit'});
        room.send("Code updated to the latest version.");
    },
    
    js: 'eval',
    eval: function(room, user, args, val) {
        if (!user.can(room, 'all')) return;
        if (!room) room = user;
        if (!val) return;
        try {
			let ret = eval(val);
			if (ret !== undefined) {
				ret = ret.toString();
				if (ret.indexOf("\n") !== -1) ret = "!code " + ret;
				room.send(JSON.stringify(ret));
			}
		}
		catch (e) {
			room.send(e.name + ": " + e.message);
		}
    },
    
    ping: function(room, user, args) {
        if (!user.can(room, 'all')) return; 
        if (!room) room = user;
        room.send("pong!");
    },
    
    join: 'joinroom',
    joinroom: function(room, user, args) {
        if (!user.can(room, 'all')) return;
        if (!args[0]) return user.send('No room given.');
        Send('', '/j ' + args[0]);
    },
	
	disable: function(room, user, args) {
		if (!user.can(room, 'all')) return;
		room.send('Commands disabled.');
		room.settings.disabled = true;
		room.saveSettings();
	},
	
	echo: {
		'': 'help',
		help: function(room, user, args) {
			if (!user.can(room, '%') && room !== user) return;
			if (!Users.self.can(room, '*')) return room.send(`${Utils.errorCommand("echo create, [time interval], [message interval], [message]")}`);
			let ret = `<details><summary><b>Echo</b></summary><hr>`;
			ret += `<b>- create:</b> <code>${Config.char}echo create, [time interval], [message interval], [message]</code> - requires % @ # &<br>`;
			ret += `<b>- end:</b> <code>${Config.char}echo end</code> - requires % @ # &`;
			ret += "</details>";
			room.send("/addhtmlbox " + ret);
		},
		create: 'start',
		start: function(room, user, args) {
			if (!user.can(room, '%')) return;
			if (room.repeat) return room.send('An echo is already running');
			let time_interval = parseInt(args.shift());
			let msg_interval = parseInt(args.shift());
			let message = args.join(',');
			
			if (!message) return this.help(room, user, args);
			if (isNaN(time_interval) || time_interval < 30) return room.send('time interval has to be at least 30 minutes.');
			if (isNaN(msg_interval)) return room.send('message interval has to be a number');
			let repeat = {
				msgs: 0,
				last: Date.now(),
				mintime: time_interval,
				minmsg: msg_interval,
				message: message
			}
			room.repeat = repeat;
			room.saveSettings();
			return room.send('Repeat started');
		},
		end: function(room, user, args) {
			if (!user.can(room, '%')) return;
			if (!room.repeat) return room.send('No echo is currently running');
			let msg = room.repeat.message;
			room.repeat = false;
			room.saveSettings();
			return room.send(`Echo "${msg}" ended.`);
		}
	}
};

let files = FS.readdirSync('commands');
for (let f in files) {
    let file = files[f];
    if (file.substring(file.length-3) !== ".js") continue;
    if (require.cache[require.resolve('./commands/' + file)]) delete require.cache[require.resolve('./commands/' + file)];
    let contents = require('./commands/' + file);
    Object.assign(commands, contents.commands);
    CmdObj[file.substring(0, file.length-3)] = contents;
}

commands.beforeReload = function(room, user, args) {
    if (room) return; // this is not a command
    for (let i in CmdObj) {
        let obj = CmdObj[i];
        if (obj.beforeReload) obj.beforeReload();
    }
}

exports.commands = commands;
exports.CmdObj = CmdObj;