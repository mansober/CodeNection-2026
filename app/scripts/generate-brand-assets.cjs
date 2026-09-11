const sharp = require(process.env.SHARP_MODULE_PATH || 'sharp');
const fs = require('node:fs');
const dir = require('node:path').resolve(__dirname, '../assets/images');
const mark = fs.readFileSync(dir + '/santai-mark.svg','utf8').replace(/<svg[^>]*>/,'').replace('</svg>','');
const svg = (bg, monochrome=false) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 100 100">${bg?'<rect width="100" height="100" fill="#08261D"/>':''}<g transform="translate(24 24) scale(.52)">${monochrome?mark.replace(/#[A-Fa-f0-9]{6}/g,'#FFFFFF'):mark}</g></svg>`);
(async()=>{
 await sharp(svg(true)).png().toFile(dir+'/icon.png');
 await sharp(svg(false)).png().toFile(dir+'/android-icon-foreground.png');
 await sharp({create:{width:1024,height:1024,channels:4,background:'#08261D'}}).png().toFile(dir+'/android-icon-background.png');
 await sharp(svg(false,true)).png().toFile(dir+'/android-icon-monochrome.png');
 await sharp(svg(true)).resize(64).png().toFile(dir+'/favicon.png');
 await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 100 100">${mark}</svg>`)).png().toFile(dir+'/splash-icon.png');
 console.log('Rendered Santai app, adaptive, monochrome, favicon and splash icons.');
})();
