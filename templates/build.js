// A node.js script to convert all .ejs templates to
// html files.

const ejs = require('ejs');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { exit } = require('process');

function deleteExtras(href) {
    const pattern = path.basename(href).replace(/\.(\w+)$/, '@[0-9a-f]+(\\.\\(.*\\))?\\.$1$');
    for (const file of fs.readdirSync(path.dirname(href))) {
        if (file.match(RegExp(pattern))) {
            fs.rmSync(`${path.dirname(href)}/${file}`);
        }
    }
}

// A function we inject into templates, which takes a resource URL,
// and appends ?hash=123asd to it. The hash is the sha256 of the file
// contents. This implements cache-busting, since github has aggressive
// caching.
function resource(href) {
    deleteExtras(href);
    const dir = path.dirname(href);
    const hash = crypto
        .createHash('sha256')
        .update(fs.readFileSync(href))
        .digest('hex')
        .substring(0, 10);
    const newFile = href.replace(/\.(\w+)$/, `@${hash}.$1`);
    fs.copyFileSync(href, newFile)
    return newFile;
}

function workerResource(href, ...deps) {
    deleteExtras(href);
    const hash = crypto
        .createHash('sha256')
        .update(fs.readFileSync(href))
        .digest('hex')
        .substring(0, 10);
    const depHashes = deps.map(
        dep => resource(dep).replace(/\//g, '$'));
    const newFile = href.replace(/\.(\w+)$/, `@${hash}.(${depHashes.join(',')}).$1`);
    fs.copyFileSync(href, newFile)
    return newFile;
}

const outputFiles = [];
for (const filename of fs.readdirSync('templates')) {
    if (!filename.endsWith('.ejs')) { continue; }
    ejs.renderFile(`./templates/${filename}`, {resource, workerResource}, null, function(err, str){
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