// The site's only script. No tracking, no cookies, no requests.
// 1. The hero note turns into a board once by itself, then its Document | Board switch flips it.
// 2. "See it in the app": five views of the real app behind tabs.
// 3. The tool demos loop only while they are on screen.
// 4. The light / dark screenshot follows the slider.
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

// ---------- 1. the note that becomes a board ----------
// Every block keeps its place in the document; for the board it gets one transform (translate + scale) to its
// spot, and CSS transitions do the moving (they retarget mid-way, so a click during the move turns it around).
for (const note of document.querySelectorAll('[data-flip]')) {
  const body = note.querySelector('[data-body]');
  const blocks = [...note.querySelectorAll('[data-blk]')];
  const sticky = note.querySelector('[data-sticky]');
  const svg = note.querySelector('[data-links]');
  const frame = note.querySelector('[data-frame]');
  const buttons = [...note.querySelectorAll('[data-go]')];
  const NS = 'http://www.w3.org/2000/svg';
  // arrows between cards (indexes into blocks): wide, title -> tasks and lede -> ideas side by side;
  // a phone stacks the board, so one arrow runs down from the lede into the frame
  const LINKS = [
    [0, 2],
    [1, 3],
  ];
  const LINKS_NARROW = [[1, 2]];
  const paths = LINKS.map(() => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('pathLength', '1');
    const h = document.createElementNS(NS, 'path');
    h.setAttribute('class', 'head');
    svg.append(p, h);
    return { p, h };
  });

  let view = 'doc';
  let targets = [];
  let touched = false;

  // where every block sits in the document, and where it goes on the board
  const measure = () => {
    note.classList.add('still');
    const narrow = innerWidth < 760;
    for (const el of blocks) el.style.transform = 'none';
    const b = body.getBoundingClientRect();
    targets = [...blocks, sticky].map((el) => {
      const r = el.getBoundingClientRect();
      const [x, y, s] = (el.dataset[narrow ? 'boardM' : 'board'] || '0 0 1').split(' ').map(Number);
      const x1 = (x / 100) * b.width;
      const y1 = (y / 100) * b.height;
      return { dx: x1 - (r.left - b.left), dy: y1 - (r.top - b.top), x: x1, y: y1, w: r.width * s, h: r.height * s, s };
    });
    const st = targets[blocks.length];
    sticky.style.transform = `translate(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px) scale(${st.s})`;
    drawLinks(narrow);
    place(false);
    void body.offsetWidth; // apply the new places before transitions come back
    note.classList.remove('still');
  };

  const drawLinks = (narrow) => {
    const links = narrow ? LINKS_NARROW : LINKS;
    paths.forEach((pp, i) => {
      pp.p.style.display = pp.h.style.display = i < links.length ? '' : 'none';
    });
    links.forEach(([a, z], i) => {
      const A = targets[a];
      const Z = targets[z];
      // from just outside one card to just outside the next (a card's surface reaches ~13px past its block):
      // side by side, right edge to left edge; one under the other, bottom edge to top edge
      if (Z.x - (A.x + A.w) > 70) {
        const x1 = A.x + A.w + 22;
        const y1 = A.y + Math.min(A.h / 2, 44);
        const x2 = Z.x - 22;
        const y2 = Z.y + Math.min(Z.h / 2, 40);
        const mid = (x1 + x2) / 2;
        paths[i].p.setAttribute('d', `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`);
        paths[i].h.setAttribute('d', `M ${x2 - 9} ${y2 - 6} L ${x2 + 1} ${y2} L ${x2 - 9} ${y2 + 6} Z`);
      } else {
        const x1 = A.x + A.w * 0.62;
        const y1 = A.y + A.h + 16;
        const x2 = Z.x + Z.w * 0.62;
        const y2 = Z.y - 18;
        const mid = (y1 + y2) / 2;
        paths[i].p.setAttribute('d', `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`);
        paths[i].h.setAttribute('d', `M ${x2 - 6} ${y2 - 9} L ${x2} ${y2 + 1} L ${x2 + 6} ${y2 - 9} Z`);
      }
    });
    // the frame gathers the tasks and ideas cards: the board's slide
    const f1 = targets[2];
    const f2 = targets[3];
    const pad = narrow ? 16 : 34;
    const fx = Math.min(f1.x, f2.x) - pad;
    const fy = Math.min(f1.y, f2.y) - pad;
    const fw = Math.max(f1.x + f1.w, f2.x + f2.w) - fx + pad;
    const fh = Math.max(f1.y + f1.h, f2.y + f2.h) - fy + pad;
    Object.assign(frame.style, { left: `${fx}px`, top: `${fy}px`, width: `${fw}px`, height: `${fh}px` });
  };

  // put every block where the current view wants it; the stagger runs top-down to the board, bottom-up back
  const place = () => {
    const onBoard = view === 'board';
    blocks.forEach((el, i) => {
      const t = targets[i];
      el.style.setProperty('--i', String(onBoard ? i : blocks.length - 1 - i));
      el.style.transform = onBoard ? `translate(${t.dx.toFixed(1)}px, ${t.dy.toFixed(1)}px) scale(${t.s})` : 'none';
    });
    note.dataset.view = view;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.go === view)));
  };

  const go = (to) => {
    if (to === view) return;
    if (reduce.matches) {
      // no movement: a short fade out, the other view, a fade in
      body.classList.add('fading');
      setTimeout(() => {
        view = to;
        place();
        body.classList.remove('fading');
      }, 180);
      return;
    }
    view = to;
    place();
  };

  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      touched = true;
      go(b.dataset.go);
    }),
  );

  // once, a moment after the note is seen: become a board by itself
  const seen = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      seen.disconnect();
      setTimeout(() => !touched && go('board'), reduce.matches ? 1600 : 1100);
    },
    { threshold: 0.3 },
  );

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 120);
  });
  (document.fonts?.ready ?? Promise.resolve()).then(() => {
    measure();
    seen.observe(note);
  });
}

// ---------- 2. tabs: five views of the real app ----------
for (const tabs of document.querySelectorAll('[data-tabs]')) {
  const list = [...tabs.querySelectorAll('[data-tab]')];
  const panes = [...document.querySelectorAll('[data-pane]')];
  const pick = (btn, focus) => {
    for (const b of list) {
      const on = b === btn;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    }
    for (const p of panes) p.classList.toggle('on', p.dataset.pane === btn.dataset.tab);
    if (focus) btn.focus();
  };
  list.forEach((b, i) => {
    b.addEventListener('click', () => pick(b, false));
    b.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      pick(list[(i + step + list.length) % list.length], true);
    });
  });
}

// ---------- 3. demos play while visible ----------
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.target.classList.toggle('playing', e.isIntersecting)),
  { threshold: 0.35 },
);
document.querySelectorAll('[data-demos] .tool').forEach((el) => io.observe(el));
const seenOnce = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('seen');
      seenOnce.unobserve(e.target);
    }),
  { threshold: 0.4 },
);
document.querySelectorAll('.cta').forEach((el) => seenOnce.observe(el));

// ---------- 4. light / dark ----------
for (const box of document.querySelectorAll('[data-cut]')) {
  const range = box.querySelector('input');
  const set = () => box.style.setProperty('--cut', `${range.value}%`);
  range.addEventListener('input', set);
  set();
}
