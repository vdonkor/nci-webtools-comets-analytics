const request = require('request');

function checkUrl(url) {
    return new Promise((resolve, reject) => {
        request(url, function(error) {
            if (error) reject(error);
            resolve(true);
        });
    });
}

module.exports = { checkUrl };