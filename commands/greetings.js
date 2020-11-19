const ROOM_ID = "thelibrary";
const GREET_TIMEOUT = 1 * 60 * 60 * 1000; // 1 hour delay for Greetings repeating
/* 

	Greetings module

 */

let timeouts = {};
let greetings = {}
let saveHandler = false;

let load = function() {
	if (!FS.existsSync('./data/greetings.json')) return;
	else greetings = JSON.parse(FS.readFileSync('./data/greetings.json'));
}

let save = function() {
	if (Saver.Greetings) return;
	logger.emit('save-start', 'Greetings');
	FS.writeFile('./data/greetings-temp.json', JSON.stringify(greetings, null, 2), () => {
		FS.rename('./data/greetings-temp.json', './data/greetings.json', () => {
			logger.emit('save-end', 'Greetings');
		})
	})
}

// Greeting stuff
exports.onJoin = function(room, user) {
	if (!greetings[room.id]) return;
	if (!greetings[room.id][user.id]) return;
	if (!timeouts[room.id]) timeouts[room.id] = {};
	if (!(timeouts[room.id][user.id] > Date.now() - GREET_TIMEOUT)) {
		timeouts[room.id][user.id] = Date.now();
		room.send(`${greetings[room.id][user.id]} (${user.name})`);
	}
}

exports.commands = {
	greeting: {
		set: function(room, user, args) {
			let inv = Quills.getInventory(user);
			if (!inv.greeting) return user.send("You don't have a greeting message. You can buy one in the shop.");
			let text = args.join(', ');
			if (!text) return user.send(Utils.errorCommand('greeting set, [text]'));
			if (text.trim().length > 80) return user.send(`Your greeting may be at most 80 characters (yours is ${text.length})`);
			greetings[user.id] = text;
			save();
			user.send(`Greeting message set to "${text}".`);
		},
		delete: function(room, user, args) {
			if (!user.can(Quills.room, '%')) return user.send('Access denied.');
			let target = toId(args[0]);
			if (!target) return user.send(Utils.errorCommand('greeting delete, [user], [reason]') + '. Reason is optional.');
			let reason = args.slice(1).join(', ');
			delete greetings[target];
			Quills.addItem(target, "greeting", -1);
			save();
			let mn = `/modnote ${user.id} deleted ${target}'s greeting message.` + reason ? ` (${reason})` : '';
			Quills.room.send(mn);
			return user.send("Greeting deleted.");
		},
		'': 'help',
		help: function(room, user, args) {
			return user.send(Utils.errorCommand('greeting set, [text]'));
		}
	},
	joinphrase: {
		set: function(room, user, args) {
			if (room === user) return room.send("This command must be used in a room.");
			if (!user.can(room, '%')) return user.send('Access denied.');
			if (!greetings[room.id]) greetings[room.id] = {};
			if (args.length < 2) return room.send(Utils.errorCommand('joinphrase set, [user], [text]'));
			let target = toId(args[0]);
			let text = args.slice(1).join(', ').trim();
			if (text.length > 120) return room.send(`A joinphrase may be at most 120 characters (yours is ${text.length})`);
			greetings[room.id][target] = text;
			save();
			room.send(`join message for ${target} set to "${text}".`);
		},
		delete: function(room, user, args) {
			if (room === user) return room.send("This command must be used in a room.");
			if (!greetings[room.id]) return room.send("This room has no greetings set");
			if (!user.can(room, '%')) return user.send('Access denied.');
			let target = toId(args[0]);
			if (!target) return room.send(Utils.errorCommand('joinphrase delete, [user]'));
			delete greetings[room.id][target];
			save();
			return room.send(`join message for ${target} deleted.`);
		},
		'': 'help',
		help: function(room, user, args) {
			return user.send(Utils.errorCommand('joinphrase set, [text]') + " to set a joinphrase " + Utils.errorCommand('joinphrase set, [text]') + " to remove one.");
		}
	}
}

Quills.shop.addItem("Greeting", "Get your own personal welcome message upon joining the room! You can edit it at any time using " + Config.char + ";greeting set [text].", 1000, true);
load();