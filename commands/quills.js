let commands = {
	bal: 'quills',
	atm: 'quills',
	balance: 'quills',
	quills: function(room, user, args) {
		// send user how many quills they've got, if any
		let target = toId(args[0])
		if (!target) return user.send(`You have ${Quills.getQuills(user)} ${Quills.name}.`);
		return user.send(`${args[0]} has ${Quills.getQuills(target)} ${Quills.name}.`);
	},
	leaderboard: function(room, user, args) {
		let boarddata = Quills.getLeaderboard();
		if (Users.self.can(Quills.room, '*')) return Quills.room.send(`/sendhtmlpage ${user.id}, Leaderboard, ${boarddata}`);
		return user.send("I can't display the leaderboard if I'm not in the room");
	},
	// Shop commands
	shop: 'viewshop',
	viewshop: function(room, user, args) {
		// pminfobox with the following information:
		// - User's quills (done: top right)
		// - Shop items (done: list form, with mouseover for item description)
		// - Prices for shop items (done: right-aligned)
		// - Colour coding or some other way to tell what items you can afford (done: green items you can afford, red you cannot. Colourblind-proof on both light- and dark-mode PS)
		// - Optional: Buttons for buying (done: the list options themselves are buttons)
		let shopdata = Quills.shop.display(user);
		if (Users.self.can(Quills.room, '*')) return Quills.room.send(`/pminfobox ${user.id}, ${shopdata}`);
		return user.send("I can't display the shop if I'm not in the room");
	},
	buy: 'buyitem',
	buyitem: function(room, user, args) {
		// check if item exists
		// buy item
		// ez
		let id = toId(args[0]);
		if (!id) return user.send(Utils.errorCommand('buyitem [itemname]'));
		if (!Quills.shop.getItem(args[0])) return user.send("Item doesn't exist");
		if (Quills.getInventory(user)[id] === true) return user.send("You already have that item.");
		let res = Quills.buyItem(user.id, id)
		if (res) return user.send("Successfully bought " + res.name + " for " + res.price);
		return user.send("You don't have enough quills");
	},
	vi: 'inventory',
	viewinventory: 'inventory',
	inventory: function(room, user, args) {
		// View items you or a user have
		let target = toId(args[0]);
		let self = !target;
		if (self) target = user.id;
		if (!Quills.getInventory(target)) return room.send((self ? "Your" : `${args[0]}'s`) + ` inventory is empty.`);
		let items = Quills.shop.get();
		let inventory = Quills.getInventory(target);
		let header = `<div class="pm-log-add" style="border: none; border-bottom:2px solid; width:auto; background:none; font-size:16px; padding:4px"><b>Inventory</b></div>`
		let tableData = [];
		for (let i in items) {
			let n = inventory[i];
			if (!n) n = 0;
			if (items[i].count === true) {
				if (n) n = '\u2713';
				else n = '-';
			}
			tableData.push(`<tr><td style="border-bottom:1px solid;border-radius:0px 0px 0px 5px;padding: 0px 5px 0px 15px">${items[i].name}</td><td style="border-bottom:1px solid;border-radius:0px 0px 5px 0px;padding:0px 20px;text-align:center">${n}</td></tr>`);
		}
		if (Users.self.can(Quills.room, '*')) return Quills.room.send(`/pminfobox ${user.id}, ${header}<table style="width:100%;border-spacing:0px">${tableData.join('')}</table>`);
		return user.send("I can't display your inventory if I'm not in the room");
	},	

	// Administrative commands
	addquills: function(room, user, args) {
		// add quills to user
		if (!user.can(Quills.room, '%')) return user.send('You have to be staff to use this command.');
		if (args.length !== 2) return user.send(Utils.errorCommand("addquills [user], [amount]"));
		let target = toId(args[0]);
		let amount = parseInt(args[1]);
		if (isNaN(amount)) return user.send(`The amount of ${Quills.name} to give has to be a number.`);
		if (amount < 0) return user.send(`use ${Config.char}removequills to remove ${Quills.name}`);
		if (amount === 0) return user.send(`Are you sure you're trying to add 0 ${Quills.name}?`);
		let res = Quills.addQuills(target, amount);
		return room.send(`${amount} ${Quills.name} successfully given to ${args[0]}. They now have ${res} ${Quills.name}.`);
	},
	removequills: 'remquills',
	remquills: function(room, user, args) {
		// remove quills from user
		if (!user.can(Quills.room, '%')) return user.send('You have to be staff to use this command.');
		if (args.length !== 2) return user.send(Utils.errorCommand("addquills [user], [amount]"));
		let target = toId(args[0]);
		let amount = Math.abs(parseInt(args[1]));
		if (isNaN(amount)) return user.send(`The amount of ${Quills.name} to give has to be a number.`);
		if (amount === 0) return user.send(`Are you sure you're trying to add 0 ${Quills.name}?`);
		let res = Quills.addQuills(target, -amount);
		if (res === false) return room.send(`You can't take more ${Quills.name} than ${args[0]} has. They only have ${Quills.getQuills(target)} ${Quills.name}`);
		return room.send(`${amount} ${Quills.name} successfully taken from ${args[0]}. They now have ${res} ${Quills.name}.`);
	},
	useitem: function(room, user, args) {
		// remove item from user after redeeming it from staff
		if (!user.can(Quills.room, '%')) return user.send('You have to be staff to use this command.');
		let [targetid, itemid] = args.map(toId);
		if (!itemid) return user.send(Utils.errorCommand("useitem [user], [item]"));
		let inv = Quills.getInventory(targetid);
		let item = Quills.shop.getItem(itemid);
		if (!inv) return user.send("User doesn't have any items.");
		if (!item) return user.send("That item doesn't exist.");
		if (!inv[itemid]) return user.send(args[0] + " doesn't have that item");
		let res = Quills.giveItem(targetid, itemid, -1);
		if (res !== false) user.send(`${targetid} used ${item.name}. Remaining uses: ${res}`);
		else user.send(`${targetid}'s ${item.name} removed.`);
		if (res !== false) Sendpm(targetid, `You used ${item.name}. Remaining uses: ${res}`);
	},
	giveitem: function(room, user, args) {
		// Give item to user, provided they aren't already capped on them
		if (!user.can(Quills.room, '%')) return user.send('You have to be staff to use this command.');
		let [targetid, itemid] = args.map(toId);
		if (!itemid) return user.send(Utils.errorCommand("giveitem [user], [item]"));
		let inv = Quills.getInventory(targetid);
		let item = Quills.shop.getItem(itemid);
		if (!item) return user.send("That item doesn't exist.");
		if (inv[itemid] === true) return user.send(args[0] + " already has that item.");
		let res = Quills.giveItem(targetid, itemid);
		user.send(`${targetid} was given ${item.name}${res === true ? '' : ", they now have " + res}.`);
		Sendpm(targetid, `You were given ${item.name} by ${user.name}${res === true ? '' : ", you now have " + res}.`);
	},
	addshopitem: function(room, user, args) {
		if (!user.can(Quills.room, '%')) return user.send('You have to be staff to use this command.');
		let [name, price, ...desc] = args;
		if (!desc.length) return user.send(Utils.errorCommand('addshopitem [name], [price], [description]'));
		price = parseInt(price);
		if (isNaN(price) || price <= 0) return user.send('Price has to be a positive whole number.');
		if (Quills.shop.getItem(name)) return user.send('Item already exists.');
		Quills.shop.addItem(name, desc.join(', '), price);
		return user.send(`Added item ${name} for ${price} ${Quills.name}: ${desc.join(', ')}`);
	},
	deleteshopitem: 'removeshopitem',
	removeshopitem: function(room, user, args) {
		if (!user.can(Quills.room, '%')) return user.send('You have to be staff to use this command.');
		let id = toId(args[0]);
		if (!id) return user.send(Utils.errorCommand('removeshopitem [name]'));
		if (user.pendingaction && user.pendingaction.type === "removeshopitem") {
			if (user.pendingaction.data === id) {
				Quills.deleteItem(id);
				return user.send(`Item removed from shop and all inventories.`);
			}
		}
		if (!Quills.shop.getItem(id)) return user.send('Item doesn\'t exist.');
		user.pendingaction = {
			type: "removeshopitem",
			data: id,
		}
		setTimeout(() => {user.pendingaction = false}, 60*1*1000);
		return user.send(`Are you sure you want to delete \`\`${id}\`\`? To confirm use the command again (expires in 1 minute).`);
	}
}

exports.commands = commands;
