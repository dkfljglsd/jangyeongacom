// ===== 실제 프로젝트 목록 =====
const _builtinProjects = [
  {
    emoji: '🖥️',
    title: 'CAD AI Studio',
    desc: 'Browser-based AI CAD platform. Describe anything and AI generates a 3D model instantly.',
    tags: ['React', 'Three.js', 'WebGL', 'AI', 'CAD'],
    link: 'projects/test_cad2/index.html'
  }
];

// localStorage와 병합: 플레이스홀더 제거 + 새 프로젝트 자동 추가
const _stored = JSON.parse(localStorage.getItem('jya_projects') || 'null');
let projects;
if (!_stored || _stored.every(p => p.title === '프로젝트 제목을 입력하세요')) {
  projects = _builtinProjects.slice();
} else {
  const _existingLinks = new Set(_stored.map(p => p.link));
  const _toAdd = _builtinProjects.filter(p => !_existingLinks.has(p.link));
  projects = [..._stored.filter(p => p.title !== '프로젝트 제목을 입력하세요'), ..._toAdd];
  if (projects.length === 0) projects = _builtinProjects.slice();
}
localStorage.setItem('jya_projects', JSON.stringify(projects));

// ===== 슬라이더 렌더링 =====
const slider  = document.getElementById('projSlider');
const dotsEl  = document.getElementById('projDots');
const projLink = document.getElementById('projLink');
let current = 0;

function renderSlider() {
  slider.innerHTML = '';
  dotsEl.innerHTML = '';

  projects.forEach((p, i) => {
    // Slide
    const slide = document.createElement('div');
    slide.className = 'proj-slide' + (i === current ? ' active' : '');
    slide.innerHTML = `
      <div class="proj-emoji">${p.emoji}</div>
      <h4>${p.title}</h4>
      <p>${p.desc}</p>
      <div class="proj-slide-tags">${p.tags.map(t => `<span>${t}</span>`).join('')}</div>
    `;
    slider.appendChild(slide);

    // Dot
    const dot = document.createElement('span');
    dot.className = 'proj-dot' + (i === current ? ' active' : '');
    dot.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(dot);
  });

  projLink.href = projects[current].link;
}

function goTo(idx) {
  current = (idx + projects.length) % projects.length;
  renderSlider();
}

document.getElementById('projPrev').addEventListener('click', () => goTo(current - 1));
document.getElementById('projNext').addEventListener('click', () => goTo(current + 1));

renderSlider();

// ===== Search =====
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  searchClear.classList.toggle('visible', q.length > 0);

  // Filter projects in slider
  const matched = projects.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.desc.toLowerCase().includes(q) ||
    p.tags.some(t => t.toLowerCase().includes(q))
  );

  // Re-render slider with filtered results
  renderFiltered(matched, q);
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.classList.remove('visible');
  current = 0;
  renderSlider();
  searchInput.focus();
});

function renderFiltered(list, q) {
  slider.innerHTML = '';
  dotsEl.innerHTML = '';

  if (list.length === 0) {
    slider.innerHTML = `<div class="proj-slide active" style="color:var(--text-3);font-size:14px;padding:12px 0;">No results found for "<strong>${q}</strong>"</div>`;
    return;
  }

  list.forEach((p, i) => {
    const slide = document.createElement('div');
    slide.className = 'proj-slide' + (i === 0 ? ' active' : '');
    slide.innerHTML = `
      <div class="proj-emoji">${p.emoji}</div>
      <h4>${highlight(p.title, q)}</h4>
      <p>${highlight(p.desc, q)}</p>
      <div class="proj-slide-tags">${p.tags.map(t => `<span>${highlight(t, q)}</span>`).join('')}</div>
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

// ===== Active nav on scroll =====
const navLinks = document.querySelectorAll('.nav-links a');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(a => a.classList.remove('active'));
      const active = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
      if (active) active.classList.add('active');
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

document.querySelectorAll('section[id]').forEach(s => sectionObserver.observe(s));
