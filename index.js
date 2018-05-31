const fs = require('fs');
const path = require('path');
const request = require('request');
const chance = new require('chance')();
const cheerio = require('cheerio');
const chapter_path = '/chapter';
const catalog_tpl = '<!doctype html><html><head><meta charset="utf-8" /><title>{{title}}</title><style>*{margin:0;padding:0}body{background-color:#eee}.container{width:980px;margin:auto}h1{font-size:32rpx;line-height:40rpx;font-weight:400;color:#999;margin-top:30px;text-align:center}ul{list-style:none}li{height:32px;line-height:32px;font-size:16px}a{color:#666;text-decoration:none}a:visited{color:#999}</style></head><body><section class="container">{{body}}</section></body></html>';
const article_tpl = '<!doctype html><html><head><meta charset="utf-8" /><title>{{title}}</title><style>*{margin:0;padding:0}body{background-color:#eee}.container{width:980px;margin:auto}h1{font-size:32rpx;line-height:40rpx;font-weight:400;color:#999;margin-top:30px}h2{font-size:26rpx;line-height:40rpx;font-weight:400;color:#999;margin-bottom:30px;margin-top:20px}p{font-size:14px;text-indent:30px;line-height:24px;color:#444;margin-bottom:6px;}.page {margin-top: 20px;text-align: center;}</style></head><body><section class="container">{{body}}</section></body></html>';
const host = 'http://www.yixuanju.com';
let book_name = null;
let catalog_path = null;

function mkdir(file) {
    if (!fs.existsSync(file)) {
        fs.mkdirSync(file);
    }
}

function chapter(urls, index) {
    let url = urls[index - 1];
    console.log('-正在抓取 地址：' + url + ' 序号：' + index);

    if (!url) {
        return ;
    }

    request.get(url, (erro, res, body) => {
        const $ = cheerio.load(body);
        const title = $('.am-active').text();
        let article = $('#cha-content').text()
            .replace(/\t+/g, '')
            .replace(/\n+/g, '#')
            .replace(/\s+/g, '')
            .split('#');
        let tpl = article_tpl.replace(/{{title}}/, title);
        let content = `<h1>${book_name}</h1><h2>${title}</h2>`;
        for (let i = 0; i < article.length; i++) {
            let paragraph = article[i];
            content += `<p>${paragraph}</p>`;
        }

        if ($("#chadown").length) {
            content += `<div class="page"><a href="${chapter_path + '/' + (index + 1) + '.html'}">下一页</a></div>`;
        }

        tpl = tpl.replace(/{{body}}/, content);

        const fw = fs.createWriteStream(path.join(catalog_path, chapter_path, `/${index}.html`));
        fw.write(tpl);
        fw.end();
        chapter(urls, index + 1);
    });
}

function catalog(url) {
    request.get(url, (erro, res, body) => {
        const $ = cheerio.load(body);
        book_name = $("h2.am-text-truncate").text();
        let tpl = catalog_tpl;

        catalog_path = path.join(__dirname, book_name);

        mkdir(catalog_path);
        mkdir(path.join(catalog_path, chapter_path));

        let file_path = path.join(catalog_path, '/index.html');
        let fw = fs.createWriteStream(file_path);

        tpl = tpl.replace(/{{title}}/, book_name);

        let content = `<h1>${book_name}</h1><ul>`;
        const $links = $(".am-list-static").find('a');
        const links = [];

        for (let i = 0; i < $links.length; i++) {
            let index = 1 + i;
            let $link = $links.eq(i);
            content += `<li><a href=".${chapter_path + '/' + index + '.html'}">${$link.text()}</a></li>`;
            links.push(host + $link.attr('href'));
        }
        chapter(links, 1);

        content += '<ul>';
        tpl = tpl.replace(/{{body}}/, content);
        fw.write(tpl);
        fw.end();
    });
}

function spider(url) {
    return catalog(url);
}

spider(host + '/book/12994');
