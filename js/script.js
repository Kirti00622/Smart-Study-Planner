/* ===================== FALLBACK DATA ===================== */
const Fallback = {
  quotes: [
    'The secret of getting ahead is getting started. — Mark Twain',
    'Success is not final, failure is not fatal: it is the courage to continue that counts. — Churchill',
    'The mind is not a vessel to be filled, but a fire to be kindled. — Plutarch',
    'Education is the most powerful weapon which you can use to change the world. — Mandela',
    'The beautiful thing about learning is that nobody can take it away from you. — B.B. King',
    'It does not matter how slowly you go as long as you do not stop. — Confucius',
    'The only way to do great work is to love what you do. — Steve Jobs',
    'Strive for progress, not perfection. — Unknown',
    'Believe you can and you\'re halfway there. — Theodore Roosevelt',
    'Your attitude, not your aptitude, will determine your altitude. — Zig Ziglar'
  ]
};

/* ===================== STATE ===================== */
let State = {
  darkMode: localStorage.getItem('ssp-dark') === 'true',
  sidebarOpen: false,
  currentPage: 'home',
  timerRunning: false,
  timerSeconds: 1500,
  timerInterval: null,
  taskCompletion: [],
  taskItems: [],
  user: null,
  subjects: [],
  exams: [],
  dashboardData: null,
  analyticsData: null,
  revisionSuggestions: [],
  studyPlans: [],
  subjectTopics: [],
  examTopics: []
};

/* ===================== DOM REFS ===================== */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

/* ===================== LOADING ===================== */
function showLoading(el) {
  if (!el) return;
  el.style.opacity = '0.4';
  el.style.pointerEvents = 'none';
}
function hideLoading(el) {
  if (!el) return;
  el.style.opacity = '1';
  el.style.pointerEvents = 'auto';
}

/* ===================== ROUTING ===================== */
function navigateTo(page) {
  const hash = page === 'home' ? '' : page;
  window.location.hash = hash;
  showPage(page);
}

function showPage(page) {
  $$('.page').forEach(p => p.classList.remove('active'));
  const target = $(`page-${page}`);
  if (target) target.classList.add('active');

  $$('.nav-item').forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');

  State.currentPage = page;

  const isAuth = ['login','signup','forgot-password'].includes(page);
  const isHome = page === 'home';
  const showTopbar = !isAuth && !isHome;

  $('topbar').style.display = showTopbar ? 'flex' : 'none';
  $('quoteBar').style.display = showTopbar ? 'flex' : 'none';
  $('sidebar').classList.remove('open');
  $('sidebarOverlay').classList.remove('open');
  State.sidebarOpen = false;

  if (page === 'dashboard') initDashboard();
  if (page === 'subjects') renderSubjects();
  if (page === 'exams') { renderExams(); renderCalendar(); }
  if (page === 'progress') initProgress();
  if (page === 'revision') initRevision();
  if (page === 'analytics') initAnalytics();
  if (page === 'profile') initProfile();
  if (page === 'planner') initPlanner();
}

function handleRoute() {
  const hash = window.location.hash.slice(1) || 'home';

  const publicPages = ['home', 'login', 'signup', 'forgot-password'];
  if (!publicPages.includes(hash) && !Api.isAuthenticated()) {
    showPage('login');
    return;
  }

  showPage(hash);
}

window.addEventListener('hashchange', handleRoute);

/* ===================== SIDEBAR ===================== */
$('sidebarToggle').addEventListener('click', () => {
  $('sidebar').classList.toggle('open');
  $('sidebarOverlay').classList.toggle('open');
});
$('sidebarClose').addEventListener('click', () => {
  $('sidebar').classList.remove('open');
  $('sidebarOverlay').classList.remove('open');
});
$('sidebarOverlay').addEventListener('click', () => {
  $('sidebar').classList.remove('open');
  $('sidebarOverlay').classList.remove('open');
});

