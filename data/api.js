'use strict';

var Engine = function() {
  this.events = {};
  this.config = {
    proxy: 'https://proxybay.bz/'
  };
  this.orderBy = {
    name: {
      desc: 1,
      asc: 2
    },
    date: {
      desc: 3,
      asc: 4
    },
    size: {
      desc: 5,
      asc: 6
    },
    seeds: {
      desc: 7,
      asc: 8
    },
    leeches: {
      desc: 9,
      asc: 10
    }
  };
};
Engine.prototype.getProxyList = function() {
  return fetch(this.config.proxy).then(r => r.text()).then(content => {
    const parser = new DOMParser();
    return parser.parseFromString(content, 'text/html');
  }).then(doc => {
    return [...doc.querySelectorAll('img[alt="up"]')]
      .map(e => e.closest('tr').querySelector('a[rel="nofollow"]'))
      .map(a => a.href);
  });
};
Engine.prototype.health = function(href) {
  return fetch(href).then(r => r.ok);
};
Engine.prototype.abort = function() {
  if (this.controller) {
    this.controller.abort();
  }
};
Engine.prototype.fetch = function(base, query, categoris, category, orderBy, sortBy, page = 0) {
  let url = base + 'search.php?q=' + encodeURIComponent(query) +
    '&category=' + category +
    '&page=' + page +
    '&orderby=' + this.orderBy[orderBy][sortBy];
  if (categoris.length) {
    url += '&' + categoris.map(c => c + '=on').join('&');
  }

  this.controller = new AbortController();
  const signal = this.controller.signal;

  return fetch(url, {
    cache: 'no-store',
    credentials: 'omit',
    signal
  }).then(r => {
    if (r.ok) {
      return r.text();
    }
    throw Error('cannot fetch');
  }).then(content => {
      const parser = new DOMParser();
      return parser.parseFromString(content, 'text/html');
    }).then(doc => {
      return [...doc.querySelectorAll('#searchResult tbody tr')].map(tr => {
        const relativeLink = tr.querySelector('div.detName a').getAttribute('href');

        const isTorrentVerified = ['VIP', 'Trusted'].indexOf((
          tr.querySelector('img[title="VIP"]') ||
          tr.querySelector('img[title="Trusted"]') || doc.body
        ).getAttribute('title'));

        const uploaderLink = tr.querySelector('font a');

        return {
          name: tr.querySelector('a.detLink').textContent,
          uploadDate: tr.querySelector('font').textContent.match(/Uploaded\s(?:<b>)?(.+?)(?:<\/b>)?,/)[1],
          size: tr.querySelector('font').textContent.match(/Size (.+?),/)[1],
          seeders: tr.querySelector('td[align="right"]').textContent,
          leechers: tr.querySelector('td[align="right"]:last-child').textContent,
          relativeLink,
          magnetLink: tr.querySelector('a[href^="magnet:?"]').getAttribute('href'),
          uploader: uploaderLink ? uploaderLink.textContent : '',
          uploaderLink: uploaderLink ? uploaderLink.getAttribute('href') : '',
          isTorrentVerified
        };
      });
    });
};
// Events
Engine.prototype.on = function(name, callback) {
  this.events[name] = this.events[name] || [];
  this.events[name].push(callback);
};
// Events
Engine.prototype.emit = function(name, data) {
  (this.events[name] || []).forEach(c => c(data));
};
