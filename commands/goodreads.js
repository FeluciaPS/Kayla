const https = require('https');

const { JSDOM } = require('jsdom');

const MAX_LOAD_ATTEMPTS = 10;

let buildBox = function (title, img, desc, rating, ratings, genres, url) {

    let html = `
<div style="overflow: auto; padding: 10px">
    <center>
        <div style="background-color:rgba(120, 225, 120, 0.2);border:1px solid black; width: 70%; min-width: 720px; max-width: 1200px; height:200px; position:relative">
            <img src="${img}" width="0" height="0" style="height:180px;width:auto; position: absolute; left: 0; top: 0; margin:10px">
            <table style="width:60%; position:absolute; right: 20px; margin: 10px">
                <tr>
                    <th colspan="2" style="font-size:24px">
                        <a style="text-decoration: none; color: inherit" href="${url}">
                            ${title}
                        </a>
                    </th>
                </tr>
                <tr>
                    <td style="text-decoration: underline; text-align: center">
                        ${rating}/5
                    </td>
                    <td style="text-decoration: underline;text-align:right">
                        ${ratings} ratings
                    </td>
                </tr>
                <tr>
                    <td colspan="2" style="text-align:right">
                        <div style="font-style:italic;padding-right:10px">
                            ${desc}
                        </div>
                    </td>
                </tr>
                <tr>
                    <td colspan="2" style="white-space: nowrap;overflow: hidden;text-overflow: ellipsis;">
                        ${genres.join(', ')}
                    </td>
                </tr>
            </table>
        </div>
    </center>
</div>`

    return html;
    
}
let getWebData = async function(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {timeout: 2500}, res => {
            let data = '';
    
            res.on('data', d => data += d);
    
            res.on('end', async () => {
                resolve(data);
            })
        })
    })
}

let getBookData = async function(query) {
    return new Promise(async (resolve, reject) => {
        let searchQuery = query.replace(/\s/g, '+')
    
        let data = await getWebData(`https://www.goodreads.com/search?utf8=✓&q=${searchQuery}&search_type=books`);

        let searchDOM = new JSDOM(data);

        let bookLinkElement = searchDOM.window.document.querySelector('.bookTitle');
        if (!bookLinkElement) {
            resolve({
                res: 'ERR',
                data: `No search results for ${query}`
            })
        }
        let bookURL = bookLinkElement.href;
        bookURL = bookURL.split('?')[0];
        bookURL = `https://goodreads.com` + bookURL;
        
        console.log(bookURL);
        let bookdata = await getWebData(bookURL);

        let bookDOM = new JSDOM(bookdata);
        let document = bookDOM.window.document;

        let tries = 0;
        while (tries < MAX_LOAD_ATTEMPTS) {
            try {
                let title = document.querySelector('.Text__title1').textContent;
                let rating = document.querySelector('.RatingStatistics__rating').textContent;
                let image = document.querySelector('.BookCover img').src;
                let description = document.querySelector('.TruncatedContent span').innerHTML.split('<br><br>')[0].split('').slice(0, 300).join('') + '...';
                let genres = Array.from(document.querySelectorAll('.BookPageMetadataSection__genreButton')).map(x => x.textContent);
            
                let box = buildBox(title, image, description, rating, 2, genres, bookURL)
                resolve({
                    res: `SUCCESS`,
                    data: box
                })
            }
            catch (e) {
                console.log(e);
            }
            tries += 1;
        }

        resolve({
            res: 'ERR',
            data: `Connection timed out or couldn't load details page. `
                + `Try again in a few minutes, or go to the `
                + `<a href="${bookURL}">goodreads page</a>`
        })
    })
}

exports.commands = {
	goodreads: async function(room, user, args) {
        if (!user.can(Quills.room, '+')) return;

        let query = args.join(', ');

        // Generate random ID for the html box, should be virtually impossible to get the same one twice
        let ID = Math.floor(Math.random() * 1000000000);

        room.send(`/adduhtml ${ID}, <div class="infobox">Searching goodreads, please wait a moment...</div>`);

        let result = await getBookData(query);

        if (result.res === "ERR") {
            console.log("error: " + result.data);
            room.send(`/changeuhtml ${ID}, <div class="infobox" style="color: red">${result.data}</div>`);
        }
        else if (result.res === "SUCCESS") {
            console.log("success!");
            room.send(`/changeuhtml ${ID}, <div class="infobox">${result.data}</div>`);
        }
        else {
            console.log("invalid status code")
            room.send(`/changeuhtml ${ID}, <div class="broadcast-red">Function <code>getBookdata</code> returned invalid status code: <code>${result.res}</code></div>`);
        }
	}
}
