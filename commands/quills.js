const ROOM_ID = "thelibrary";
const SAVE_TIMER = 1 * 60 * 1000 // Force save quill data every minute
/* 

	Quills module
	Handles the virtual currency of The Library

 */

class Shop {
	#items = {};
	constructor() {
		if (!FS.existsSync('./data/shop.json')) this.#items = {};
		else this.#items = JSON.parse(FS.readFileSync('./data/shop.json'));
	}

	get() { 
		return Object.assign({}, this.#items);
	}

	save() {
		logger.emit('save-start', 'Shop');
		const shopData = this.get();
		FS.writeFile('./data/shop-temp.json', JSON.stringify(shopData, null, 2), () => {
			FS.rename('./data/shop-temp.json', './data/shop.json', () => {
				logger.emit('save-end', 'Shop');
			})
		})
	}

	getItem(name) {
		return this.addItem(name);
	}

	addItem(name, description, price, count) {
		let id = toId(name);
		if (this.#items[id]) return this.#items[id];
		this.#items[id] = {
			name,
			desc: description,
			price,
			count
		}
		this.save();
		return this.#items[id];
	}

	display(user) {
		let quills = Quills.getQuills(user);
		let header = `
			<div class="pm-log-add" style="border: none; border-bottom:2px solid; width:auto; background:none; font-size:16px; padding:4px">
			<b>${Quills.name} Shop</b>\
			<span style="float:right;margin-right:27px;font-size:16px;border-bottom:1px solid" title="Your ${Quills.name}">
			$${quills}
			</span></div>`;
		let items = [];
		for (let i in this.#items) {
			let item = this.#items[i];
			let colour = item.price > quills ? "rgba(255, 100, 100, .5)" : "rgba(50, 255, 50, .5)";
			items.push(
				`<button class="pm-log-add" name="send" value="/w ${Config.username}, ${Config.char}buyitem ${i}" style="border: none; border-bottom:1px solid;width:100%;background:${colour};text-align:left">
				    <div style="position:relative;bottom:-2px">
				        <span title="${item.desc}">${item.name}</span>
				        <span style="float:right;margin-right:22px">${item.price} ${Quills.name}</span>
				    </div>
				</button>`
			);
		}
		return (header + items.join('<br>')).replace(/(\s\s\s\s|\t|\n)/gmi, ''); 
	}
}
class QuillManager {
	#quills = {};
	constructor() {
		global.Quills = this;
		this.room = false; // Will be loaded when bot joins a room
		this.shop = new Shop();
		this.name = 'Quills';
		this.loadQuills();
	}

	getQuills(user) {
		if (typeof user === "string") user = {id: toId(user)};
		if (user.quills) return user.quills;
		if (!this.#quills[user.id]) return 0;
		return this.#quills[user.id];
	}

	addQuills(target, amount) {
		if (!this.#quills[target]) this.#quills[target] = 0;
		if (this.#quills[target] + amount < 0) return false;
		this.#quills[target] += amount;
		if (Users[target]) Users[target].quills = this.#quills[target];
		return this.#quills[target];
	}

	getInventory(user) {
		if (user.inventory) return user.inventory;
		if (!this.inventory[user.id]) return 0;
		return this.inventory[user.id];
	}

	loadRoom(room) {
		if (room.id === ROOM_ID) this.room = room;
	}

	loadQuills() {
		if (!FS.existsSync('./data/quills.json')) this.#quills = {};
		else this.#quills = JSON.parse(FS.readFileSync('./data/quills.json'));
		if (!FS.existsSync('./data/inventory.json')) this.inventory = {};
		else this.inventory = JSON.parse(FS.readFileSync('./data/inventory.json'));
		this.saveHandler = setInterval(this.save, SAVE_TIMER);
	}

	save() {
		logger.emit('save-start', 'Quills');
		logger.emit('save-start', 'Inventory');
		const quillData = Object.assign({}, this.#quills);
		FS.writeFile('./data/quills-temp.json', JSON.stringify(quillData, null, 2), () => {
			FS.rename('./data/quills-temp.json', './data/quills.json', () => {
				logger.emit('save-end', 'Quills');
			})
		})
		const invData = Object.assign({}, this.inventory);
		FS.writeFile('./data/inventory-temp.json', JSON.stringify(quillData, null, 2), () => {
			FS.rename('./data/inventory-temp.json', './data/inventory.json', () => {
				logger.emit('save-end', 'Inventory');
			})
		})
		this.shop.save();
	}
}

exports.commands = {
	bal: 'quills',
	atm: 'quills',
	balance: 'quills',
	quills: function(room, user, args) {
		// send user how many quills they've got, if any
		let target = toId(args[0])
		if (!target) return room.send(`You have ${Quills.getQuills(user)} ${Quills.name}.`);
		return room.send(`${args[0]} has ${Quills.getQuills(target)} ${Quills.name}.`);
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
		user.send('!code ' + shopdata);
	},
	buy: 'buyitem',
	buyitem: function(room, user, args) {
		// Self-explanatory
	},
	vi: 'inventory',
	viewinventory: 'inventory',
	inventory: function(room, user, args) {
		// View items you or a user have
		let target = toId(args[0]);
		let self = !target;
		if (self) target = user.id;
		if (!Quills.getInventory(target)) room.send((self ? "Your" : `${args[0]}'s`) + ` inventory is empty.`);
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
	},
	giveitem: function(room, user, args) {
		// Give item to user, provided they aren't already capped on them
		if (!user.can(Quills.room, '%')) return user.send('You have to be staff to use this command.');
	}
}

global.Quills = new QuillManager();

exports.beforeReload = function() {
	clearInterval(Quills.saveHandler);
	Quills.save();
}