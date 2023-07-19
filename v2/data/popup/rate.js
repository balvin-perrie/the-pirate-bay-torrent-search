chrome.storage.local.get({
  'rate': true,
  'crate': 0
}, prefs => {
  const b = prefs['rate'] === false || prefs.crate < 5 || Math.random() < 0.5;
  document.getElementById('rate').dataset.hide = b;
  if (b === false) {
    document.body.classList.add('rating');
  }

  if (prefs.crate < 5) {
    prefs.crate += 1;
    chrome.storage.local.set({crate: prefs.crate});
  }
});

document.getElementById('rate').onclick = () => {
  let url = 'https://chrome.google.com/webstore/detail/the-pirate-bay-torrent-se/enfgmbhdgelbkmhhhdiljfimmcghnalc/reviews';
  if (/Edg/.test(navigator.userAgent)) {
    url = 'https://microsoftedge.microsoft.com/addons/detail/bdloibihclffboondgddiikpbaobplkc';
  }
  else if (/Firefox/.test(navigator.userAgent)) {
    url = 'https://addons.mozilla.org/firefox/addon/popup-torrent-search//reviews/';
  }

  chrome.storage.local.set({
    'rate': false
  }, () => chrome.tabs.create({
    url
  }));
};
