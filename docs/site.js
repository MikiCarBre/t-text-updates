// The site's only script. No tracking, no cookies, no requests.
// 1. The hero note unfolds into a board as you scroll (or when you flip its Document | Board switch).
// 2. The tool demos loop only while they are on screen.
// 3. The light / dark screenshot follows the slider.
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, from, to) => clamp((p - from) / (to - from));

// ---------- 1. the unfolding note ----------
for (const sec of document.querySelectorAll('[data-unfold]')) {
  const note = sec.querySelector('[data-note]');
  const body = sec.querySelector('[data-body]');
  const blocks = [...sec.querySelectorAll('[data-blk]')];
  const sticky = sec.querySelector('[data-sticky]');
  const svg = sec.querySelector('[data-links]');
  const frame = sec.querySelector('[data-frame]');
  const steps = [...sec.querySelectorAll('[data-step]')];
  const buttons = [...sec.querySelectorAll('[data-go]')];
  const unfoldTask = sec.querySelector('[data-task-unfold]');
  const progressText = sec.querySelector('[data-progress]');
  const NS = 'http://www.w3.org/2000/svg';
  // arrows: from the right edge of one card to the left edge of another (indexes into `cards`)
  const LINKS_WIDE = [
    [0, 2],
    [1, 3],
    [1, 4],
  ];
  const LINKS_NARROW = [
    [0, 1],
    [1, 4],
  ];
  const paths = LINKS_WIDE.map(() => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('pathLength', '1');
    const h = document.createElementNS(NS, 'path');
    h.setAttribute('class', 'head');
    svg.append(p, h);
    return { p, h };
  });

  let staticMode = reduce.matches;
  let geo = null;
  let p = 0; // 0 = document … 1 = presenting
  let want = 0; // static mode: where the switch points

  const measure = () => {
    const narrow = innerWidth < 760;
    for (const el of [...blocks, sticky]) el.style.transform = '';
    body.style.transform = '';
    const b = body.getBoundingClientRect();
    const cards = [...blocks, sticky].map((el) => {
      const r = el.getBoundingClientRect();
      const [x, y, s] = (el.dataset[narrow ? 'boardM' : 'board'] || '0 0 1').split(' ').map(Number);
      return { el, x0: r.left - b.left, y0: r.top - b.top, w: r.width, h: r.height, x1: (x / 100) * b.width, y1: (y / 100) * b.height, s };
    });
    geo = { w: b.width, h: b.height, cards, links: narrow ? LINKS_NARROW : LINKS_WIDE };
  };

  const render = () => {
    if (!geo) measure();
    const { cards, w, h } = geo;
    const board = seg(p, 0.06, 0.4);
    note.style.setProperty('--board', board.toFixed(3));

    // every block lifts and lands on its own beat
    blocks.forEach((el, i) => {
      const c = cards[i];
      const e = ease(seg(p, 0.06 + i * 0.045, 0.3 + i * 0.045));
      const s = lerp(1, c.s, e);
      el.style.transform = `translate(${lerp(0, c.x1 - c.x0, e).toFixed(1)}px, ${lerp(0, c.y1 - c.y0, e).toFixed(1)}px) scale(${s.toFixed(4)})`;
      el.style.setProperty('--c', e.toFixed(3));
    });
    // the sticky note arrives from nowhere: it only exists on the board
    const st = cards[blocks.length];
    const se = ease(seg(p, 0.34, 0.44));
    sticky.style.opacity = se.toFixed(3);
    sticky.style.transform = `translate(${(st.x1 - st.x0).toFixed(1)}px, ${(st.y1 - st.y0 + (1 - se) * 18).toFixed(1)}px) scale(${(st.s * lerp(0.92, 1, se)).toFixed(4)}) rotate(${lerp(-4, 2, se).toFixed(2)}deg)`;

    // where each card sits on the board (for arrows and the frame)
    const at = (c) => ({ x: c.x1, y: c.y1, w: c.w * c.s, h: c.h * c.s });
    const draw = ease(seg(p, 0.44, 0.58));
    note.style.setProperty('--draw', draw.toFixed(3));
    paths.forEach((pp, i) => (pp.p.style.display = pp.h.style.display = i < geo.links.length ? '' : 'none'));
    geo.links.forEach(([a, z], i) => {
      const A = at(cards[a]);
      const Z = at(cards[z]);
      // side by side: right edge to left edge; one under the other: bottom edge to top edge;
      // too close for either (a narrow screen), no arrow rather than one into empty canvas
      const across = Z.x - (A.x + A.w) > 60;
      const down = Z.y - (A.y + A.h) > 56;
      paths[i].p.style.display = paths[i].h.style.display = across || down ? '' : 'none';
      if (across) {
        const x1 = A.x + A.w + 26;
        const y1 = A.y + Math.min(A.h / 2, 46);
        const x2 = Z.x - 28;
        const y2 = Z.y + Math.min(Z.h / 2, 40);
        const mid = (x1 + x2) / 2;
        paths[i].p.setAttribute('d', `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`);
        paths[i].h.setAttribute('d', `M ${x2 - 9} ${y2 - 6} L ${x2 + 1} ${y2} L ${x2 - 9} ${y2 + 6} Z`);
      } else {
        const x1 = A.x + Math.min(A.w * 0.3, 80);
        const y1 = A.y + A.h + 22;
        const x2 = Z.x + Math.min(Z.w * 0.3, 60);
        const y2 = Z.y - 24;
        const mid = (y1 + y2) / 2;
        paths[i].p.setAttribute('d', `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`);
        paths[i].h.setAttribute('d', `M ${x2 - 6} ${y2 - 9} L ${x2} ${y2 + 1} L ${x2 + 6} ${y2 - 9} Z`);
      }
    });

    // the frame around "Get started" and "Why people switch"
    const f1 = at(cards[2]);
    const f2 = at(cards[3]);
    const pad = 30;
    const fx = Math.min(f1.x, f2.x) - pad;
    const fy = Math.min(f1.y, f2.y) - pad - 30;
    const fw = Math.max(f1.x + f1.w, f2.x + f2.w) - fx + pad;
    const fh = Math.max(f1.y + f1.h, f2.y + f2.h) - fy + pad;
    Object.assign(frame.style, { left: `${fx}px`, top: `${fy}px`, width: `${fw}px`, height: `${fh}px` });
    note.style.setProperty('--frame', ease(seg(p, 0.6, 0.7)).toFixed(3));

    // present: the view flies into the frame
    const z = ease(seg(p, 0.76, 0.92));
    const S = Math.min((w * 0.9) / fw, (h * 0.84) / fh);
    const tx = w / 2 - (fx + fw / 2) * S;
    const ty = h / 2 - (fy + fh / 2) * S;
    body.style.transform = z ? `translate(${lerp(0, tx, z).toFixed(1)}px, ${lerp(0, ty, z).toFixed(1)}px) scale(${lerp(1, S, z).toFixed(4)})` : '';
    note.style.setProperty('--pres', z.toFixed(3));
    // presenting hides everything outside the frame, like the app does
    const away = (1 - z).toFixed(3);
    [blocks[0], blocks[1]].forEach((el) => {
      el.style.opacity = away;
      el.style.visibility = z > 0.98 ? 'hidden' : '';
    });
    sticky.style.opacity = (se * (1 - z)).toFixed(3);
    svg.style.opacity = away;

    const step = p < 0.06 ? 0 : p < 0.44 ? 1 : p < 0.74 ? 2 : 3;
    steps.forEach((li, i) => {
      li.classList.toggle('on', i === step);
      li.classList.toggle('past', i < step);
    });
    // the reader's own task: checked once the note has become a board
    const watched = p > 0.4;
    unfoldTask?.classList.toggle('done', watched);
    if (progressText) progressText.textContent = watched ? '2/3 · 67%' : '1/3 · 33%';
    note.style.setProperty('--done', watched ? '67%' : '33%');
    const onBoard = board > 0.5;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.go === 'board') === onBoard)));
  };

  const fromScroll = () => {
    const r = sec.getBoundingClientRect();
    const run = sec.offsetHeight - (innerHeight - 64);
    p = clamp(-r.top / Math.max(1, run));
  };

  let queued = false;
  const tick = () => {
    queued = false;
    if (!staticMode) fromScroll();
    render();
  };
  const queue = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(tick);
    }
  };

  const setMode = () => {
    staticMode = reduce.matches;
    sec.classList.toggle('static', staticMode);
    if (staticMode) p = want;
    geo = null;
    queue();
  };

  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      const target = b.dataset.go === 'board' ? 0.7 : 0;
      if (staticMode) {
        want = p = target;
        queue();
        return;
      }
      const run = sec.offsetHeight - (innerHeight - 64);
      scrollTo({ top: sec.offsetTop + target * run, behavior: 'smooth' });
    }),
  );
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', () => {
    geo = null;
    queue();
  });
  reduce.addEventListener?.('change', setMode);
  document.fonts?.ready.then(() => {
    geo = null;
    queue();
  });
  setMode();
}

// ---------- 2. demos play while visible ----------
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.target.classList.toggle('playing', e.isIntersecting)),
  { threshold: 0.35 },
);
document.querySelectorAll('[data-demos] .tool').forEach((el) => io.observe(el));
const seen = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('seen');
      seen.unobserve(e.target);
    }),
  { threshold: 0.4 },
);
document.querySelectorAll('.cta').forEach((el) => seen.observe(el));

// ---------- 3. light / dark ----------
for (const box of document.querySelectorAll('[data-cut]')) {
  const range = box.querySelector('input');
  const set = () => box.style.setProperty('--cut', `${range.value}%`);
  range.addEventListener('input', set);
  set();
}
