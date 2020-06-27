let colors = require('colors');
let events = require('events');
module.exports = logger = new events.EventEmitter();

logger.on('error', function(msg) {
    console.log(`[${"ERROR".red}] ${msg}`);
});

logger.on('cmd', (cmd, args) => {
    console.log(`[${cmd.blue}] ${args}`);
});

logger.on('log', (msg) => {
    console.log(`[${" MSG ".green}] ${msg}`);
});

logger.on('chat', (room, user, msg) => {
    console.log(`[${Rooms[room].name}] ${user.trim()}: ${msg.trim()}`)
});

logger.on('save-start', (data) => {
	console.log(`[${"save".grey}] Saving ${data} data.`);
});

logger.on('save-end', (data) => {
	console.log(`[${"save".grey}] Saved ${data} data.`);
});