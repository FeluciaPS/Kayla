
let data = {};
const md = require('markdown').markdown;
let load = function() {
    if (!FS.existsSync('./data/daily.json')) return;
    else data = JSON.parse(FS.readFileSync('./data/daily.json'));
}

let save = function() {
    if (Saver.Daily) return;
    logger.emit('save-start', 'Daily');
    FS.writeFile('./data/daily-temp.json', JSON.stringify(data, null, 2), () => {
        FS.rename('./data/daily-temp.json', './data/daily.json', () => {
            logger.emit('save-end', 'Daily');
        })
    })
}

load();
const dailies = {
    prompt: {
        name: "Writing Prompt",
        params: ['title', 'image', 'description'],
        async renderEntry(entry, pm) {
            let imgHTML = '';
            if (!pm) {
                const [width, height] = await Utils.fitImage(entry.image, 120, 180).catch(() => {});
                if (width && height) {
                    imgHTML = `<td>\
                        <img src="${entry.image}" width=${width} height=${height}>\
                    </td>`;
                }
            }
            return `<table style="padding-top: 5px;">\
                <tr>\
                    ${imgHTML}\
                    <td style="padding-left:8px; vertical-align:baseline;">\
                        <div style="font-size: 22pt; margin-top: 5px; color: black;">${entry.title}</div>\
                        <div style="font-size: 10pt; font-family: Verdana, Geneva, sans-serif; margin-top: 5px ; display: block ; color: rgba(0, 0, 0 , 0.8)">${md.toHTML(entry.description)}</div>\
                    </td>\
                </tr>\
            </table>`;
        },
    },
    wotd: {
        name: "Word of the Day",
        params: ['word', 'pronunciation', 'class', 'definition', 'etymology'],
        async renderEntry(entry) {
            return `<span style="font-size: 30pt; color: black; display: block">${entry.word}</span>\
            <span style="font-family: sans-serif; font-size: 12pt; display: block; color: rgba(0,0,0,0.7); letter-spacing: 2px">${entry.pronunciation} / <strong style="letter-spacing: 0">${entry.class}</strong></span>\
            <span style="font-size: 10pt; font-family: sans-serif; margin-top: 10px; display: block; color: rgba(0,0,0,0.8)">\
                <strong style="font-family: serif; margin-right: 10px; color: rgba(0,0,0,0.5)">1.</strong>${entry.definition}\
            </span>\
            <span style="font-family: sans-serif ; margin-top: 10px ; display: block ; color: rgba(0, 0, 0, 0.7)">${entry.etymology}</span>`;
        },
    },
    hotd: {
        name: "History of the Day",
        params: ['title', 'date', 'location', 'description'],
        async renderEntry(entry) {
            return `<span style="font-size: 22pt ; display: inline-block; color: black">${entry.title}</span>\
            <span style="font-family: Verdana, Geneva, sans-serif ; font-size: 12pt ; display: block ; color: rgba(0, 0, 0 , 0.7) ; letter-spacing: 0px">\
            ${entry.date} - <strong style="letter-spacing: 0">${entry.location}</strong>\
            </span>\
            <span style="font-size: 10pt ; font-family: Verdana, Geneva, sans-serif; margin-top: 5px ; display: block ; color: rgba(0, 0, 0 , 0.8)">\
                ${entry.description}\
            </span>`;
        },
    },
};

async function getHTML(key, pm) {
    if (!data[key]) return `<b>No ${dailies[key].name} has been set yet.</b>`;

    const entryHTML = await dailies[key].renderEntry(data[key], pm);

    return `<div class="infobox"><div style="background: url(https://i.imgur.com/EQh19sO.png) center ; margin: -2px -4px ; box-shadow: inset 0 0 50px rgba(0 , 0 , 0 , 0.15);">\
        <div style="font-family: Georgia, serif ; max-width: 550px ; margin: auto ; padding: 8px 8px 12px 8px; text-align: left; background: rgba(250, 250, 250, 0.8)">\
            <span style="display: block ; font-family: Verdana, Geneva, sans-serif ; font-size: 16pt ; font-weight: bold ; background: #6d6d6d ; padding: 3px 0 ; text-align: center ; border-radius: 2px ; color: rgba(255 , 255 , 255 , 1) ; margin-bottom: 2px">\
                <i class="fa fa-fire" aria-hidden="true"></i> ${dailies[key].name} <i class="fa fa-fire" aria-hidden="true"></i>\
            </span>\
            ${entryHTML.replace(/\n/g, '<br/>')}\
        </div>\
    </div></div>`;
}

let commands = {
    commands: {
        setdaily: 'daily',
        async daily(room, user, args, val, time, command) {
            if (command !== 'daily' && command !== 'setdaily') {
                if (!dailies[command]) return; // Should never happen, but just in case.

                const pm = room === user || !user.can(Quills.room, '+');
                const html = await getHTML(command, pm);
                if (pm) return Quills.room.send(`/pminfobox ${user.id}, ${html}`);
                return room.send(`/adduhtml ${command}, ${html}`);
            }

            if (!user.can(Quills.room, '%')) return user.send('Permission denied.');
            let type = toId(args.shift());
            if (!type) return user.send(Utils.errorCommand(command + " [type], [settings]") + " - you can use this command in !code if you hit the character limit");
            if (!dailies[type]) return user.send("That daily type doesn't exist, valid options are " + Object.keys(dailies).join(', '));
            let keys = dailies[type].params;
            let obj = {};
            for (let i = 0; i < keys.length; i++) {
                if (!args[i]) return user.send(`Not enough arguments, ${type} needs ${keys.join(', ')}`);
                let val = args[i];
                if (i === keys.length - 1) val = args.slice(i).join(', ');
                obj[keys[i]] = val;
            }
            data[type] = obj;
            save();
            return user.send(dailies[type].name + ' set.');
        }
    },
};

for (let i in dailies) commands.commands[i] = "daily";

module.exports = commands;