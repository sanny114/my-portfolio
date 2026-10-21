let allWorks = [];
let allTags = [];
let activeTag = null;
let activeType = '';
let sortOrder = 'new';
let keyword = '';
let galleryImages = [];
let galleryIndex = 0;

async function loadData() {
  const [worksRes, tagsRes] = await Promise.all([
    fetch('data/works.json'),
    fetch('data/tags.json')
  ]);
  allWorks = await worksRes.json();
  allTags = await tagsRes.json();

  readStateFromUrl();
  renderStats();
  renderGallery();
}

// 絞り込み・並び順をURLに残す（リロードやリンク共有で同じ表示になる）
function readStateFromUrl() {
  const params = new URLSearchParams(location.search);
  const type = params.get('type') || '';
  const tag = params.get('tag');
  activeType = ['', 'image', 'html', 'slide'].includes(type) ? type : '';
  activeTag = tag && allTags.includes(tag) ? tag : null;
  sortOrder = params.get('sort') === 'old' ? 'old' : 'new';
  keyword = params.get('q') || '';
  document.getElementById('search-input').value = keyword;
  document.querySelectorAll('.type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === activeType));
  document.getElementById('sort-select').value = sortOrder;
}

function writeStateToUrl() {
  const params = new URLSearchParams();
  if (activeType) params.set('type', activeType);
  if (activeTag) params.set('tag', activeTag);
  if (keyword.trim()) params.set('q', keyword.trim());
  if (sortOrder !== 'new') params.set('sort', sortOrder);
  const query = params.toString();
  history.replaceState(null, '', location.pathname + (query ? '?' + query : '') + location.hash);
}

// 「画像」には複数枚のギャラリー作品も含める
function matchesType(work, type) {
  if (!type) return true;
  if (type === 'image') return work.type === 'image' || work.type === 'gallery';
  return work.type === type;
}

// 全角・半角、大文字・小文字、ひらがな・カタカナの違いを無視して比べる
function normalize(text) {
  return String(text || '').normalize('NFKC').toLowerCase()
    .replace(/[\u3041-\u3096]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}

// タイトル・ツール・プロンプト/メモ・タグのどこかに、
// 入力したキーワード（スペース区切りなら全部）が含まれる作品を残す
function matchesKeyword(work) {
  const words = normalize(keyword).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalize([work.title, work.tool, work.prompt, work.memo, (work.tags || []).join(' ')].join(' '));
  return words.every(word => haystack.includes(word));
}

function setTag(tag) {
  activeTag = tag;
  renderGallery();
}

function renderStats() {
  const published = allWorks.filter(w => w.published);
  const images = published.filter(w => w.type === 'image' || w.type === 'gallery').length;
  const sites = published.filter(w => w.type === 'html').length;
  const dates = published.map(w => w.date).sort().reverse();
  const lastDate = dates[0] ? dates[0].replace('-', '.') : '—';

  document.getElementById('stat-total').textContent = published.length;
  document.getElementById('stat-images').textContent = images;
  document.getElementById('stat-sites').textContent = sites;
  document.getElementById('stat-date').textContent = lastDate;
}

function renderTagButtons() {
  const container = document.getElementById('tag-filters');
  container.innerHTML = '';

  // 件数は今の種類フィルターに合わせて数える
  const base = allWorks.filter(w => w.published && matchesType(w, activeType) && matchesKeyword(w));

  const makeBtn = (label, tag, count) => {
    const btn = document.createElement('button');
    btn.className = 'tag-btn' + (activeTag === tag ? ' active' : '');
    btn.type = 'button';
    btn.setAttribute('aria-pressed', activeTag === tag ? 'true' : 'false');
    btn.innerHTML = '';
    btn.append(label);
    const c = document.createElement('span');
    c.className = 'tag-count';
    c.textContent = count;
    btn.appendChild(c);
    if (count === 0 && activeTag !== tag) btn.disabled = true;
    btn.addEventListener('click', () => setTag(tag === null || activeTag === tag ? null : tag));
    container.appendChild(btn);
  };

  makeBtn('All', null, base.length);
  allTags.forEach(tag => makeBtn(tag, tag, base.filter(w => (w.tags || []).includes(tag)).length));
}

function sortWorks(works) {
  const dir = sortOrder === 'old' ? 1 : -1;
  // 日付は「YYYY-MM」なので、同じ月の中は登録番号（id）で並べる
  return works.slice().sort((a, b) =>
    (String(a.date).localeCompare(String(b.date)) || (a.id - b.id)) * dir
  );
}

function renderGallery() {
  writeStateToUrl();
  renderTagButtons();

  const gallery = document.getElementById('gallery');
  gallery.innerHTML = '';

  const filtered = sortWorks(allWorks.filter(w => {
    if (!w.published) return false;
    if (activeTag && !(w.tags || []).includes(activeTag)) return false;
    if (!matchesType(w, activeType)) return false;
    if (!matchesKeyword(w)) return false;
    return true;
  }));

  const countEl = document.getElementById('works-count');
  countEl.textContent = `${filtered.length} entries`;

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'no-results';
    empty.innerHTML = '<p>該当する作品がありません</p>';
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'reset-btn';
    reset.textContent = '絞り込みを解除する';
    reset.addEventListener('click', () => {
      activeTag = null;
      activeType = '';
      keyword = '';
      document.getElementById('search-input').value = '';
      document.querySelectorAll('.type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === ''));
      renderGallery();
    });
    empty.appendChild(reset);
    gallery.appendChild(empty);
    return;
  }

  filtered.forEach(work => {
    gallery.appendChild(createCard(work));
  });
}

// 一覧用の軽い画像（tools/make_card_images.py で作成）のパス
function cardImagePath(src) {
  const file = src.split('/').pop();
  return 'images/cards/' + file.replace(/\.[^.]+$/, '') + '.webp';
}

function createCard(work) {
  const card = document.createElement('div');
  card.className = 'card';

  // Thumbnail
  const thumb = document.createElement('div');
  thumb.className = 'card-thumb';

  const src = work.type === 'image' ? work.image
    : work.type === 'gallery' ? (work.images && work.images[0] || '')
    : (work.thumbnail || '');
  if (src) {
    const img = document.createElement('img');
    img.alt = work.title;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = cardImagePath(src);
    img.onerror = () => {
      // 軽い画像がまだ無いときは元画像を表示する
      if (!img.dataset.fallback) {
        img.dataset.fallback = '1';
        img.src = src;
        return;
      }
      thumb.innerHTML = `<div class="card-thumb-placeholder">${work.type === 'html' ? 'HTMLサイト' : work.type === 'slide' ? 'スライド' : '画像なし'}</div>`;
      badge.remove();
    };
    thumb.appendChild(img);
    if (work.type === 'image') {
      thumb.addEventListener('click', () => openModal(src, work.title));
    } else if (work.type === 'gallery') {
      thumb.addEventListener('click', () => openGallery(work.images, 0, work.title));
    }
  } else {
    thumb.innerHTML = `<div class="card-thumb-placeholder">${work.type === 'html' ? 'HTMLサイト' : work.type === 'slide' ? 'スライド' : '画像なし'}</div>`;
  }

  const badge = document.createElement('span');
  const badgeClass = work.type === 'image' || work.type === 'gallery' ? 'badge-image' : work.type === 'slide' ? 'badge-slide' : 'badge-website';
  const badgeText = work.type === 'image' ? 'Image' : work.type === 'gallery' ? 'Gallery' : work.type === 'slide' ? 'Slide' : 'Website';
  badge.className = `card-badge ${badgeClass}`;
  badge.textContent = badgeText;
  thumb.appendChild(badge);

  // Body
  const body = document.createElement('div');
  body.className = 'card-body';

  const metaRow = document.createElement('div');
  metaRow.className = 'card-meta-row';
  metaRow.innerHTML = `<span class="card-date">${work.date}</span><span class="card-id">ID: W${work.id}</span>`;

  const titleEl = document.createElement('div');
  titleEl.className = 'card-title';
  if ((work.type === 'html' || work.type === 'slide') && work.url) {
    titleEl.innerHTML = `<a href="${work.url}" target="_blank" rel="noopener">${work.title}<span class="link-icon">↗</span></a>`;
  } else {
    titleEl.textContent = work.title;
  }

  // Info rows
  const info = document.createElement('div');
  info.className = 'card-info';

  // TOOLS row
  info.appendChild(makeInfoRow('TOOLS', work.tool));

  // PROMPT / NOTES row
  const textContent = (work.type === 'image' || work.type === 'gallery') ? work.prompt : work.memo;
  const rowLabel = (work.type === 'image' || work.type === 'gallery') ? 'PROMPT' : 'NOTES';

  if (textContent) {
    info.appendChild(makeExpandableRow(rowLabel, textContent));
  }

  // TAGS row
  const tagsRow = document.createElement('div');
  tagsRow.className = 'info-row';
  const tagsLabel = document.createElement('span');
  tagsLabel.className = 'info-label';
  tagsLabel.textContent = 'TAGS';
  const tagsVal = document.createElement('div');
  tagsVal.className = 'card-tags';
  (work.tags || []).forEach(tag => {
    // カード内のタグを押すと、そのタグで絞り込む
    const t = document.createElement('button');
    t.type = 'button';
    t.className = 'card-tag';
    t.textContent = tag;
    t.title = `「${tag}」で絞り込む`;
    t.addEventListener('click', () => {
      setTag(tag);
      document.getElementById('works').scrollIntoView({ behavior: 'smooth' });
    });
    tagsVal.appendChild(t);
  });
  tagsRow.appendChild(tagsLabel);
  tagsRow.appendChild(tagsVal);
  info.appendChild(tagsRow);

  body.appendChild(metaRow);
  body.appendChild(titleEl);
  body.appendChild(info);

  card.appendChild(thumb);
  card.appendChild(body);
  return card;
}

function makeInfoRow(label, value) {
  const row = document.createElement('div');
  row.className = 'info-row';
  row.innerHTML = `<span class="info-label">${label}</span><span class="info-value">${value}</span>`;
  return row;
}

function makeExpandableRow(label, text) {
  const row = document.createElement('div');
  row.className = 'info-row';

  const labelEl = document.createElement('span');
  labelEl.className = 'info-label';
  labelEl.textContent = label;

  const valEl = document.createElement('div');
  valEl.className = 'info-value';

  if (text.length <= 60) {
    valEl.textContent = text;
  } else {
    const preview = document.createElement('span');
    preview.className = 'info-text';
    preview.textContent = text;

    const btn = document.createElement('button');
    btn.className = 'expand-btn';
    btn.textContent = '全文を表示';

    const full = document.createElement('div');
    full.className = 'expand-content';
    full.textContent = text;

    btn.addEventListener('click', () => {
      const isOpen = full.classList.toggle('open');
      preview.style.display = isOpen ? 'none' : '';
      btn.textContent = isOpen ? '閉じる' : '全文を表示';
    });

    valEl.appendChild(preview);
    valEl.appendChild(btn);
    valEl.appendChild(full);
  }

  row.appendChild(labelEl);
  row.appendChild(valEl);
  return row;
}

// Modal
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modal-img');

function openModal(src, alt) {
  galleryImages = [src];
  galleryIndex = 0;
  modalImg.src = src;
  modalImg.alt = alt;
  document.getElementById('modal-counter').textContent = '';
  document.getElementById('modal-prev').classList.add('hidden');
  document.getElementById('modal-next').classList.add('hidden');
  modal.classList.add('open');
}

function openGallery(images, index, title) {
  galleryImages = images;
  galleryIndex = index;
  updateGalleryModal(title);
  modal.classList.add('open');
}

function updateGalleryModal(title) {
  modalImg.src = galleryImages[galleryIndex];
  modalImg.alt = title || '';
  const counter = document.getElementById('modal-counter');
  const prevBtn = document.getElementById('modal-prev');
  const nextBtn = document.getElementById('modal-next');
  counter.textContent = `${galleryIndex + 1} / ${galleryImages.length}`;
  prevBtn.classList.toggle('hidden', galleryIndex === 0);
  nextBtn.classList.toggle('hidden', galleryIndex === galleryImages.length - 1);
}

function closeModal() {
  modal.classList.remove('open');
  modalImg.src = '';
  galleryImages = [];
  galleryIndex = 0;
  document.getElementById('modal-counter').textContent = '';
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-prev').addEventListener('click', e => {
  e.stopPropagation();
  if (galleryIndex > 0) { galleryIndex--; updateGalleryModal(modalImg.alt); }
});
document.getElementById('modal-next').addEventListener('click', e => {
  e.stopPropagation();
  if (galleryIndex < galleryImages.length - 1) { galleryIndex++; updateGalleryModal(modalImg.alt); }
});
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'ArrowLeft' && galleryImages.length > 1 && galleryIndex > 0) {
    galleryIndex--; updateGalleryModal(modalImg.alt);
  }
  if (e.key === 'ArrowRight' && galleryImages.length > 1 && galleryIndex < galleryImages.length - 1) {
    galleryIndex++; updateGalleryModal(modalImg.alt);
  }
});

// Type filter
document.querySelectorAll('.type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    activeType = btn.dataset.type;
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderGallery();
  });
});

// Keyword search（日本語の変換中は確定するまで待つ）
const searchInput = document.getElementById('search-input');
searchInput.addEventListener('input', e => {
  if (e.isComposing) return;
  keyword = searchInput.value;
  renderGallery();
});
searchInput.addEventListener('compositionend', () => {
  keyword = searchInput.value;
  renderGallery();
});

// Sort
document.getElementById('sort-select').addEventListener('change', e => {
  sortOrder = e.target.value;
  renderGallery();
});

loadData();
