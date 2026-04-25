let allWorks = [];
let allTags = [];
let activeTag = null;
let activeType = null;

async function loadData() {
  const [worksRes, tagsRes] = await Promise.all([
    fetch('data/works.json'),
    fetch('data/tags.json')
  ]);
  allWorks = await worksRes.json();
  allTags = await tagsRes.json();

  renderTagButtons();
  renderGallery();
}

function renderTagButtons() {
  const container = document.getElementById('tag-filters');
  container.innerHTML = '';

  allTags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-btn';
    btn.textContent = tag;
    btn.addEventListener('click', () => {
      activeTag = activeTag === tag ? null : tag;
      document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
      if (activeTag) btn.classList.add('active');
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

  if (filtered.length === 0) {
    gallery.innerHTML = '<p class="no-results">該当する作品がありません</p>';
    return;
  }

  filtered.forEach(work => {
    gallery.appendChild(createCard(work));
  });
}

function createCard(work) {
  const card = document.createElement('div');
  card.className = 'card';

  const imageArea = document.createElement('div');
  imageArea.className = 'card-image';

  const src = work.type === 'image' ? work.image : work.thumbnail;
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = work.title;
    img.onerror = () => { imageArea.textContent = '画像なし'; };
    imageArea.appendChild(img);
  } else {
    imageArea.textContent = work.type === 'html' ? 'HTMLサイト' : '画像なし';
  }

  const body = document.createElement('div');
  body.className = 'card-body';

  const meta = document.createElement('div');
  meta.className = 'card-meta';
  meta.innerHTML = `<span class="card-tool">${work.tool}</span><span class="card-date">${work.date}</span>`;

  const title = document.createElement('div');
  title.className = 'card-title';
  if (work.type === 'html' && work.url) {
    title.innerHTML = `<a href="${work.url}" target="_blank" rel="noopener">${work.title}</a>`;
  } else {
    title.textContent = work.title;
  }

  const textContent = work.type === 'image' ? work.prompt : work.memo;
  const text = document.createElement('p');
  text.className = 'card-text';
  text.textContent = textContent || '';

  const tags = document.createElement('div');
  tags.className = 'card-tags';
  (work.tags || []).forEach(tag => {
    const span = document.createElement('span');
    span.className = 'card-tag';
    span.textContent = tag;
    tags.appendChild(span);
  });

  const expandArea = document.createElement('div');
  expandArea.className = 'card-expand';
  const expandBtn = document.createElement('button');
  expandBtn.className = 'expand-btn';
  expandBtn.textContent = work.type === 'image' ? 'プロンプト全文を見る' : 'メモ全文を見る';
  const expandContent = document.createElement('div');
  expandContent.className = 'expand-content';
  expandContent.textContent = textContent || '';
  expandBtn.addEventListener('click', () => {
    expandContent.classList.toggle('open');
    expandBtn.textContent = expandContent.classList.contains('open')
      ? '閉じる'
      : (work.type === 'image' ? 'プロンプト全文を見る' : 'メモ全文を見る');
  });

  if (textContent && textContent.length > 80) {
    expandArea.appendChild(expandBtn);
    expandArea.appendChild(expandContent);
  }

  body.appendChild(meta);
  body.appendChild(title);
  body.appendChild(text);
  body.appendChild(tags);
  if (textContent && textContent.length > 80) body.appendChild(expandArea);

  card.appendChild(imageArea);
  card.appendChild(body);
  return card;
}

document.querySelectorAll('.type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.type;
    activeType = activeType === type ? null : type;
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    if (activeType) btn.classList.add('active');
    renderGallery();
  });
});

loadData();
