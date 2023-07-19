'use strict';

document.addEventListener('change', ({target}) => {
  const id = target.dataset.id;

  if (id) {
    if (target.value !== false) {
      localStorage.setItem('persist:' + id, target.checked || target.value);
    }
    else {
      localStorage.removeItem('persist:' + id);
    }
  }
});
Object.entries(localStorage).forEach(([key, value]) => {
  const e = document.querySelector(`[data-id="${key.replace('persist:', '')}"]`);
  console.log(e, key, value);
  if (e && value === 'true') {
    e.checked = true;
  }
  else if (e) {
    e.value = value;
  }
});
