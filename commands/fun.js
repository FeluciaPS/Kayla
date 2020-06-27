exports.commands = {
    autohide: {
		'': 'on',
		on: function(room, user, args) {
			if (!user.can(room, '#')) return;
			room.settings.autohide = true;
			room.saveSettings(true);
			room.send('Automatic hidetext for mutes enabled');
		},
		off: function(room, user, args) {
			if (!user.can(room, '#')) return;
			room.settings.autohide = false;
			room.saveSettings(true);
			room.send('Automatic hidetext for mutes disabled');
		},
		toggle: function(room, user, args) {
			if (!user.can(room, '#')) return;
			room.settings.autohide = !room.settings.autohide;
			room.saveSettings(true);
			room.send(`Automatic hidetext  for mutes ${room.settings.autohide ? 'en' : 'dis'}abled`);
		},
	},
	randitem: 'randomitem',
	randomitem: function(room, user, args) {
		let target = user.can(room, '+') ? room : user;
		let items = [];
		for (let i in Items) {
			if (Items[i].isNonstandard) continue;
			if (Items[i].isPokeball) continue;
			if (i.match(/tr\d\d/)) continue;
			items.push(Items[i].name);
		}
		let r = Math.floor(Math.random() * items.length);
		target.send(items[r]);
	}
}
