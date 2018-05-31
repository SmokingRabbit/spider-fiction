const fs = require('fs');
const path = require('path');
const request = require('request');
const chance = new require('chance')();
const pinyin = require('pinyin');
const cheerio = require('cheerio');
const chapter_path = '/chapter';
const catalog_tpl = '<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="initial-scale=1,maximum-scale=1,minimum-scale=1,user-scalable=no"/><title>{{title}}</title><link href="../assets/catalog.css" type="text/css" rel="stylesheet" /></head><body><section class="container">{{body}}</section><script src="../assets/catalog.js"></script></body></html>';
const article_tpl = '<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="initial-scale=1,maximum-scale=1,minimum-scale=1,user-scalable=no"/><title>{{title}}</title><link href="../../assets/article.css" type="text/css" rel="stylesheet" /></head><body><section class="container">{{body}}</section><script src="../../assets/article.js"></script></body></html>';
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

    const save_path = path.join(catalog_path, chapter_path, `/${index}.html`);

    if (fs.existsSync(save_path)) {
        console.log('- 序号：' + index + '已存在，跳过抓取');
        return chapter(urls, index + 1);
    }

    try {
        request.get(url, (erro, res, body) => {
            const $ = cheerio.load(body);
            const title = $('.am-active').text();
            let article = $('#cha-content').text()
                .replace(/\t+/g, '')
                .replace(/\n+/g, '#')
                .replace(/\s+/g, '')
                .split('#');
            let tpl = article_tpl.replace(/{{title}}/, title);
            let content = `<h1><a href="../index.html">${book_name}</a></h1><h2>${title}</a></h2>`;
            for (let i = 0; i < article.length; i++) {
                let paragraph = article[i];
                content += `<p>${paragraph}</p>`;
            }

            if ($("#chadown").length) {
                content += `<div class="page"><a href="${'./' + (index + 1) + '.html'}">下一章</a></div>`;
            }

            tpl = tpl.replace(/{{body}}/, content);

            const fw = fs.createWriteStream(save_path);
            fw.write(tpl);
            fw.end();
            chapter(urls, index + 1);
        });
    } catch(e) {
        console.log('- 地址：' + url + ' 抓取失败，正在重试');
        chapter(urls, index);
    }
}

function catalog(url) {
    request.get(url, (erro, res, body) => {
        const $ = cheerio.load(body);
        book_name = $("h2.am-text-truncate").text();
        const $links = $(".am-list-static").find('a');
        const links = [];

        if (!$links.length) {
            console.log('不存在的地址，抓取取消！');
            return ;
        }

        let book_folder = '';
        pinyin(book_name, {
            style: pinyin.STYLE_NORMAL,
            heteronym: false
        }).forEach((item) => {
            book_folder += item[0];
        });

        let tpl = catalog_tpl;

        catalog_path = path.join(__dirname, '/docs', book_folder);

        mkdir(catalog_path);
        mkdir(path.join(catalog_path, chapter_path));

        let file_path = path.join(catalog_path, '/index.html');
        let fw = fs.createWriteStream(file_path);

        tpl = tpl.replace(/{{title}}/, book_name);

        let content = `<h1>${book_name}</h1><ul>`;

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

const id = process.argv[2];

spider(host + '/book/' + id);
