'use strict';

const Engine = function() {
  this.events = {};
  this.config = {
    proxy: 'https://proxybay.github.io/'
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
window.Engine = Engine;
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
  const controller = this.controller = new AbortController();
  return fetch(href).then(r => {
    controller.abort();
    return r.ok;
  });
};
Engine.prototype.abort = function() {
  if (this.controller) {
    this.controller.abort();
  }
};
Engine.prototype.api = function(base, query, categoris, category, orderBy, sortBy, page = 0) {
  let url = base + 'api.php?url=/q.php?q=' + encodeURIComponent(query) +
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
      return r.json();
    }
    throw Error('cannot fetch');
  }).then(json => {
    function size(size, f) {
      const round = (x, precision) => {
        const y = +x + (precision === undefined ? 0.5 : precision / 2);
        const sz = y - (y % (precision === undefined ? 1 : +precision)) + '';
        if (sz.indexOf('.') == -1) return sz;
        else return sz.substring(0, sz.indexOf('.') + 3);
      };
      let e = '';
      if (f) {
        e = ' (' + size + ' Bytes)';
      }
      if (size >= 1125899906842624) return round(size / 1125899906842624, 0.01) + ' PiB' + e;
      if (size >= 1099511627776) return round(size / 1099511627776, 0.01) + ' TiB' + e;
      if (size >= 1073741824) return round(size / 1073741824, 0.01) + ' GiB' + e;
      if (size >= 1048576) return round(size / 1048576, 0.01) + ' MiB' + e;
      if (size >= 1024) return round(size / 1024, 0.01) + ' KiB' + e;
      return size + ' B';
    }
    if (Array.isArray(json) === false) {
      throw Error('JSON is not an array');
    }

    return json.map(o => {
      const d = new Date(Number(o.added) * 1000);

      return {
        ...o,
        uploadDate: d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).substr(-2) + '-' + ('0' + (d.getDay() + 1)).substr(-2),
        size: size(o.size),
        magnetLink: 'magnet:?xt=urn:btih:' + o.info_hash + '&dn=' + encodeURIComponent(o.name) + '&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2920%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.pirateparty.gr%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.cyberia.is%3A6969%2Fannounce',
        relativeLink: 'description.php?id=' + o.id
      };
    });
  });
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
