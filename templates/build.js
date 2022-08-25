// A node.js script to convert all .ejs templates to
// html files.

const ejs = require('ejs');
const fs = require('fs');
const crypto = require('crypto');
const { exit } = require('process');

// A function we inject into templates, which takes a resource URL,
// and appends ?hash=123asd to it. The hash is the sha256 of the file
// contents. This implements cache-busting, since github has aggressive
// caching.
function resource(href) {
    const data = fs.readFileSync(href);
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return `${href}?hash=${hash.substring(0, 10)}`;
}

const outputFiles = [];
for (const filename of fs.readdirSync('templates')) {
    if (!filename.endsWith('.ejs')) { continue; }
    ejs.renderFile(`./templates/${filename}`, {resource}, null, function(err, str){
        if (err) {
            console.error(err);
            exit(1);
        }
        outputFiles.push({filename, str});
    });
}

for (const out of outputFiles) {
    fs.writeFileSync(out.filename.replace('.ejs', '.html'), out.str);
}