let projects = [];
let current = 0;

// ===== 프로젝트 로드 (manifest.json) =====
async function initProjects() {
  const local = localStorage.getItem('jya_projects');
  if (local) {
    projects = JSON.parse(local);
  } else {
    try {
      const res = await fetch('projects/manifest.json?t=' + Date.now());
      if (res.ok) projects = await res.json();
    } catch(e) {}
  }

  if (document.getElementById('projSlider')) { renderSlider(); initSearch(); }
  if (document.getElementById('projGrid'))   renderGrid();
}

// ===== 슬라이더 (index.html) =====
function renderSlider() {
  const slider  = document.getElementById('projSlider');
  const dotsEl  = document.getElementById('projDots');
  const projLink = document.getElementById('projLink');
  if (!slider) return;

  slider.innerHTML = '';
  dotsEl.innerHTML = '';

  if (!projects.length) {
    slider.innerHTML = '<div class="proj-slide active" style="color:#999;font-size:14px;padding:12px 0;">등록된 프로젝트가 없습니다.</div>';
    return;
  }

  projects.forEach((p, i) => {
    const slide = document.createElement('div');
    slide.className = 'proj-slide' + (i === current ? ' active' : '');
    slide.innerHTML = `
      <div class="proj-emoji">${p.emoji || '📁'}</div>
      <h4>${p.title}</h4>
      <p>${p.desc || ''}</p>
      <div class="proj-slide-tags">${(p.tags || []).map(t => `<span>${t}</span>`).join('')}</div>
    `;
    slider.appendChild(slide);

    const dot = document.createElement('span');
    dot.className = 'proj-dot' + (i === current ? ' active' : '');
    dot.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(dot);
  });

  if (projLink) projLink.href = projects[current]?.link || '#';
}

function goTo(idx) {
  current = (idx + projects.length) % projects.length;
  renderSlider();
}

document.getElementById('projPrev')?.addEventListener('click', () => goTo(current - 1));
document.getElementById('projNext')?.addEventListener('click', () => goTo(current + 1));

// ===== 그리드 (projects.html) =====
function renderGrid() {
  const grid = document.getElementById('projGrid');
  if (!grid) return;

  if (!projects.length) {
    grid.innerHTML = '<p style="color:#999;padding:40px;grid-column:1/-1;">projects/ 폴더에 프로젝트를 넣고 서버를 재시작하세요.</p>';
    return;
  }

  grid.innerHTML = projects.map(p => `
    <div class="proj-card">
      <div class="proj-thumb">${p.emoji || '📁'}</div>
      <div class="proj-body">
        <h3>${p.title}</h3>
        <p>${p.desc || ''}</p>
        <div class="proj-tags">${(p.tags || []).map(t => `<span>${t}</span>`).join('')}</div>
        <a href="${p.link}" class="proj-link">View Project →</a>
      </div>
    </div>
  `).join('');
}

// ===== 검색 (index.html) =====
function initSearch() {
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    searchClear.classList.toggle('visible', q.length > 0);
    if (!q) { current = 0; renderSlider(); return; }
    const matched = projects.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.desc || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q))
    );
    renderFiltered(matched, q);
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.remove('visible');
    current = 0;
    renderSlider();
    searchInput.focus();
  });
}

function renderFiltered(list, q) {
  const slider = document.getElementById('projSlider');
  const dotsEl = document.getElementById('projDots');
  if (!slider) return;

  slider.innerHTML = '';
  dotsEl.innerHTML = '';

  if (!list.length) {
    slider.innerHTML = `<div class="proj-slide active" style="color:var(--text-3);font-size:14px;padding:12px 0;">검색 결과 없음: "<strong>${q}</strong>"</div>`;
    return;
  }

  list.forEach((p, i) => {
    const slide = document.createElement('div');
    slide.className = 'proj-slide' + (i === 0 ? ' active' : '');
    slide.innerHTML = `
      <div class="proj-emoji">${p.emoji || '📁'}</div>
      <h4>${highlight(p.title, q)}</h4>
      <p>${highlight(p.desc || '', q)}</p>
      <div class="proj-slide-tags">${(p.tags || []).map(t => `<span>${highlight(t, q)}</span>`).join('')}</div>
    `;
    slider.appendChild(slide);

    const dot = document.createElement('span');
    dot.className = 'proj-dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => {
      slider.querySelectorAll('.proj-slide').forEach((s, j) => s.classList.toggle('active', j === i));
      dotsEl.querySelectorAll('.proj-dot').forEach((d, j) => d.classList.toggle('active', j === i));
    });
    dotsEl.appendChild(dot);
  });
}

function highlight(text, q) {
  if (!q) return text;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(re, '<mark style="background:rgba(212,160,23,0.25);border-radius:3px;padding:0 2px;">$1</mark>');
}

// ===== Nav active =====
document.querySelectorAll('section[id]').forEach(s => {
  new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
        const active = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' }).observe(s);
});

initProjects();
