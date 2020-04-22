/* globals Engine */
'use strict';

const search = {};
search.engine = new Engine();

search.abort = (passive = false) => {
  search.aborted = true;
  search.engine.abort();
  if (!passive) {
    document.querySelector('#results tbody').textContent = '';
    document.body.dataset.mode = 'ready';
  }
};
search.log = (() => {
  const footer = document.querySelector('footer');
  return msg => {
    footer.textContent = msg;
  };
})();
search.permission = url => new Promise(resolve => chrome.permissions.contains({
  origins: [url]
}, resolve));
search.submit = async query => {
  search.abort();
  let retries = 0;
  document.body.dataset.mode = 'busy';
  search.log('Waiting for the proxy list');
  try {
    const list = await search.engine.getProxyList();
    search.log(`Got ${list.length} proxies. Health check...`);
    search.aborted = false;
    for (const base of list) {
      if (search.aborted) {
        return;
      }
      search.log(`Checking permission for "${base}"`);
      if (await search.permission(base)) {
        search.log(`Checking availability for "${base}"`);
        if (await search.engine.health(base)) {
          const categories = [...document.querySelectorAll('#search input[name=category]:checked')].map(e => e.value);
          const category = document.querySelector('#search select[data-id=category]').value;
          const orderBy = document.querySelector('#search select[data-id=order]').value;
          const sortBy = document.querySelector('#search select[data-id=sort]').value;
          try {
            let results = await search.engine.api(base, query, categories, category, orderBy, sortBy);
            if (results.length === 0) {
              results = await search.engine.fetch(base, query, categories, category, orderBy, sortBy);
            }
            results = results.filter(o => o['info_hash'] && o['info_hash'] !== '0000000000000000000000000000000000000000');

            if (results.length === 0 && retries < 3) {
              retries += 1;
            }
            else {
              search.log(`Number of results: ${results.length}`);
              document.querySelector('base').href = base;
              return search.show(results);
            }
          }
          catch (e) {
            console.warn('Error', e);
          }
        }
      }
    }
    console.log('Failed');
    search.show([]);
  }
  catch (e) {
    console.warn('Error', e);
  }
};
search.show = results => {
  const tbody = document.querySelector('#results tbody');
  const template = document.querySelector('#results template');
  results.forEach(o => {
    const tr = document.importNode(template.content, true);
    const title = tr.querySelector('[data-id=title]');
    title.textContent = o.name;
    title.href = o.relativeLink;
    tr.querySelector('[data-id=date]').textContent = o.uploadDate;
    tr.querySelector('[data-id=size]').textContent = o.size;
    const by = tr.querySelector('[data-id=by]');
    by.textContent = o.uploader;
    by.href = o.uploaderLink;
    tr.querySelector('[data-id=se]').textContent = o.seeders;
    tr.querySelector('[data-id=le]').textContent = o.leechers;
    tr.querySelector('[data-id=magnet]').href = o.magnetLink;

    tbody.appendChild(tr);
  });
  document.body.dataset.mode = results.length === 0 ? 'empty' : 'done';
};

document.getElementById('search').addEventListener('submit', e => {
  e.preventDefault();
  search.submit(e.target.querySelector('input[type=search]').value);
});
document.querySelector('#search input[type=search]').addEventListener('search', e => {
  if (e.target.value === '') {
    search.abort();
  }
});
document.body.dataset.mode = 'ready';