function updateTopbarUser() {
  const img = $('topbarAvatarImg');
  if (img && State.user) {
    img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(State.user.name || 'User')}&background=6366f1&color=fff&bold=true`;
  }
}

$('logoutBtn').addEventListener('click', (e) => {
  e.preventDefault();
  Api.clearToken();
  State.user = null;
  navigateTo('home');
});

/* ===================== THEME ===================== */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', State.darkMode ? 'dark' : 'light');
  $('themeToggle').innerHTML = `<i class="fas ${State.darkMode ? 'fa-sun' : 'fa-moon'}"></i>`;
  localStorage.setItem('ssp-dark', State.darkMode);
}

$('themeToggle').addEventListener('click', () => {
  State.darkMode = !State.darkMode;
  applyTheme();
});

const profileThemeToggle = $('profileThemeToggle');
if (profileThemeToggle) {
  profileThemeToggle.addEventListener('change', (e) => {
    State.darkMode = e.target.checked;
    applyTheme();
  });
}

applyTheme();

/* ===================== NOTIFICATIONS ===================== */
$('notificationBell').addEventListener('click', () => {
  $('notifPanel').classList.toggle('open');
});

function renderNotifPanel() {
  const list = $('notifPanelList');
  if (!list) return;
  const items = [];
  if (State.user) {
    if (State.exams.length) {
      State.exams.forEach(e => {
        const d = e.days_remaining !== undefined ? e.days_remaining : 0;
        items.push({ text: `${e.exam_name} in ${d} days`, time: 'Upcoming', icon: 'fa-calendar', color: '#6366f1' });
      });
    }
    if (!items.length) {
      items.push({ text: 'No upcoming notifications', time: '', icon: 'fa-bell', color: '#6366f1' });
    }
  } else {
    items.push({ text: 'Login to see personalized notifications', time: '', icon: 'fa-bell', color: '#6366f1' });
  }
  list.innerHTML = items.map(n => `
    <div class="notif-item">
      <div class="notif-icon" style="background:${n.color}20;color:${n.color}"><i class="fas ${n.icon}"></i></div>
      <div class="notif-text">${n.text}<span class="notif-time">${n.time}</span></div>
    </div>
  `).join('');
}

/* ===================== SEARCH ===================== */
$('globalSearch').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  if (q.length < 2) return;
  if (State.currentPage === 'subjects') {
    const grid = $('subjectsGrid');
    const cards = grid.querySelectorAll('.subject-card');
    cards.forEach(card => {
      const name = card.querySelector('h3')?.textContent.toLowerCase() || '';
      card.style.display = name.includes(q) ? 'block' : 'none';
    });
  }
});

/* ===================== QUOTES ===================== */
function showRandomQuote() {
  const q = Fallback.quotes[Math.floor(Math.random() * Fallback.quotes.length)];
  $('quoteText').textContent = q;
}
showRandomQuote();

$('quoteRefresh')?.addEventListener('click', showRandomQuote);

/* ===================== POMODORO ===================== */
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function updatePomodoroDisplay() {
  $('pomodoroTimer').textContent = formatTime(State.timerSeconds);
}

$('pomodoroToggle').addEventListener('click', () => {
  if (State.timerRunning) {
    clearInterval(State.timerInterval);
    State.timerRunning = false;
    $('pomodoroToggle').innerHTML = '<i class="fas fa-play"></i>';
  } else {
    State.timerInterval = setInterval(() => {
      if (State.timerSeconds <= 0) {
        clearInterval(State.timerInterval);
        State.timerRunning = false;
        $('pomodoroToggle').innerHTML = '<i class="fas fa-play"></i>';
        State.timerSeconds = 1500;
        updatePomodoroDisplay();
        return;
      }
      State.timerSeconds--;
      updatePomodoroDisplay();
    }, 1000);
    State.timerRunning = true;
    $('pomodoroToggle').innerHTML = '<i class="fas fa-pause"></i>';
  }
});

/* ===================== MODALS ===================== */
function openModal(id) { $(id).classList.add('open'); }
function closeModal(id) { $(id).classList.remove('open'); }

$$('.modal-overlay').forEach(o => o.addEventListener('click', function() {
  this.parentElement.classList.remove('open');
}));

/* ===================== AUTH ===================== */
$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Signing in...';
  try {
    const user = await Api.login(
      e.target.querySelector('input[type="email"]').value,
      e.target.querySelector('input[type="password"]').value
    );
    State.user = user;
    updateTopbarUser();
    renderNotifPanel();
    navigateTo('dashboard');
  } catch (err) {
    alert(err.message);
  }
  btn.disabled = false; btn.innerHTML = 'Sign In';
});

$('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Creating account...';
  const inputs = e.target.querySelectorAll('input');
  const password = inputs[2].value;
  const confirm = inputs[3].value;
  if (password !== confirm) { alert('Passwords do not match.'); btn.disabled = false; btn.innerHTML = 'Create Account'; return; }
  try {
    const user = await Api.register(inputs[0].value, inputs[1].value, password);
    State.user = user;
    updateTopbarUser();
    renderNotifPanel();
    navigateTo('dashboard');
  } catch (err) {
    alert(err.message);
  }
  btn.disabled = false; btn.innerHTML = 'Create Account';
});

$('forgotForm').addEventListener('submit', (e) => {
  e.preventDefault();
  alert('Password reset link sent to your email!');
  navigateTo('login');
});

/* ===================== DASHBOARD ===================== */
async function initDashboard() {
  const now = new Date();
  const opts = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  $('dashDate').textContent = now.toLocaleDateString('en-US', opts);

  if (State.user) {
    $('dashUserName').textContent = State.user.name || 'Student';
    updateTopbarUser();
  }

  try {
    const dash = await Api.getDashboard();
    State.dashboardData = dash;

    $('statSubjects').textContent = dash.total_subjects ?? 0;
    $('statExams').textContent = dash.upcoming_exams ?? 0;
    const rate = dash.completion_rate ?? 0;
    $('statProgress').innerHTML = Math.round(rate) + '<small>%</small>';
    $('statStreak').textContent = dash.study_streak ?? 0;
  } catch {
    $('statSubjects').textContent = 0;
    $('statExams').textContent = 0;
    $('statProgress').innerHTML = '0<small>%</small>';
    $('statStreak').textContent = 0;
  }

  renderSchedule();
  renderRevisionList();
  renderNotifList();
  initWeeklyChart();
}

function renderSchedule() {
  const list = $('todaySchedule');
  const plans = State.studyPlans || [];
  if (!plans.length) {
    list.innerHTML = '<li class="text-muted" style="padding:20px;text-align:center;">No study plans for today.</li>';
    return;
  }
  list.innerHTML = plans.slice(0, 8).map(p => `
    <li>
      <span class="schedule-time">${p.study_date || ''}</span>
      <span class="schedule-subject">${p.task_description || 'Study session'}</span>
      <span class="schedule-duration">${p.study_hours ? p.study_hours + 'h' : ''}</span>
    </li>
  `).join('');
}

function renderRevisionList() {
  const list = $('revisionList');
  const items = State.revisionSuggestions || [];
  if (!items.length) {
    list.innerHTML = '<li class="text-muted" style="padding:20px;text-align:center;">No revision suggestions yet.</li>';
    return;
  }
  list.innerHTML = items.slice(0, 5).map(r => `
    <li><i class="fas fa-book" style="color:#6366f1;font-size:12px;"></i> ${r.subject_name || r.subject || ''} <span class="text-muted" style="margin-left:auto;font-size:12px;">${r.priority || ''}</span></li>
  `).join('');
}

function renderNotifList() {
  const list = $('notifList');
  const items = [];
  if (State.exams.length) {
    State.exams.slice(0, 3).forEach(e => {
      const d = e.days_remaining !== undefined ? e.days_remaining : 30;
      items.push(`<li><span class="notif-dot unread"></span> ${e.exam_name} in ${d} days</li>`);
    });
  } else {
    items.push('<li><span class="notif-dot read"></span> No upcoming exams</li>');
  }
  list.innerHTML = items.join('');
}

function initWeeklyChart() {
  const ctx = $('weeklyChart');
  if (!ctx || typeof Chart === 'undefined') return;
  if (window._weeklyChart) window._weeklyChart.destroy();

  let labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  let data = [0, 0, 0, 0, 0, 0, 0];

  if (State.analyticsData?.weekly_study_hours) {
    const wh = State.analyticsData.weekly_study_hours;
    labels = wh.map(w => w.day || w.week || '');
    data = wh.map(w => w.hours || 0);
  }

  window._weeklyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Study Hours',
        data,
        backgroundColor: ['rgba(99,102,241,0.7)','rgba(99,102,241,0.7)','rgba(99,102,241,0.7)','rgba(99,102,241,0.7)','rgba(99,102,241,0.7)','rgba(139,92,246,0.7)','rgba(139,92,246,0.7)'],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(128,128,128,0.1)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

/* ===================== SUBJECTS ===================== */
async function renderSubjects() {
  const grid = $('subjectsGrid');
  showLoading(grid);
  try {
    State.subjects = await Api.getSubjects();
  } catch {
    State.subjects = [];
  }
  hideLoading(grid);

  const colors = ['#6366f1','#8b5cf6','#10b981','#f59e0b','#ec4899','#06b6d4','#f97316','#14b8a6'];
  grid.innerHTML = State.subjects.map((s, i) => `
    <div class="subject-card glass" style="border-top: 4px solid ${colors[i % colors.length]}">
      <div class="subject-top">
        <div class="subject-icon" style="background:${colors[i % colors.length]}"><i class="fas fa-${getSubjectIcon(s.subject_name)}"></i></div>
        <div>
          <h3>${s.subject_name}</h3>
          ${s.topics && s.topics.length ? `<div style="margin:4px 0;"><span style="font-size:12px;color:var(--text-muted);">${s.topics.length} topics</span></div>` : ''}
          <span class="subject-level level-${(s.difficulty_level || 'Average').toLowerCase()}">${s.difficulty_level || 'Average'}</span>
        </div>
      </div>
      <div class="subject-progress">
        <div class="progress-bar"><div class="progress-fill" style="width:${s.study_progress || 0}%;background:${colors[i % colors.length]}"></div></div>
        <div class="progress-label"><span>Progress</span><span>${s.study_progress || 0}%</span></div>
      </div>
      <div class="subject-actions">
        <button class="btn-edit" onclick="openTopicManager(${s.id})"><i class="fas fa-list"></i> Topics</button>
        <button class="btn-edit" onclick="editSubject(${s.id})"><i class="fas fa-edit"></i> Edit</button>
        <button class="btn-delete" onclick="deleteSubject(${s.id})"><i class="fas fa-trash"></i> Delete</button>
      </div>
    </div>
  `).join('');
}

function getSubjectIcon(name) {
  const map = {
    'Mathematics': 'square-root-variable', 'Physics': 'atom', 'Chemistry': 'flask',
    'Computer Science': 'laptop-code', 'English': 'book', 'Biology': 'dna',
    'History': 'landmark', 'Economics': 'chart-line'
  };
  return map[name] || 'book';
}

function openSubjectModal(data) {
  $('subjectModalTitle').textContent = data ? 'Edit Subject' : 'Add Subject';
  $('subjectEditId').value = data ? data.id : '';
  $('subjectName').value = data ? data.subject_name : '';
  $('subjectLevel').value = data ? data.difficulty_level : 'Average';
  State.subjectTopics = data ? (data.topics && Array.isArray(data.topics) ? [...data.topics] : []) : [];
  renderSubjectTagTopics();
  openModal('subjectModal');
}

function addSubjectTopic() {
  const inp = $('subjectTopicInput');
  const val = inp.value.trim();
  if (!val) return;
  if (State.subjectTopics.includes(val)) { alert('Topic already added.'); return; }
  State.subjectTopics.push(val);
  inp.value = '';
  inp.focus();
  renderSubjectTagTopics();
}
$('subjectTopicInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addSubjectTopic(); } });

function removeSubjectTopic(idx) {
  State.subjectTopics.splice(idx, 1);
  renderSubjectTagTopics();
}

function renderSubjectTagTopics() {
  $('subjectTopicsContainer').innerHTML = State.subjectTopics.map((t, i) =>
    `<span class="topic-tag">${t} <i class="fas fa-times" onclick="removeSubjectTopic(${i})" style="cursor:pointer;margin-left:4px;font-size:12px;"></i></span>`
  ).join('');
}

function editSubject(id) {
  const s = State.subjects.find(x => x.id === id);
  if (s) openSubjectModal(s);
}

async function deleteSubject(id) {
  if (!confirm('Delete this subject?')) return;
  try {
    await Api.deleteSubject(id);
    await renderSubjects();
  } catch (err) {
    alert(err.message);
  }
}

$('subjectForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (State.subjectTopics.length === 0) { alert('Please add at least one topic.'); return; }
  const editId = $('subjectEditId').value;
  const data = {
    subject_name: $('subjectName').value,
    topics: State.subjectTopics,
    difficulty_level: $('subjectLevel').value
  };
  try {
    if (editId) {
      await Api.updateSubject(editId, data);
    } else {
      await Api.createSubject(data);
    }
    closeModal('subjectModal');
    await renderSubjects();
    e.target.reset();
    State.subjectTopics = [];
    renderSubjectTagTopics();
  } catch (err) {
    alert(err.message);
  }
});

/* ===================== TOPIC MANAGER ===================== */
let currentTopicSubjectId = null;
let topicEditIndex = -1;

function openTopicManager(subjectId) {
  currentTopicSubjectId = subjectId;
  topicEditIndex = -1;
  const s = State.subjects.find(x => x.id === subjectId);
  $('topicModalTitle').textContent = s ? `Topics - ${s.subject_name}` : 'Manage Topics';
  $('topicInput').value = '';
  $('topicInput').placeholder = 'Add a new topic...';
  renderTopicList();
  openModal('topicModal');
  setTimeout(() => $('topicInput').focus(), 300);
}

function renderTopicList() {
  const s = State.subjects.find(x => x.id === currentTopicSubjectId);
  const container = $('topicListContainer');
  const empty = $('topicListEmpty');
  const count = $('topicCount');
  if (!s || !s.topics || !s.topics.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-muted);">No topics yet. Add one above.</div>';
    count.textContent = '0 topics';
    return;
  }
  count.textContent = `${s.topics.length} topics`;
  container.innerHTML = s.topics.map((t, i) => `
    <div class="topic-list-item">
      <span class="topic-list-num">${i + 1}.</span>
      <span class="topic-list-text">${escapeHtml(t)}</span>
      <div class="topic-list-actions">
        <button onclick="moveTopicUp(${i})" title="Move up" ${i === 0 ? 'disabled style="opacity:0.3"' : ''}><i class="fas fa-chevron-up"></i></button>
        <button onclick="moveTopicDown(${i})" title="Move down" ${i === s.topics.length - 1 ? 'disabled style="opacity:0.3"' : ''}><i class="fas fa-chevron-down"></i></button>
        <button onclick="editTopicByIndex(${i})" title="Edit"><i class="fas fa-pen"></i></button>
        <button class="btn-del" onclick="deleteTopicByIndex(${i})" title="Delete"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `).join('');
}

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

async function refreshSubjectTopics() {
  try {
    const res = await Api.getSubjects();
    const s = res.find(x => x.id === currentTopicSubjectId);
    if (s) {
      const idx = State.subjects.findIndex(x => x.id === currentTopicSubjectId);
      if (idx !== -1) State.subjects[idx] = s;
      renderTopicList();
    }
  } catch {
    // use local state
  }
}

async function addCurrentTopic() {
  const inp = $('topicInput');
  const val = inp.value.trim();
  if (!val) return;
  const s = State.subjects.find(x => x.id === currentTopicSubjectId);
  if (!s) return;
  if (s.topics && s.topics.includes(val)) { alert('Topic already exists.'); return; }

  if (topicEditIndex >= 0) {
    try {
      const res = await Api.put(`/subjects/${currentTopicSubjectId}/topics/${topicEditIndex}`, { topic: val });
      if (res.success) s.topics = res.data.topics;
    } catch { s.topics[topicEditIndex] = val; }
    topicEditIndex = -1;
    inp.value = '';
    inp.placeholder = 'Add a new topic...';
  } else {
    try {
      const res = await Api.post(`/subjects/${currentTopicSubjectId}/topics`, { topic: val });
      if (res.success) s.topics = res.data.topics;
    } catch {
      if (!s.topics) s.topics = [];
      s.topics.push(val);
    }
    inp.value = '';
  }
  renderTopicList();
  inp.focus();
}

function editTopicByIndex(idx) {
  topicEditIndex = idx;
  const s = State.subjects.find(x => x.id === currentTopicSubjectId);
  if (!s || !s.topics || !s.topics[idx]) return;
  $('topicInput').value = s.topics[idx];
  $('topicInput').placeholder = 'Edit topic...';
  $('topicInput').focus();
}

async function deleteTopicByIndex(idx) {
  if (!confirm('Delete this topic?')) return;
  const s = State.subjects.find(x => x.id === currentTopicSubjectId);
  if (!s || !s.topics) return;
  try {
    const res = await Api.del(`/subjects/${currentTopicSubjectId}/topics/${idx}`);
    if (res.success) s.topics = res.data.topics;
  } catch { s.topics.splice(idx, 1); }
  if (topicEditIndex === idx) {
    topicEditIndex = -1;
    $('topicInput').value = '';
    $('topicInput').placeholder = 'Add a new topic...';
  }
  renderTopicList();
}

async function moveTopicUp(idx) {
  if (idx <= 0) return;
  await moveTopic(idx, idx - 1);
}

async function moveTopicDown(idx) {
  const s = State.subjects.find(x => x.id === currentTopicSubjectId);
  if (!s || !s.topics || idx >= s.topics.length - 1) return;
  await moveTopic(idx, idx + 1);
}

async function moveTopic(fromIdx, toIdx) {
  const s = State.subjects.find(x => x.id === currentTopicSubjectId);
  if (!s || !s.topics) return;
  try {
    const res = await Api.put(`/subjects/${currentTopicSubjectId}/topics/reorder`, { from_idx: fromIdx, to_idx: toIdx });
    if (res.success) s.topics = res.data.topics;
  } catch {
    const item = s.topics.splice(fromIdx, 1)[0];
    s.topics.splice(toIdx, 0, item);
  }
  renderTopicList();
}

async function seedSubjects() {
  const btn = $('seedBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
  try {
    const res = await Api.get('/seed');
    if (res.success) {
      alert(`Seeded ${res.data.subjects_created} subjects with predefined topics!`);
      await renderSubjects();
    } else {
      alert('Seed failed: ' + res.message);
    }
  } catch (err) {
    alert('Could not connect to server. ' + err.message);
  }
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-database"></i> Load Predefined Subjects';
}

// Enter key for topic input
$('topicInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); addCurrentTopic(); }
});

// Reopen topic list when modal opens (in case subjects updated elsewhere)
const _origOpenTopicModal = openModal;
openModal = function(id) {
  _origOpenTopicModal(id);
  if (id === 'topicModal') {
    renderTopicList();
  }
};

/* ===================== EXAMS ===================== */
async function renderExams() {
  const grid = $('examsGrid');
  showLoading(grid);
  try {
    State.exams = await Api.getExams();
  } catch {
    State.exams = [];
  }
  hideLoading(grid);

  grid.innerHTML = State.exams.map(e => {
    const daysLeft = e.days_remaining !== undefined ? e.days_remaining : 30;
    return `
      <div class="exam-card glass">
        <div class="exam-countdown">
          <span class="countdown-num">${daysLeft}d</span>
          <span class="countdown-label">remaining</span>
        </div>
        <h3>${e.exam_name}</h3>
        ${e.topics && e.topics.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;">${e.topics.map(t => `<span class="topic-tag">${t}</span>`).join('')}</div>` : ''}
        <span class="exam-priority priority-${(e.priority || 'medium').toLowerCase()}">${e.priority || 'Medium'}</span>
        <div class="exam-date"><i class="fas fa-calendar"></i> ${formatDate(e.exam_date)}</div>
        <div class="subject-actions" style="margin-top:12px;">
          <button class="btn-edit" onclick="editExam(${e.id})"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn-delete" onclick="deleteExam(${e.id})"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function openExamModal(data) {
  $('examModalTitle').textContent = data ? 'Edit Exam' : 'Add Exam';
  $('examEditId').value = data ? data.id : '';
  const subjSelect = $('examSubject');
  subjSelect.innerHTML = State.subjects.map(s =>
    `<option value="${s.id}" ${data && data.subject_id === s.id ? 'selected' : ''}>${s.subject_name}</option>`
  ).join('');
  $('examDate').value = data ? data.exam_date : '';
  $('examPriority').value = data ? data.priority : 'Medium';
  State.examTopics = data ? (data.topics && Array.isArray(data.topics) ? [...data.topics] : []) : [];
  renderExamTagTopics();
  openModal('examModal');
}

function addExamTopic() {
  const inp = $('examTopicInput');
  const val = inp.value.trim();
  if (!val) return;
  if (State.examTopics.includes(val)) { alert('Topic already added.'); return; }
  State.examTopics.push(val);
  inp.value = '';
  inp.focus();
  renderExamTagTopics();
}
$('examTopicInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addExamTopic(); } });

function removeExamTopic(idx) {
  State.examTopics.splice(idx, 1);
  renderExamTagTopics();
}

function renderExamTagTopics() {
  $('examTopicsContainer').innerHTML = State.examTopics.map((t, i) =>
    `<span class="topic-tag">${t} <i class="fas fa-times" onclick="removeExamTopic(${i})" style="cursor:pointer;margin-left:4px;font-size:12px;"></i></span>`
  ).join('');
}

function editExam(id) {
  const e = State.exams.find(x => x.id === id);
  if (e) openExamModal(e);
}

async function deleteExam(id) {
  if (!confirm('Delete this exam?')) return;
  try {
    await Api.deleteExam(id);
    await renderExams();
    renderCalendar();
  } catch (err) {
    alert(err.message);
  }
}

$('examForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const editId = $('examEditId').value;
  const selectedSubject = State.subjects.find(s => s.id == $('examSubject').value);
  const data = {
    subject_id: parseInt($('examSubject').value),
    exam_name: selectedSubject ? selectedSubject.subject_name : 'Exam',
    topics: State.examTopics,
    exam_date: $('examDate').value,
    priority: $('examPriority').value
  };
  try {
    if (editId) {
      await Api.updateExam(editId, data);
    } else {
      await Api.createExam(data);
    }
    closeModal('examModal');
    await renderExams();
    renderCalendar();
    e.target.reset();
    State.examTopics = [];
    renderExamTagTopics();
  } catch (err) {
    alert(err.message);
  }
});

function renderCalendar() {
  const cal = $('examCalendar');
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const examDates = State.exams.map(e => e.exam_date);
  const today = now.getDate();

  let html = '<div class="cal-header">Sun</div><div class="cal-header">Mon</div><div class="cal-header">Tue</div><div class="cal-header">Wed</div><div class="cal-header">Thu</div><div class="cal-header">Fri</div><div class="cal-header">Sat</div>';
  for (let i = 0; i < firstDay; i++) html += '<div></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = d === today;
    const hasExam = examDates.includes(dateStr);
    html += `<div class="cal-day ${isToday ? 'today' : ''} ${hasExam ? 'has-exam' : ''}">${d}</div>`;
  }
  cal.innerHTML = html;
}

