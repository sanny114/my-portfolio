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
  const lastDate = dates[0] ? dates[0].replace(/-/g, '.') : '—';

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
    gallery.appendChild(createCard(work, i + 1, i));
  });
}

const ACCENTS = ['var(--accent-lime)', 'var(--accent-blue)', 'var(--accent-peach)'];

function createCard(work, index, colorIndex) {
  const accent = ACCENTS[colorIndex % 3];

  const card = document.createElement('div');
  card.className = 'card';
  card.style.setProperty('--accent', accent);

  // Top bar
  const topbar = document.createElement('div');
  topbar.className = 'card-topbar';

  const num = document.createElement('span');
  num.className = 'card-num';
  num.textContent = '№' + String(index).padStart(2, '0');

  const typeBadge = document.createElement('span');
  typeBadge.className = 'card-type-badge';
  const badgeMap = { image: 'IMG', gallery: 'GAL', html: 'WEB', slide: 'SLD' };
  typeBadge.textContent = badgeMap[work.type] || 'ITEM';

  topbar.appendChild(num);
  topbar.appendChild(typeBadge);

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
      thumb.innerHTML = `<div class="card-thumb-placeholder">${badgeMap[work.type] || work.type}</div>`;
    };
    thumb.appendChild(img);
  } else {
    thumb.innerHTML = `<div class="card-thumb-placeholder">${badgeMap[work.type] || work.type}</div>`;
  }

  if (work.type === 'image') {
    thumb.classList.add('clickable');
    thumb.addEventListener('click', () => openModal(src, work.title));
  } else if (work.type === 'gallery') {
    thumb.classList.add('clickable');
    thumb.addEventListener('click', () => openGallery(work.images, 0, work.title));
  }

  const dateBadge = document.createElement('span');
  dateBadge.className = 'card-date-badge';
  dateBadge.textContent = work.date.replace(/-/g, '.');
  thumb.appendChild(dateBadge);

  // Body
  const body = document.createElement('div');
  body.className = 'card-body';

  // Title
  if ((work.type === 'html' || work.type === 'slide') && work.url) {
    const titleLink = document.createElement('a');
    titleLink.className = 'card-title-link';
    titleLink.href = work.url;
    titleLink.target = '_blank';
    titleLink.rel = 'noopener';

    const titleText = document.createElement('span');
    titleText.textContent = work.title;

    const linkIcon = document.createElement('span');
    linkIcon.className = 'link-icon';
    linkIcon.textContent = '↗';

    titleLink.appendChild(titleText);
    titleLink.appendChild(linkIcon);
    body.appendChild(titleLink);
  } else {
    const titleEl = document.createElement('div');
    titleEl.className = 'card-title';
    titleEl.textContent = work.title;
    body.appendChild(titleEl);
  }

  // Tools
  if (work.tool) {
    const toolsRow = document.createElement('div');
    toolsRow.className = 'tools-row';
    const chip = document.createElement('span');
    chip.className = 'tool-chip';
    chip.textContent = work.tool;
    toolsRow.appendChild(chip);
    body.appendChild(toolsRow);
  }

  // Prompt / Notes (expandable)
  const textContent = (work.type === 'image' || work.type === 'gallery') ? work.prompt : work.memo;
  const expandLabel = (work.type === 'image' || work.type === 'gallery')
    ? 'READ FULL PROMPT →'
    : 'READ FULL NOTES →';

  if (textContent) {
    const preview = document.createElement('div');
    preview.className = 'card-text-preview';
    preview.textContent = textContent;

    body.appendChild(preview);

    if (textContent.length > 60) {
      const expandBtn = document.createElement('button');
      expandBtn.className = 'expand-btn';
      expandBtn.textContent = expandLabel;

      const fullText = document.createElement('div');
      fullText.className = 'card-text-full';
      fullText.textContent = textContent;

      expandBtn.addEventListener('click', () => {
        const isOpen = fullText.classList.toggle('open');
        preview.style.display = isOpen ? 'none' : '';
        expandBtn.textContent = isOpen ? 'CLOSE ←' : expandLabel;
      });

      body.appendChild(expandBtn);
      body.appendChild(fullText);
    }
  }

  // Tags
  if (work.tags && work.tags.length) {
    const tagRow = document.createElement('div');
    tagRow.className = 'tag-row';
    work.tags.forEach(tag => {
      const t = document.createElement('span');
      t.className = 'card-tag';
      t.textContent = '#' + tag;
      tagRow.appendChild(t);
    });
    body.appendChild(tagRow);
  }

  card.appendChild(topbar);
  card.appendChild(thumb);
  card.appendChild(body);
  return card;
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
