const ejs = require('ejs');
const fs = require('fs');
const { exit } = require('process');

const outputFiles = [];
for (const filename of fs.readdirSync('templates')) {
    if (!filename.endsWith('.ejs')) { continue; }
    ejs.renderFile(`./templates/${filename}`, null, null, function(err, str){
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