/* ===================== AI PLANNER ===================== */
function initPlanner() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  if ($('plannerExamDate') && !$('plannerExamDate').value) {
    $('plannerExamDate').value = `${y}-${m}-${d}`;
  }
}

$('plannerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const hoursPerDay = parseFloat($('plannerHours').value) || 4;
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

  try {
    const result = await Api.generatePlan(hoursPerDay);
    renderTimetable(result.timetable, hoursPerDay);
  } catch {
    renderFallbackTimetable(hoursPerDay);
  }
  btn.disabled = false; btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate Timetable';
});

function fmtHours(h) {
  const n = parseFloat(h) || 0;
  const hrs = Math.floor(n);
  const mins = Math.round((n - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

function fmtHoursShort(h) {
  const n = parseFloat(h) || 0;
  return n % 1 === 0 ? `${n}h` : `${n.toFixed(2)}h`.replace(/\.?0+$/, 'h');
}

function renderTimetable(timetable, hoursPerDay) {
  const output = $('plannerOutput');
  if (!timetable || !timetable.length) {
    output.innerHTML = `<div class="timetable-result glass"><p style="text-align:center;padding:40px;color:var(--text-muted)">No timetable generated. Add subjects and exams first.</p></div>`;
    return;
  }

  const colors = ['#6366f1','#8b5cf6','#10b981','#f59e0b','#ec4899'];
  output.innerHTML = `
    <div class="timetable-result glass">
      <div class="timetable-header">
        <h3><i class="fas fa-magic"></i> AI-Generated Timetable</h3>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <span class="badge"><i class="fas fa-clock"></i> ${fmtHours(hoursPerDay)}/day</span>
          <button class="btn btn-sm btn-outline" onclick="alert('Export PDF: Connect jsPDF library for full export.')"><i class="fas fa-file-pdf"></i> Export PDF</button>
        </div>
      </div>
      <div class="timetable-grid">
        ${timetable.map((t, i) => `
          <div class="timetable-card">
            <div class="tt-time"><i class="far fa-clock"></i> ${t.study_date || 'Today'}</div>
            <div class="tt-subject">${t.subject_name || `Subject #${t.subject_id}`}</div>
            <div class="tt-duration"><i class="far fa-hourglass"></i> ${fmtHours(t.study_hours)}</div>
            <span class="tt-tag study">Plan</span>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function renderFallbackTimetable(hoursPerDay) {
  const subjects = State.subjects.length ? State.subjects : [];
  const weak = subjects.filter(s => (s.difficulty_level || '').toLowerCase() === 'weak');
  const avg = subjects.filter(s => (s.difficulty_level || '').toLowerCase() === 'average');
  const strong = subjects.filter(s => (s.difficulty_level || '').toLowerCase() === 'strong');

  let slots = [];
  weak.forEach(s => slots.push({ ...s, hrs: hoursPerDay * 0.4 / Math.max(weak.length, 1) }));
  avg.forEach(s => slots.push({ ...s, hrs: hoursPerDay * 0.35 / Math.max(avg.length, 1) }));
  strong.forEach(s => slots.push({ ...s, hrs: hoursPerDay * 0.25 / Math.max(strong.length, 1) }));
  slots.sort((a, b) => b.hrs - a.hrs);

  const output = $('plannerOutput');
  output.innerHTML = `
    <div class="timetable-result glass">
      <div class="timetable-header">
        <h3><i class="fas fa-magic"></i> AI Study Plan (Offline Mode)</h3>
        <span class="badge"><i class="fas fa-clock"></i> ${fmtHours(hoursPerDay)}/day</span>
      </div>
      <div class="timetable-grid">
        ${slots.map(s => `
          <div class="timetable-card">
            <div class="tt-subject">${s.subject_name}</div>
            <div class="tt-duration">${fmtHours(s.hrs)}</div>
            <span class="tt-tag ${(s.difficulty_level||'').toLowerCase() === 'weak' ? 'study' : 'revision'}">${s.difficulty_level || 'Average'}</span>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:16px;padding:16px;background:var(--bg-card);border-radius:12px;font-size:14px;">
        <strong><i class="fas fa-info-circle" style="color:#6366f1"></i> Study Plan Summary:</strong>
        ${slots.length} study sessions, ${fmtHours(hoursPerDay)}/day. Weak subjects get more time.
      </div>
    </div>`;
}

/* ===================== PROGRESS TRACKER ===================== */
async function initProgress() {
  addSvgGradient();
  if (!State.dashboardData) {
    try { State.dashboardData = await Api.getDashboard(); } catch {}
  }
  const dd = State.dashboardData || {};
  State.completedTasks = State.taskCompletion.filter(Boolean).length;
  State.progressPercent = State.taskItems.length > 0 ? Math.round((State.completedTasks / State.taskItems.length) * 100) : 0;
  renderTasks();
  updateProgressCircle();
  $('streakCount').textContent = dd.study_streak ?? 0;
  $('studyHoursToday').textContent = dd.hours_today ?? 0;
  const prod = dd.productivity ?? 0;
  $('productivityScore').textContent = Math.round(prod);
  $('tasksCompleted').textContent = (State.completedTasks || dd.tasks_done || 0);
}

function renderTasks() {
  const list = $('taskList');
  list.innerHTML = State.taskItems.map((task, i) => `
    <div class="task-item">
      <div class="task-check ${State.taskCompletion[i] ? 'checked' : ''}" onclick="toggleTask(${i})">
        ${State.taskCompletion[i] ? '<i class="fas fa-check"></i>' : ''}
      </div>
      <span class="task-text ${State.taskCompletion[i] ? 'done' : ''}">${task}</span>
      <button class="task-delete" onclick="deleteTask(${i})"><i class="fas fa-times"></i></button>
    </div>
  `).join('');
}

function toggleTask(index) {
  State.taskCompletion[index] = !State.taskCompletion[index];
  State.completedTasks = State.taskCompletion.filter(Boolean).length;
  State.progressPercent = Math.round((State.completedTasks / State.taskItems.length) * 100);
  renderTasks();
  updateProgressCircle();
  $('tasksCompleted').textContent = State.completedTasks;
  $('progressPercent').textContent = State.progressPercent;
}

function addTask() {
  const input = $('newTaskInput');
  const text = input.value.trim();
  if (!text) return;
  State.taskItems.push(text);
  State.taskCompletion.push(false);
  input.value = '';
  renderTasks();
  updateProgressCircle();
}

function deleteTask(index) {
  State.taskItems.splice(index, 1);
  State.taskCompletion.splice(index, 1);
  State.completedTasks = State.taskCompletion.filter(Boolean).length;
  State.progressPercent = Math.round((State.completedTasks / State.taskItems.length) * 100);
  renderTasks();
  updateProgressCircle();
  $('tasksCompleted').textContent = State.completedTasks;
}

function updateProgressCircle() {
  const circle = $('progressCircle');
  if (!circle) return;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (State.progressPercent / 100) * circumference;
  circle.style.strokeDasharray = `${circumference}`;
  circle.style.strokeDashoffset = offset;
  $('progressPercent').textContent = State.progressPercent;
}

/* ===================== SVG GRADIENT ===================== */
function addSvgGradient() {
  const svg = document.querySelector('.circular-progress svg');
  if (svg && !svg.querySelector('defs')) {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = '<linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient>';
    svg.prepend(defs);
  }
}

/* ===================== REVISION ===================== */
async function initRevision() {
  const grid = $('revisionCards');
  showLoading(grid);
  try {
    State.revisionSuggestions = await Api.getRevisionSuggestions();
  } catch {
    State.revisionSuggestions = [];
  }
  hideLoading(grid);

  const groups = { High: [], Medium: [], Low: [] };
  State.revisionSuggestions.forEach(r => {
    const key = r.priority || 'Low';
    if (groups[key]) groups[key].push(r);
    else groups.Low.push(r);
  });

  grid.innerHTML = [
    { key: 'High', label: 'High Priority', color: '#ef4444' },
    { key: 'Medium', label: 'Medium Priority', color: '#f59e0b' },
    { key: 'Low', label: 'Low Priority', color: '#10b981' }
  ].filter(g => groups[g.key].length).map(g => `
    <div class="rev-card glass" style="border-left-color:${g.color}">
      <span class="rev-priority" style="color:${g.color}">${g.label}</span>
      ${groups[g.key].map(r => `
        <div style="margin-top:12px;padding:10px;background:var(--bg-card);border-radius:8px;">
          <h3>${r.subject_name}</h3>
          <p style="font-size:13px;color:var(--text-secondary);">${r.reason || r.priority}</p>
          ${r.suggestion ? `<div class="rev-suggestion">${r.suggestion}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `).join('');

  const tl = $('revisionTimeline');
  const revTimeline = [];
  if (!revTimeline.length) {
    tl.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);">Generate a study plan to see your revision timeline here.</div>';
  } else {
    tl.innerHTML = revTimeline.map(r => `
      <div class="rev-timeline-item">
        <span class="rev-day">${r.day}</span>
        <span class="rev-subjects">${r.subjects}</span>
      </div>
    `).join('');
  }
}

/* ===================== ANALYTICS ===================== */
async function initAnalytics() {
  try {
    State.analyticsData = await Api.getAnalytics();
  } catch {
    State.analyticsData = null;
  }
  const ad = State.analyticsData;
  const hasData = ad && ad.subject_wise_progress && ad.subject_wise_progress.length;

  if (!hasData) {
    $('analyticsTotalHours').textContent = '0';
    $('analyticsCompletionRate').innerHTML = '0<small>%</small>';
    $('analyticsWeakImprovement').innerHTML = '0<small>%</small>';
    $('analyticsExamReadiness').innerHTML = '0<small>%</small>';
    $('analyticsEmptyState').style.display = 'block';
    $('analyticsCharts').style.display = 'none';
    destroyAllAnalyticsCharts();
    return;
  }

  $('analyticsEmptyState').style.display = 'none';
  $('analyticsCharts').style.display = '';

  $('analyticsTotalHours').textContent = ad.total_study_hours ?? 0;
  $('analyticsCompletionRate').innerHTML = Math.round(ad.completion_rate ?? 0) + '<small>%</small>';
  $('analyticsWeakImprovement').innerHTML = Math.round(ad.weak_subject_improvement ?? 0) + '<small>%</small>';
  $('analyticsExamReadiness').innerHTML = Math.round(ad.average_readiness ?? 0) + '<small>%</small>';

  initSubjectChart();
  initWeeklyAnalyticsChart();
  initMonthlyChart();
  initReadinessChart();
}

function destroyAllAnalyticsCharts() {
  ['_subjectChart','_weeklyAnalytics','_monthlyChart','_readinessChart'].forEach(k => {
    if (window[k]) { window[k].destroy(); window[k] = null; }
  });
}

function initSubjectChart() {
  const ctx = $('subjectChart');
  if (!ctx || typeof Chart === 'undefined') return;
  if (window._subjectChart) window._subjectChart.destroy();
  const sp = State.analyticsData?.subject_wise_progress || [];
  if (!sp.length) {
    window._subjectChart = new Chart(ctx, {
      type: 'radar',
      data: { labels: ['No Data'], datasets: [{ label: 'Performance', data: [0], backgroundColor: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.3)', pointRadius: 0 }] },
      options: { responsive: true, scales: { r: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } } }
    });
    return;
  }
  window._subjectChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: sp.map(s => s.subject_name),
      datasets: [{
        label: 'Performance',
        data: sp.map(s => s.study_progress || 0),
        backgroundColor: 'rgba(99,102,241,0.2)',
        borderColor: '#6366f1',
        pointBackgroundColor: '#6366f1',
        pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      scales: { r: { beginAtZero: true, max: 100, ticks: { stepSize: 20 } } },
      plugins: { legend: { display: false } }
    }
  });
}

function initWeeklyAnalyticsChart() {
  const ctx = $('weeklyAnalyticsChart');
  if (!ctx || typeof Chart === 'undefined') return;
  if (window._weeklyAnalytics) window._weeklyAnalytics.destroy();
  const wh = State.analyticsData?.weekly_study_hours;
  let labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  let data = [0, 0, 0, 0, 0, 0, 0];
  if (wh && wh.length) {
    labels = wh.map(w => w.day || w.week || '');
    data = wh.map(w => w.hours || 0);
  }
  window._weeklyAnalytics = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Hours',
        data,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        fill: true, tension: 0.4,
        pointBackgroundColor: '#6366f1', pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(128,128,128,0.1)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function initMonthlyChart() {
  const ctx = $('monthlyChart');
  if (!ctx || typeof Chart === 'undefined') return;
  if (window._monthlyChart) window._monthlyChart.destroy();
  const mh = State.analyticsData?.monthly_study_hours;
  let labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let data = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  if (mh && mh.length) {
    labels = mh.map(w => {
      if (w.month) return w.month;
      if (w.week) return 'W' + w.week;
      return w.day || '';
    });
    data = mh.map(w => w.hours || 0);
  }
  window._monthlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Study Hours',
        data,
        backgroundColor: 'rgba(99,102,241,0.6)',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(128,128,128,0.1)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function initReadinessChart() {
  const ctx = $('readinessChart');
  if (!ctx || typeof Chart === 'undefined') return;
  if (window._readinessChart) window._readinessChart.destroy();
  const er = State.analyticsData?.exam_readiness || [];
  if (!er.length) {
    window._readinessChart = new Chart(ctx, {
      type: 'doughnut',
      data: { labels: ['No Exams'], datasets: [{ data: [100], backgroundColor: ['rgba(128,128,128,0.15)'], borderWidth: 0 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, cutout: '65%' }
    });
    return;
  }
  window._readinessChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: er.map(e => e.exam_name || e.subject_name),
      datasets: [{
        data: er.map(e => e.readiness_score || 0),
        backgroundColor: ['#6366f1','#8b5cf6','#10b981','#f59e0b','#ec4899','#06b6d4','#f97316','#14b8a6'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } }
      },
      cutout: '65%'
    }
  });
}

/* ===================== PROFILE ===================== */
async function initProfile() {
  const avatar = $('profileAvatar');
  const nameEl = $('profileName');
  const courseEl = $('profileCourse');
  const detailsEl = $('profileDetails');
  const badgesEl = $('profileBadges');
  const statsEl = $('profileStats');
  const gridEl = $('achievementsGrid');

  if (State.user) {
    const name = State.user.name || 'Student';
    nameEl.textContent = name;
    courseEl.textContent = State.user.course || '-';
    if (avatar) avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=120&bold=true`;
    detailsEl.innerHTML = `
      <div><i class="fas fa-graduation-cap"></i> <span>${State.user.course || '-'}</span></div>
      <div><i class="fas fa-calendar"></i> <span>${State.user.year || '-'}</span></div>
      <div><i class="fas fa-bullseye"></i> <span>${State.user.study_goal || 'No goal set'}</span></div>
    `;
  }

  let achData = null;
  try {
    achData = await Api.getAchievements();
  } catch {}

  const stats = achData?.stats || { streak: 0, total_hours: 0, tasks_completed: 0, achievements_count: 0 };
  badgesEl.innerHTML = `
    <span class="badge"><i class="fas fa-fire"></i> ${stats.streak}-Day Streak</span>
    <span class="badge"><i class="fas fa-trophy"></i> ${stats.achievements_count} Achievements</span>
    <span class="badge"><i class="fas fa-clock"></i> ${stats.total_hours} Hours</span>
  `;
  statsEl.innerHTML = `
    <div class="profile-stats-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:16px;">
      <div class="setting-item" style="flex-direction:column;align-items:center;gap:4px;padding:12px;">
        <span style="font-size:22px;font-weight:700;">${stats.streak}</span>
        <small class="text-muted">Day Streak</small>
      </div>
      <div class="setting-item" style="flex-direction:column;align-items:center;gap:4px;padding:12px;">
        <span style="font-size:22px;font-weight:700;">${stats.total_hours}</span>
        <small class="text-muted">Study Hours</small>
      </div>
      <div class="setting-item" style="flex-direction:column;align-items:center;gap:4px;padding:12px;">
        <span style="font-size:22px;font-weight:700;">${stats.tasks_completed}</span>
        <small class="text-muted">Tasks Done</small>
      </div>
      <div class="setting-item" style="flex-direction:column;align-items:center;gap:4px;padding:12px;">
        <span style="font-size:22px;font-weight:700;">${stats.achievements_count}</span>
        <small class="text-muted">Badges Earned</small>
      </div>
    </div>
  `;

  const badges = achData?.badges || [];
  gridEl.innerHTML = badges.map(b => {
    const cls = b.unlocked ? 'achievement' : 'achievement locked';
    const tooltip = b.unlocked ? ` unlocked ${b.unlocked_at ? new Date(b.unlocked_at).toLocaleDateString() : ''}` : ` (${b.progress}%)`;
    return `<div class="${cls}" title="${b.unlocked ? 'Unlocked' + tooltip : b.progress + '% complete' + tooltip}">
      <i class="fas ${b.icon}"></i><span>${b.name}</span>
    </div>`;
  }).join('');

  if (profileThemeToggle) {
    profileThemeToggle.checked = State.darkMode;
  }
}

function openEditProfile() {
  if (!State.user) return;
  $('editName').value = State.user.name || '';
  $('editCourse').value = State.user.course || '';
  $('editYear').value = State.user.year || '';
  $('editGoal').value = State.user.study_goal || '';
  openModal('profileEditModal');
}

async function saveProfile(e) {
  e.preventDefault();
  const name = $('editName').value.trim();
  const course = $('editCourse').value.trim();
  const year = $('editYear').value.trim();
  const study_goal = $('editGoal').value.trim();
  if (!name) return;
  try {
    const res = await Api.updateProfile({ name, course, year, study_goal });
    State.user = res.user;
    updateTopbarUser();
    initProfile();
    closeModal('profileEditModal');
    showToast('Profile updated successfully.', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to update profile.', 'error');
  }
}

/* ===================== CHAT ===================== */
// Wire up the chat if there's an input in the UI - add one via the quote bar or a simple prompt
window.sendChatMessage = async function() {
  const msg = prompt('Ask the AI assistant:');
  if (!msg) return;
  try {
    const res = await Api.chat(msg);
    alert('AI: ' + res.response);
  } catch (err) {
    alert('AI: ' + err.message);
  }
};

/* ===================== TOAST ===================== */
function showToast(msg, type) {
  const el = document.createElement('div');
  el.className = `toast toast-${type || 'info'}`;
  el.textContent = msg;
  Object.assign(el.style, {
    position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
    padding: '14px 24px', borderRadius: '12px', fontSize: '14px',
    fontWeight: 500, color: '#fff', maxWidth: '360px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
    background: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1',
    transform: 'translateY(20px)', opacity: '0',
    transition: 'all 0.3s ease'
  });
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.transform = 'translateY(0)'; el.style.opacity = '1';
  });
  setTimeout(() => {
    el.style.transform = 'translateY(20px)'; el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

/* ===================== INIT ===================== */
document.addEventListener('DOMContentLoaded', async () => {
  State.taskItems = [];
  State.taskCompletion = [];
  if (Api.isAuthenticated()) {
    try {
      State.user = await Api.getProfile();
      updateTopbarUser();
    } catch {}
  }
  updatePomodoroDisplay();
  renderNotifPanel();
  handleRoute();
});

/* ===================== GLOBAL EXPOSURE ===================== */
// Expose functions needed by inline HTML event handlers
window.navigateTo = navigateTo;
window.openSubjectModal = openSubjectModal;
window.editSubject = editSubject;
window.deleteSubject = deleteSubject;
window.openExamModal = openExamModal;
window.editExam = editExam;
window.deleteExam = deleteExam;
window.closeModal = closeModal;
window.addTask = addTask;
window.deleteTask = deleteTask;
window.toggleTask = toggleTask;
window.showRandomQuote = showRandomQuote;
window.openEditProfile = openEditProfile;
window.saveProfile = saveProfile;
