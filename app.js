/* Useful Words — EN → RU / KZ */
'use strict';

const WORDS = window.WORDS;
const TOTAL = WORDS.length;

/* ================= Tabs ================= */
const tabs = document.querySelectorAll('.tab');
const views = { list: document.getElementById('view-list'), cards: document.getElementById('view-cards'), test: document.getElementById('view-test') };

function showView(name) {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.view === name));
  Object.entries(views).forEach(([k, el]) => el.classList.toggle('active', k === name));
}
tabs.forEach(t => t.addEventListener('click', () => showView(t.dataset.view)));

/* ================= View 1: word list ================= */
const tbody = document.getElementById('word-tbody');
const searchInput = document.getElementById('search');
const shownCount = document.getElementById('shown-count');
const noResults = document.getElementById('no-results');
document.getElementById('total-count').textContent = TOTAL;

function esc(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function highlight(text, q) {
  const safe = esc(text);
  if (!q) return safe;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return safe;
  return esc(text.slice(0, idx)) + '<mark>' + esc(text.slice(idx, idx + q.length)) + '</mark>' + esc(text.slice(idx + q.length));
}

function renderList() {
  const q = searchInput.value.trim();
  const frag = document.createDocumentFragment();
  let shown = 0;
  for (const w of WORDS) {
    if (q) {
      const hay = (w.word + ' ' + w.ru + ' ' + w.kk).toLowerCase();
      if (!hay.includes(q.toLowerCase())) continue;
    }
    shown++;
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td class="c-num">' + w.n + '</td>' +
      '<td class="c-en">' + highlight(w.word, q) + '</td>' +
      '<td class="c-ru">' + highlight(w.ru, q) + '</td>' +
      '<td class="c-kk">' + highlight(w.kk, q) + '</td>';
    tr.style.cursor = 'pointer';
    tr.title = 'Открыть карточку';
    tr.addEventListener('click', () => { openCardByIndex(w.n - 1); });
    frag.appendChild(tr);
  }
  tbody.replaceChildren(frag);
  shownCount.textContent = shown;
  noResults.hidden = shown > 0;
}
let searchTimer = null;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderList, 120);
});
renderList();

/* ================= View 2: flashcards (browse) ================= */
const browseCard = document.getElementById('browse-card');
const browseEn = document.getElementById('browse-en');
const browseRu = document.getElementById('browse-ru');
const browseKk = document.getElementById('browse-kk');
const browseNum = document.getElementById('browse-num');
const browseRange = document.getElementById('browse-range');
let browseIdx = 0;
let browseFlipped = false;

browseRange.max = TOTAL;

function paintBrowse() {
  const w = WORDS[browseIdx];
  browseEn.textContent = w.word;
  browseRu.textContent = w.ru;
  browseKk.textContent = w.kk;
  browseNum.textContent = (browseIdx + 1) + ' / ' + TOTAL;
  browseRange.value = browseIdx + 1;
}
function setBrowseFlip(f) {
  browseFlipped = f;
  browseCard.classList.toggle('flipped', f);
}
function openCardByIndex(i) {
  browseIdx = Math.max(0, Math.min(TOTAL - 1, i));
  paintBrowse();
  setBrowseFlip(false);
  showView('cards');
}
function browseNext() { browseIdx = (browseIdx + 1) % TOTAL; paintBrowse(); setBrowseFlip(false); }
function browsePrev() { browseIdx = (browseIdx - 1 + TOTAL) % TOTAL; paintBrowse(); setBrowseFlip(false); }

browseCard.addEventListener('click', () => setBrowseFlip(!browseFlipped));
document.getElementById('browse-flip').addEventListener('click', () => setBrowseFlip(!browseFlipped));
document.getElementById('browse-next').addEventListener('click', browseNext);
document.getElementById('browse-prev').addEventListener('click', browsePrev);
browseRange.addEventListener('input', () => { browseIdx = +browseRange.value - 1; paintBrowse(); setBrowseFlip(false); });

paintBrowse();

/* ================= View 3: self test ================= */
const setupBox = document.getElementById('test-setup');
const runBox = document.getElementById('test-run');
const resultBox = document.getElementById('test-result');
const presetRow = document.getElementById('preset-row');
const customN = document.getElementById('custom-n');
const testCard = document.getElementById('test-card');
const testEn = document.getElementById('test-en');
const testRu = document.getElementById('test-ru');
const testKk = document.getElementById('test-kk');
const testControls = document.getElementById('test-controls');
const progressFill = document.getElementById('test-progress-fill');
const progressLabel = document.getElementById('test-progress-label');

const PRESETS = [10, 25, 50, 100, 200, 300, 500, TOTAL];
let chosenN = 100;
let queue = [];       // word indices to go through
let pos = 0;
let baseN = 0;        // unique words in this test
let testFlipped = false;
let finalState = {};  // idx -> 'known' | 'unknown' (latest answer)

