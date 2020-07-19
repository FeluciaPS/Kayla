const DELAY = 105;
let queue = [];
let sendNext = function () {
    if (queue.length === 0) return;
    let message = queue.splice(0, 1)
    Connection.send(message);
    setTimeout(sendNext, DELAY);
}

let sendTimeout = null;
let qSend = function (data) {
    if (Array.isArray(data)) {
        for (const toSend of data) qSend(toSend);
        return;
    }
    if (sendTimeout) {
        queue.push(data);
        return;
    }
    Connection.send(data);
    sendTimeout = setTimeout(() => {
        sendTimeout = null;
        const toSend = queue.shift();
        if (toSend) qSend(toSend);
    }, DELAY);
}

exports.send = function (room, message) {
    qSend(room + "|" + message);
};
	
exports.sendpm = function(user, message) {
    qSend("|/w " + user + ", " + message);
};

exports.toId = function(ting) {
	return ('' + ting).toLowerCase().replace(/[^a-z0-9]+/g, '');
};

exports.toRoomId = function(ting) {
	return ('' + ting).toLowerCase().replace(/[^a-z0-9\-]+/g, '');
};


exports.getRoom = function(room) {
	return room.replace(">", "").replace("\n", "")
};

global.Ranks = { 
	"~": 0,
	"&": 1,
	"#": 2,
	"*": 3,
	"@": 4,
	"%": 5,
	"+": 6,
	" ": 7,
    "!": 8,
};

exports.SplitMessage = function (message) {
    let a = message.startsWith(Config.char) ? message.split(" ")[0].substring(Config.char.length) : false;
    let b = message.substring(a.length + 2).split(message.includes('\n') ? '\n' : ',').map(x => x.trim());
    let c = message.substring(message.indexOf(" ") + 1);
    if (c.startsWith(" ")) c = c.substring(1);
    return [a, b, c];
}

exports.ObjectRename = function(object, oldkey, newkey) {
    if (oldkey !== newkey) {
        //console.log(object);
        Object.defineProperty(object, newkey,
            Object.getOwnPropertyDescriptor(object, oldkey));
        delete object[oldkey];
    }
}

exports.select = function(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

exports.clean = function(thing) {
    return thing.toString().replace(/\r\n/g, '\n');
}

String.prototype.capitalize = function() {
    let str = this.toLowerCase();
    return str.charAt(0).toUpperCase() + str.substring(1);
}

exports.errorCommand = function(text) {
    return "Usage: ``" + Config.char + text + "``.";
}

// Code re-used from the old Kobold Librarian code
let probe = require('probe-image-size');
exports.fitImage = async function (url, maxHeight = 300, maxWidth = 400) {
    let {height, width} = await probe(url);

    let ratio = 1;

    if (width <= maxWidth && height <= maxHeight) return [width, height];

    if (height * (maxWidth/maxHeight) > width) {
        ratio = maxHeight / height;
    } else {
        ratio = maxWidth / width;
    }

    return [Math.round(width * ratio), Math.round(height * ratio)];
};