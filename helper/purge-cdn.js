/*
 * @Author: tackchen
 * @Date: 2022-07-08 08:24:27
 * @Description: Coding something
 */
const https = require('https');

console.log('Purge docs CDN...');

[
    '@gh-pages/index.min.js',
    '@gh-pages/main.min.js',
    '@gh-pages/main.min.css',
    '/cdn/assets/js/lib/lib.js',
    '/cdn/assets/js/lib/env.js'
].forEach(path => {
    https.get(`https://purge.jsdelivr.net/gh/wepm/jsbox${path}`, () => {
        console.log(`Purge ${path} done`);
    });
});