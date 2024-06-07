/*eslint-disable*/
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const formatOptions = ['log', '--pretty=format:%ad  %cn  committed  %s  %h', '--date=format:%Y-%m-%d'];
const writeStream = fs.createWriteStream(path.join(process.cwd(), 'HISTORY.log'));
const child = execFile('git', formatOptions, {
cwd: process.cwd(),
maxBuffer: Infinity,
});
child.stdout
.pipe(writeStream);