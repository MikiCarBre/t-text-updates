// The one interaction on the site: the "Document | Board" switch on the app window. It flips by itself every
// few seconds (the app's main idea, shown) until the visitor uses it. No tracking, no cookies, nothing else.
for (const stage of document.querySelectorAll('[data-views]')) {
  const sw = stage.querySelector('.switch');
  const views = stage.querySelectorAll('.window-view');
  const show = (v) => {
    sw.dataset.on = v;
    for (const b of sw.querySelectorAll('button')) b.setAttribute('aria-selected', String(b.dataset.view === v));
    for (const el of views) el.classList.toggle('on', el.dataset.v === v);
  };
  let auto = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  sw.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    auto = false;
    show(b.dataset.view);
  });
  sw.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    auto = false;
    show(sw.dataset.on === 'board' ? 'doc' : 'board');
    sw.querySelector('[aria-selected="true"]').focus();
  });
  setInterval(() => auto && document.visibilityState === 'visible' && show(sw.dataset.on === 'board' ? 'doc' : 'board'), 3800);
}
