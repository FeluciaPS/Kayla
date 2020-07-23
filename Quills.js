const ROOM_ID = "thelibrary";
const SAVE_TIMER = 15 * 60 * 1000 // Force save quill data every 15 minutes
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
		if (Saver.Shop) return;
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
		if (!description) return false;
		this.#items[id] = {
			name,
			desc: description,
			price,
			count
		}
		this.save();
		return this.#items[id];
	}

	removeItem(name) {
		let id = toId(name);
		if (!this.#items[id]) return false;
		delete this.#items[id];
		this.save();
		return true;
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
			let colour = item.price > quills ? "rgba(255, 100, 100, .5)" : "rgba(50, 255, 50, .4)";
			items.push(
				[
					`<button class="pm-log-add" name="send" value="/msg ${Config.username}, ${Config.char}buyitem ${i}" style="border: none; border-bottom:1px solid;width:100%;background:${colour};text-align:left">
					    <div style="position:relative;bottom:-2px">
					        <span title="${item.desc}">${item.name}</span>
					        <span style="float:right;margin-right:22px">${item.price} ${Quills.name}</span>
					    </div>
					</button>`,
					item.price
				]
			);
		}
		items.sort((a, b) => {return a[1] - b[1]});
		return (header + items.map(x => x[0]).join('<br>')).replace(/(\s\s\s\s|\t|\n)/gmi, ''); 
	}
}
class QuillManager {
	#quills = {};
	#inventory = {};
	saving = {};
	constructor() {
		global.Quills = this;
		this.room = false; // Will be loaded when bot joins a room
		this.shop = new Shop();
		this.name = 'Quills';
	}

	getQuills(user) {
		if (typeof user === "string") user = {id: toId(user)};
		if (user.quills) return user.quills.current;
		if (!this.#quills[user.id]) return 0;
		return this.#quills[user.id].current;
	}

	getQuillObj(user) {
		if (typeof user === "string") user = {id: toId(user), name: user};
		if (user.quills) return user.quills;
		if (!this.#quills[user.id]) return {current: 0, total: 0, name: user.name};
		return this.#quills[user.id];
	}

	addQuills(target, amount) {
		if (!this.#quills[target]) this.#quills[target] = {name:target, current:0, total:0};
		if (this.#quills[target].current + amount < 0) return false;
		this.#quills[target].current += amount;
		this.#quills[target].total += amount;
		if (Users[target]) Users[target].quills = this.#quills[target];
		this.save(1);
		return this.#quills[target].current;
	}

	getInventory(user) {
		if (typeof user === "string") user = {id: toId(user)};
		if (user.inventory) return user.inventory;
		if (!this.#inventory[user.id]) return {};
		return this.#inventory[user.id];
	}

	setInventory(user, data) {
		if (typeof user !== 'string') {
			user.inventory = data;
			user = user.id;
		}
		this.#inventory[toId(user)] = data;
		this.save(2);
	}

	buyItem(user, item) {
		if (user.id) user = user.id; // Just incase someone passes this a user object
		item = toId(item);
		let quills = this.getQuills(user);
		let itemData = this.shop.getItem(item);
		if (!itemData) return false;
		if (quills < itemData.price) return false;
		let inventory = this.getInventory(user);
		if (!inventory[item]) inventory[item] = 0;
		if (itemData.count === true) inventory[item] = true;
		else inventory[item] += itemData.count;
		this.addQuills(user, -itemData.price);
		this.setInventory(user, inventory);
		this.save(1);
		return itemData;
	}

	giveItem(user, item, amount = 1) {
		if (user.id) user = user.id; // Just incase someone passes this a user object
		item = toId(item);
		let itemData = this.shop.getItem(item); 
		if (!itemData) return false; // Item doesn't exist. Should never happen though
		let inventory = this.getInventory(user); // Returns inventory if user exists, creates user inventory otherwise
		if (!inventory[item]) inventory[item] = 0;
		if (itemData.count === true) {
			if (amount >= 0) inventory[item] = true;
			else inventory[item] = false;
		}
		else inventory[item] += amount;
		this.setInventory(user, inventory);
		return inventory[item];
	}

	deleteItem(name) {
		let id = toId(name);
		for (let i in this.#inventory) {
			delete this.#inventory[i][id];
			if (Users[i] && Users[i].inventory) delete Users[i].inventory[id];
		}
		this.shop.removeItem(id);
		this.save(2);
	}

	loadRoom(room) {
		if (room.id === ROOM_ID) this.room = room;
	}

	loadQuills() {
		if (!FS.existsSync('./data/quills.json')) this.#quills = {};
		else this.#quills = JSON.parse(FS.readFileSync('./data/quills.json'));
		if (!FS.existsSync('./data/inventory.json')) this.#inventory = {};
		else this.#inventory = JSON.parse(FS.readFileSync('./data/inventory.json'));
		this.saveHandler = setInterval(() => {this.save()}, SAVE_TIMER);
	}

	save(n = 0) {
		if (!Saver.Quills && (n === 1 || !n)) {
			logger.emit('save-start', 'Quills');
			FS.writeFile('./data/quills-temp.json', JSON.stringify(this.#quills, null, 2), () => {
				FS.rename('./data/quills-temp.json', './data/quills.json', () => {
					logger.emit('save-end', 'Quills');
				})
			})
		}
		if (!Saver.Inventory && (n === 2 || !n)) {
			logger.emit('save-start', 'Inventory');
			FS.writeFile('./data/inventory-temp.json', JSON.stringify(this.#inventory, null, 2), () => {
				FS.rename('./data/inventory-temp.json', './data/inventory.json', () => {
					logger.emit('save-end', 'Inventory');
				})
			})
		}
		if (n === 3 || !n) this.shop.save();
	}

	getLeaderboard() {
		let html = `<center style="margin:35px"><table style="width:100%;text-align:center;border:1px solid">`
		html += `<tr><th>#</th><th>Username</th><th>Current Quills</th><th>Total Earned</th></tr>`;

		let quilldata = Object.values(JSON.parse(JSON.stringify(this.#quills))) // make a hard copy of the quills data to avoid fucking with it because I'm paranoid.

		quilldata = quilldata.sort((a, b) => { return a.total - b.total});
		for (let i = 0; i < quilldata.length; i++) {
			let dt = quilldata[i];
			html += `<tr><td>${i+1}</td><td>${dt.name}</td><td>${dt.current}</td><td>${dt.total}</td><td></td></tr>`;
		}
		
		html += `</table></center>`;
		return html;
	}
}

module.exports = QuillManager;