PRESETS.forEach(n => {
  const b = document.createElement('button');
  b.className = 'preset' + (n === chosenN ? ' active' : '');
  b.textContent = n === TOTAL ? 'Все (' + TOTAL + ')' : n;
  b.addEventListener('click', () => {
    chosenN = n;
    customN.value = n;
    presetRow.querySelectorAll('.preset').forEach(p => p.classList.toggle('active', p === b));
  });
  presetRow.appendChild(b);
});
customN.addEventListener('input', () => {
  presetRow.querySelectorAll('.preset').forEach(p => p.classList.remove('active'));
});
function clampN(n) { return Math.max(1, Math.min(TOTAL, n || 1)); }

function paintTestCard() {
  const w = WORDS[queue[pos]];
  testEn.textContent = w.word;
  testRu.textContent = w.ru;
  testKk.textContent = w.kk;
  const shown = Math.min(pos + 1, baseN);
  progressLabel.textContent = shown + ' / ' + baseN;
  progressFill.style.width = Math.round((pos / baseN) * 100) + '%';
}
function setTestFlip(f) {
  testFlipped = f;
  testCard.classList.toggle('flipped', f);
  testControls.hidden = !f;
}

function startTest(indices) {
  queue = indices.slice();
  pos = 0;
  baseN = queue.length;
  finalState = {};
  setupBox.hidden = true;
  resultBox.hidden = true;
  runBox.hidden = false;
  paintTestCard();
  setTestFlip(false);
}

document.getElementById('start-test').addEventListener('click', () => {
  const n = clampN(parseInt(customN.value, 10));
  startTest(Array.from({ length: n }, (_, i) => i));
});

testCard.addEventListener('click', () => setTestFlip(!testFlipped));
document.getElementById('test-flip').addEventListener('click', () => setTestFlip(!testFlipped));

document.getElementById('test-know').addEventListener('click', () => {
  finalState[queue[pos]] = 'known';
  advance();
});
document.getElementById('test-unknown').addEventListener('click', () => {
  finalState[queue[pos]] = 'unknown';
  advance();
});

function advance() {
  pos++;
  if (pos >= queue.length) { finishTest(); return; }
  paintTestCard();
  setTestFlip(false);
}

function finishTest() {
  runBox.hidden = true;
  resultBox.hidden = false;
  const known = Object.values(finalState).filter(v => v === 'known').length;
  const missed = queue.filter(i => finalState[i] === 'unknown');
  const pct = Math.round(known / baseN * 100);
  document.getElementById('score-pct').textContent = pct + '%';
  document.getElementById('score-ring').style.setProperty('--p', pct + '%');
  document.getElementById('score-title').textContent =
    pct === 100 ? 'Идеально! 🏆' : pct >= 70 ? 'Отличный результат! 💪' : pct >= 40 ? 'Неплохо, продолжай! 👍' : 'Нужно ещё повторить 📖';
  document.getElementById('score-sub').textContent = 'Ты знал ' + known + ' из ' + baseN + ' слов.';
  const missedWrap = document.getElementById('missed-wrap');
  const missedList = document.getElementById('missed-list');
  const retryBtn = document.getElementById('retry-missed');
  if (missed.length) {
    missedWrap.hidden = false;
    const frag = document.createDocumentFragment();
    missed.forEach(i => {
      const w = WORDS[i];
      const li = document.createElement('li');
      li.innerHTML = '<span class="m-en">' + esc(w.word) + '</span><span class="m-ru">' + esc(w.ru) + '</span><span class="m-kk">' + esc(w.kk) + '</span>';
      frag.appendChild(li);
    });
    missedList.replaceChildren(frag);
    retryBtn.hidden = false;
  } else {
    missedWrap.hidden = true;
    retryBtn.hidden = true;
  }
  resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('test-again').addEventListener('click', () => {
  resultBox.hidden = true;
  runBox.hidden = true;
  setupBox.hidden = false;
});
document.getElementById('retry-missed').addEventListener('click', () => {
  const missed = queue.filter(i => finalState[i] === 'unknown');
  startTest(missed);
});

/* ================= Keyboard ================= */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (views.list.classList.contains('active')) return;
  if (views.cards.classList.contains('active')) {
    if (e.key === 'ArrowRight') browseNext();
    else if (e.key === 'ArrowLeft') browsePrev();
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setBrowseFlip(!browseFlipped); }
  } else if (views.test.classList.contains('active') && !runBox.hidden) {
    if (!testFlipped && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); setTestFlip(true); }
    else if (testFlipped && e.key === '1') { e.preventDefault(); document.getElementById('test-know').click(); }
    else if (testFlipped && e.key === '2') { e.preventDefault(); document.getElementById('test-unknown').click(); }
  }
});
