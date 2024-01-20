'use strict';

class BasicEvent {
  constructor() {
    this.events = {};
  }
  on(name, callback) {
    this.events[name] = this.events[name] || [];
    this.events[name].push(callback);
  }
  emit(name, data) {
    (this.events[name] || []).forEach(c => c(data));
  }
}

// eslint-disable-next-line no-unused-vars
class Engine extends BasicEvent {
  static size(size, f) {
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

  constructor() {
    super();

    this.config = {
      proxy: 'https://piratebayproxy.info/'
      // proxy: 'https://corsproxy.io/?' + encodeURIComponent('https://piratebayproxy.info/')
      // proxy: 'https://proxybay.github.io/'
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
  }
  async getProxyList() {
    const r = await fetch(this.config.proxy);
    const content = await r.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');

    const list = new Set();
    // method 1
    for (const e of [...doc.querySelectorAll('.site a')]) {
      list.add(e.href);
    }
    // method 2
    for (const e of [...doc.querySelectorAll('img[alt="up"]')]) {
      const a = e.closest('tr').querySelector('a[rel="nofollow"],a[rel="dofollow"]');
      if (a) {
        list.add(a.href);
      }
    }
    // backup plan -> official API
    list.add('https://apibay.org/');
    // backup plan -> misc
    list.add('https://thepiratebay10.info/');
    list.add('https://thepiratebay7.com/');
    list.add('https://thepiratebay0.org/');
    list.add('https://thepiratebay10.org/');
    list.add('https://thehiddenbay.com/');
    list.add('https://piratebay.live/');
    list.add('https://thepiratebay.zone/');
    list.add('https://tpb.party/');
    list.add('https://thepiratebay.party/');
    list.add('https://piratebay.party/');
    list.add('https://piratebayproxy.live/');
    list.add('https://pirateproxylive.org/');

    return [...list];
  }
  abort() {
    this.controller?.abort();
  }
  api(base, query, categoris, category, orderBy, sortBy, page = 0) {
    const urls = [
      base + 'q.php?q=' + encodeURIComponent(query),
      base + 'api.php?url=/q.php?q=' + encodeURIComponent(query)
    ].map(s => {
      s +=
        '&category=' + category +
        '&page=' + page +
        '&orderby=' + this.orderBy[orderBy][sortBy];
      if (categoris.length) {
        s += '&' + categoris.map(c => c + '=on').join('&');
      }

      return s;
    });

    this.controller = new AbortController();
    const signal = this.controller.signal;

    const get = url => fetch(url, {
      cache: 'no-store',
      credentials: 'omit',
      signal
    }).then(r => {
      if (r.ok) {
        if (r.url.includes('index.html')) {
          throw Error('redirected to homepage');
        }
        return r.json();
      }
      throw Error('cannot fetch');
    });

    return Promise.any(urls.map(get)).then(json => {
      if (Array.isArray(json) === false) {
        throw Error('JSON is not an array');
      }

      return json.map(o => {
        const d = new Date(Number(o.added) * 1000);

        o.uploader = o.uploader || o.username;
        return {
          ...o,
          uploadDate: d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).substr(-2) + '-' + ('0' + (d.getDay() + 1)).substr(-2),
          size: Engine.size(o.size),
          magnetLink: 'magnet:?xt=urn:btih:' + o.info_hash + '&dn=' + encodeURIComponent(o.name) + '&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2920%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.pirateparty.gr%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.cyberia.is%3A6969%2Fannounce',
          relativeLink: 'description.php?id=' + o.id
        };
      });
    });
  }
  // https://thepiratebay.party/s/?q=friends&page=0&orderby=99
  // https://thepiratebay.org/search.php?q=friends&all=on&search=Pirate+Search&page=0&orderby=
  fetch(base, query, categoris, category, orderBy, sortBy, page = 0) {
    const urls = [
      base + 'search.php?q=' + encodeURIComponent(query),
      base + 's/?q=' + encodeURIComponent(query)
    ].map(s => {
      s += '&category=' + category + '&page=' + page + '&orderby=' + this.orderBy[orderBy][sortBy];
      if (categoris.length) {
        s += '&' + categoris.map(c => c + '=on').join('&');
      }
      return s;
    });

    this.controller = new AbortController();
    const signal = this.controller.signal;

    const get = url => fetch(url, {
      cache: 'no-store',
      credentials: 'omit',
      signal
    }).then(r => {
      if (r.ok) {
        if (r.url.includes('index.html')) {
          throw Error('redirected to homepage');
        }
        return r.text();
      }
      throw Error('cannot fetch');
    });

    return Promise.any(urls.map(get)).then(content => {
      const parser = new DOMParser();
      return parser.parseFromString(content, 'text/html');
    }).then(doc => {
      return [...doc.querySelectorAll('#searchResult tbody tr')].filter(tr => tr.querySelector('.vertTh')).map(tr => {
        try {
          const a = tr.querySelector('div.detName a') || tr.querySelector('td:nth-child(2) a');

          const relativeLink = a.getAttribute('href');

          const isTorrentVerified = ['VIP', 'Trusted'].indexOf((
            tr.querySelector('img[title="VIP"]') ||
            tr.querySelector('img[title="Trusted"]') || doc.body
          ).getAttribute('title'));

          const uploaderLink = tr.querySelector('font a');
          const magnetLink = tr.querySelector('a[href^="magnet:?"]').getAttribute('href');

          return {
            name: tr.querySelector('a.detLink').textContent,
            uploadDate: tr.querySelector('font').textContent.match(/Uploaded\s(?:<b>)?(.+?)(?:<\/b>)?,/)[1],
            size: tr.querySelector('font').textContent.match(/Size (.+?),/)[1],
            seeders: tr.querySelector('td[align="right"]').textContent,
            leechers: tr.querySelector('td[align="right"]:last-child').textContent,
            relativeLink,
            magnetLink,
            uploader: uploaderLink ? uploaderLink.textContent : '',
            uploaderLink: uploaderLink ? uploaderLink.getAttribute('href') : '',
            isTorrentVerified,
            info_hash: magnetLink.split('btih:')[1]?.split('&')[0]
          };
        }
        catch (e) {
          console.warn('Failed to get entry', e);
          return;
        }
      });
    });
  }
}
