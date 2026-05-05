let allWorks = [];
let allTags = [];
let activeTag = null;
let activeType = '';
let galleryImages = [];
let galleryIndex = 0;

async function loadData() {
  const [worksRes, tagsRes] = await Promise.all([
    fetch('data/works.json'),
    fetch('data/tags.json')
  ]);
  allWorks = await worksRes.json();
  allTags = await tagsRes.json();

  renderStats();
  renderTagButtons();
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

  const allBtn = document.createElement('button');
  allBtn.className = 'tag-btn active';
  allBtn.textContent = 'All';
  allBtn.addEventListener('click', () => {
    activeTag = null;
    document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
    allBtn.classList.add('active');
    renderGallery();
  });
  container.appendChild(allBtn);

  allTags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-btn';
    btn.textContent = tag;
    btn.addEventListener('click', () => {
      activeTag = activeTag === tag ? null : tag;
      document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
      if (activeTag) {
        btn.classList.add('active');
      } else {
        allBtn.classList.add('active');
      }
      renderGallery();
    });
    container.appendChild(btn);
  });
}

function renderGallery() {
  const gallery = document.getElementById('gallery');
  gallery.innerHTML = '';

  const filtered = allWorks.filter(w => {
    if (!w.published) return false;
    if (activeTag && !w.tags.includes(activeTag)) return false;
    if (activeType && w.type !== activeType) return false;
    return true;
  });

  const countEl = document.getElementById('works-count');
  countEl.textContent = `${filtered.length} entries`;

  if (filtered.length === 0) {
    gallery.innerHTML = '<p class="no-results">該当する作品がありません</p>';
    return;
  }

  filtered.forEach((work, i) => {
    gallery.appendChild(createCard(work, i + 1));
  });
}

function createCard(work, index) {
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
    img.src = src;
    img.alt = work.title;
    img.onerror = () => {
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
  metaRow.innerHTML = `<span class="card-date">${work.date}</span><span class="card-id">ID: W${index}</span>`;

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
    const t = document.createElement('span');
    t.className = 'card-tag';
    t.textContent = tag;
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

loadData();
