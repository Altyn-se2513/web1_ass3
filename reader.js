/* =========================================================
   Digital Book Collection — Reader with Highlights
   Author: Altyn Abdinurova | Group: SE-2513
   ========================================================= */
(function () {
  const KEY_HL   = 'bc_reader_highlights';
  const KEY_BM   = 'bc_reader_bookmarks';
  const KEY_LAST = 'bc_reader_last_book';
  const KEY_SHELF = 'bc_shelf';

  const $ = (id) => document.getElementById(id);
  const getHL = () => JSON.parse(localStorage.getItem(KEY_HL) || '[]');
  const setHL = (a) => localStorage.setItem(KEY_HL, JSON.stringify(a));
  const getBM = () => JSON.parse(localStorage.getItem(KEY_BM) || '[]');
  const setBM = (a) => localStorage.setItem(KEY_BM, JSON.stringify(a));
  const getShelf = () => JSON.parse(localStorage.getItem(KEY_SHELF) || '[]');

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g,
      (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  /* ===== Public-domain book excerpts ===== */
  const BOOKS = {
    pride: {
      title: "Pride and Prejudice",
      author: "Jane Austen",
      cover: "imgs/pride.jpg",
      paragraphs: [
        "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.",
        "However little known the feelings or views of such a man may be on his first entering a neighbourhood..."
      ]
    },
    gatsby: {
      title: "The Great Gatsby",
      author: "F. Scott Fitzgerald",
      cover: "imgs/gatsby.jpg",
      paragraphs: [
        "In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since.",
        "Whenever you feel like criticizing any one, he told me, just remember that all the people in this world haven't had the advantages that you've had."
      ]
    }
  };

  /* ===== Определяем книгу ===== */
  const params = new URLSearchParams(window.location.search);
  const urlId = params.get('id');
  let currentBook;

  if (urlId) {
    if (BOOKS[urlId]) {
      currentBook = urlId;
      localStorage.setItem(KEY_LAST, currentBook);
    } else {
      currentBook = null;
    }
  } else {
    currentBook = localStorage.getItem(KEY_LAST) || 'pride';
    if (!BOOKS[currentBook]) currentBook = 'pride';
    localStorage.setItem(KEY_LAST, currentBook);
  }

  /* ===== Render book ===== */
  function renderBook() {
    const container = $('book-reader');
    if (!container) return;

    const book = BOOKS[currentBook];

    const titleDisplay = $('book-title-display');
    if (titleDisplay) {
      titleDisplay.textContent = book.title + ' — ' + book.author.split('·')[0].trim();
    }

    let html = `
      <header class="reader-header pb-3 mb-4">
        <img src="${book.cover}" alt="${escapeHtml(book.title)} cover">
        <div>
          <h1 class="mb-1">${escapeHtml(book.title)}</h1>
          <p class="mb-0">${escapeHtml(book.author)} · Public Domain</p>
        </div>
      </header>`;
    book.paragraphs.forEach((text, i) => {
      html += `<p class="reader-para p-2 mb-3" data-para-id="${i}" id="para-${i}">${escapeHtml(text)}</p>`;
    });
    container.innerHTML = html;
    applyHighlights();
  }

  /* ===== Заглушка ===== */
  function renderNotAvailable() {
    const container = $('book-reader');
    if (!container) return;
    const titleDisplay = $('book-title-display');
    if (titleDisplay) titleDisplay.textContent = 'Not available';
    container.innerHTML = `
      <div class="reader-empty p-5">
        <h2 class="mb-3">📕 Эта книга пока не доступна в онлайн-ридере</h2>
        <p>У нас есть отрывки только для этих книг:</p>
        <ul class="reader-suggest mt-3">
          ${Object.entries(BOOKS).map(([id, b]) =>
            `<li class="p-2"><a href="8reader.html?id=${id}">${escapeHtml(b.title)} — ${escapeHtml(b.author)}</a></li>`
          ).join('')}
        </ul>
      </div>`;
  }

  /* ===== Apply highlights ===== */
  function applyHighlights() {
    if (!currentBook) return;
    const book = BOOKS[currentBook];
    if (!book) return;
    const hls = getHL().filter((h) => h.book === currentBook);

    document.querySelectorAll('.reader-para').forEach((p) => {
      const id = parseInt(p.dataset.paraId, 10);
      const text = book.paragraphs[id];
      const paraHLs = hls.filter((h) => h.paraId === id).sort((a, b) => a.start - b.start);

      let html = '';
      let cursor = 0;
      for (const h of paraHLs) {
        if (h.start > cursor) html += escapeHtml(text.slice(cursor, h.start));
        html += `<mark class="hl hl-${h.color} px-1 py-0" data-hl-id="${h.id}">${escapeHtml(text.slice(h.start, h.end))}</mark>`;
        cursor = Math.max(cursor, h.end);
      }
      if (cursor < text.length) html += escapeHtml(text.slice(cursor));
      p.innerHTML = html || escapeHtml(text);
    });
  }

  /* ===== Highlight selection ===== */
  function highlightSelection(color) {
    if (!currentBook || !BOOKS[currentBook]) { alert('Открой доступную книгу.'); return; }

    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) {
      alert('Сначала выдели текст, потом нажми цвет.');
      return;
    }
    const range = sel.getRangeAt(0);
    const startNode = range.startContainer;
    const endNode = range.endContainer;
    const startEl = startNode.nodeType === 3 ? startNode.parentElement : startNode;
    const endEl = endNode.nodeType === 3 ? endNode.parentElement : endNode;
    const p = startEl.closest('.reader-para');
    const endP = endEl.closest('.reader-para');

    if (!p || p !== endP) { alert('Выделяй текст в пределах одного абзаца.'); return; }

    const paraId = parseInt(p.dataset.paraId, 10);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(p);
    preRange.setEnd(startNode, range.startOffset);
    const start = preRange.toString().length;
    const selected = range.toString();
    const end = start + selected.length;
    if (start === end) return;

    const hls = getHL();
    const overlap = hls.some((h) =>
      h.book === currentBook && h.paraId === paraId &&
      !(h.end <= start || h.start >= end)
    );
    if (overlap) { alert('Этот фрагмент уже выделен.'); return; }

    hls.push({
      id: 'hl_' + Date.now(),
      book: currentBook, paraId, start, end,
      text: selected, color, createdAt: Date.now()
    });
    setHL(hls);
    sel.removeAllRanges();
    applyHighlights();
    renderSidebar();
  }

  /* ===== Bookmark ===== */
  function bookmarkCurrentParagraph() {
    if (!currentBook || !BOOKS[currentBook]) { alert('Открой доступную книгу.'); return; }
    const paras = [...document.querySelectorAll('.reader-para')];
    if (!paras.length) return;
    const centerY = window.innerHeight / 2;
    let nearest = paras[0], min = Infinity;
    for (const p of paras) {
      const r = p.getBoundingClientRect();
      const dist = Math.abs((r.top + r.bottom) / 2 - centerY);
      if (dist < min) { min = dist; nearest = p; }
    }
    const paraId = parseInt(nearest.dataset.paraId, 10);
    const text = BOOKS[currentBook].paragraphs[paraId];

    const bms = getBM();
    if (bms.some((b) => b.book === currentBook && b.paraId === paraId)) {
      alert('Этот абзац уже в закладках.');
      return;
    }
    bms.push({
      id: 'bm_' + Date.now(),
      book: currentBook, paraId,
      preview: text.slice(0, 90) + (text.length > 90 ? '…' : ''),
      createdAt: Date.now()
    });
    setBM(bms);
    renderSidebar();
    alert('Добавлено в закладки! 🔖');
  }

  /* ===== Sidebar ===== */
  function renderSidebar() {
    const bmList = $('bookmark-list');
    const hlList = $('highlight-list');
    const shelfList = $('reader-shelf-list');

    if (bmList) {
      const bms = currentBook ? getBM().filter((b) => b.book === currentBook) : [];
      bmList.innerHTML = bms.length
        ? bms.map((b) => `
            <li class="side-link p-2 pe-4" data-para="${b.paraId}">
              <a class="side-text" href="#para-${b.paraId}">🔖 ${escapeHtml(b.preview)}</a>
              <button class="btn btn-sm btn-outline-danger side-remove p-1"
                      data-remove-bm="${b.id}" title="Remove bookmark"
                      aria-label="Remove bookmark">✕</button>
            </li>`).join('')
        : '<li class="empty-msg-small p-2">No bookmarks yet</li>';
    }

    if (hlList) {
      const hls = currentBook ? getHL().filter((h) => h.book === currentBook) : [];
      hlList.innerHTML = hls.length
        ? hls.map((h) => `
            <li class="side-link p-2 pe-4" data-para="${h.paraId}">
              <a class="side-text" href="#para-${h.paraId}">
                <span class="swatch swatch-${h.color} mt-1"></span>
                ${escapeHtml(h.text.slice(0, 60))}${h.text.length > 60 ? '…' : ''}
              </a>
              <button class="btn btn-sm btn-outline-danger side-remove p-1"
                      data-remove-hl="${h.id}" title="Remove highlight"
                      aria-label="Remove highlight">✕</button>
            </li>`).join('')
        : '<li class="empty-msg-small p-2">No highlights yet</li>';
    }

    if (shelfList) {
      const shelf = getShelf();
      const available = shelf.filter((b) => BOOKS[b.id]);
      if (!shelf.length) {
        shelfList.innerHTML = '<li class="empty-msg-small p-2">No books on your shelf yet. Add them from the <a href="3product.html">catalog</a>.</li>';
      } else if (!available.length) {
        shelfList.innerHTML = '<li class="empty-msg-small p-2">None of your saved books have reader excerpts yet.</li>';
      } else {
        shelfList.innerHTML = available.map((b) => {
          const isActive = b.id === currentBook;
          return `<li class="shelf-link py-2 ${isActive ? 'active' : ''}">
            <a href="8reader.html?id=${encodeURIComponent(b.id)}">${escapeHtml(b.title)}</a>
            ${isActive ? '<span class="shelf-tag px-2 py-0">Reading</span>' : ''}
          </li>`;
        }).join('');
      }
    }

    /* Клик по закладке/выделению → скролл к абзацу */
    document.querySelectorAll('.side-link').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.side-remove')) return;

        const link = e.target.closest('a.side-text');
        if (link) e.preventDefault();

        const paraId = parseInt(el.dataset.para, 10);
        const p = document.getElementById('para-' + paraId);
        if (p) {
          p.scrollIntoView({ behavior: 'smooth', block: 'center' });
          p.classList.add('flash');
          setTimeout(() => p.classList.remove('flash'), 1600);
        }
      });
    });

    document.querySelectorAll('[data-remove-bm]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setBM(getBM().filter((b) => b.id !== btn.dataset.removeBm));
        renderSidebar();
      });
    });

    document.querySelectorAll('[data-remove-hl]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setHL(getHL().filter((h) => h.id !== btn.dataset.removeHl));
        applyHighlights();
        renderSidebar();
      });
    });
  }

  /* ===== Init ===== */
  document.addEventListener('DOMContentLoaded', () => {
    const bookSel = $('book-select');
    if (bookSel) {
      if (currentBook) bookSel.value = currentBook;
      bookSel.addEventListener('change', (e) => {
        if (e.target.value) {
          window.location.href = '8reader.html?id=' + e.target.value;
        }
      });
    }

    document.querySelectorAll('.hl-btn').forEach((btn) => {
      btn.addEventListener('click', () => highlightSelection(btn.dataset.color));
    });

    const bmBtn = $('bookmark-btn');
    if (bmBtn) bmBtn.addEventListener('click', bookmarkCurrentParagraph);

    const clrBtn = $('clear-highlights');
    if (clrBtn) {
      clrBtn.addEventListener('click', () => {
        if (!currentBook) return;
        if (!confirm('Clear all highlights and bookmarks for this book?')) return;
        setHL(getHL().filter((h) => h.book !== currentBook));
        setBM(getBM().filter((b) => b.book !== currentBook));
        applyHighlights();
        renderSidebar();
      });
    }

    if (currentBook && BOOKS[currentBook]) {
      renderBook();
      renderSidebar();
    } else {
      renderNotAvailable();
      renderSidebar();
    }
  });
})();