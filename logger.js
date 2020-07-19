let colors = require('colors');
let events = require('events');
global.Saver = {};
module.exports = logger = new events.EventEmitter();

logger.on('error', function(msg) {
    console.log(`[${"ERROR".red}] ${msg.trim()}`);
});

logger.on('cmd', (cmd, args) => {
    console.log(`[${cmd.blue}] ${args}`);
});

logger.on('log', (msg) => {
    console.log(`[${" MSG ".green}] ${msg}`);
});

logger.on('join', (room, user) => {
    console.log(`[${room}] ` + `${user.trim()} joined.`.grey)
});

logger.on('leave', (room, user) => {
    console.log(`[${room}] ` + `${user.trim()} left.`.grey)
});

logger.on('chat', (room, user, msg) => {
    console.log(`[${Rooms[room].name}] ${user.trim()}: ${msg.trim()}`)
});

logger.on('save-start', (data) => {
	Saver[data] = true;
	console.log(`[${"save".grey}] Saving ${data} data.`);
});

logger.on('save-end', (data) => {
	Saver[data] = false;
	console.log(`[${"save".grey}] Saved ${data} data.`);
});