/* ===================== API SERVICE ===================== */
const API_BASE = 'http://localhost:5000/api';

const Api = {
  _token: null,

  getToken() {
    if (!this._token) {
      this._token = localStorage.getItem('ssp_token');
    }
    return this._token;
  },

  setToken(token) {
    this._token = token;
    if (token) {
      localStorage.setItem('ssp_token', token);
    } else {
      localStorage.removeItem('ssp_token');
    }
  },

  clearToken() {
    this.setToken(null);
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  async request(method, path, body = null) {
    const url = `${API_BASE}${path}`;
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const opts = { method, headers };
    if (body !== null) {
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(url, opts);
    const data = await res.json();

    if (!res.ok) {
      const msg = data.message || data.error || 'Request failed';
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      if (res.status === 401) {
        this.clearToken();
        navigateTo('login');
      }
      throw err;
    }
    return data;
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  del(path) { return this.request('DELETE', path); },

  // ---- Auth ----
  async register(name, email, password, course, year) {
    const res = await this.post('/register', { name, email, password, course, year });
    this.setToken(res.data.access_token);
    return res.data.user;
  },

  async login(email, password) {
    const res = await this.post('/login', { email, password });
    this.setToken(res.data.access_token);
    return res.data.user;
  },

  async getProfile() {
    const res = await this.get('/profile');
    return res.data.user;
  },

  async updateProfile(data) {
    const res = await this.put('/profile', data);
    return res.data.user;
  },

  // ---- Subjects ----
  async getSubjects() {
    const res = await this.get('/subjects');
    return res.data.subjects;
  },

  async createSubject(data) {
    const res = await this.post('/subjects', data);
    return res.data.subject;
  },

  async updateSubject(id, data) {
    const res = await this.put(`/subjects/${id}`, data);
    return res.data.subject;
  },

  async deleteSubject(id) {
    await this.del(`/subjects/${id}`);
  },

  // ---- Exams ----
  async getExams() {
    const res = await this.get('/exams');
    return res.data.exams;
  },

  async createExam(data) {
    const res = await this.post('/exams', data);
    return res.data.exam;
  },

  async updateExam(id, data) {
    const res = await this.put(`/exams/${id}`, data);
    return res.data.exam;
  },

  async deleteExam(id) {
    await this.del(`/exams/${id}`);
  },

  // ---- Dashboard ----
  async getDashboard() {
    const res = await this.get('/dashboard');
    return res.data;
  },

  // ---- Analytics ----
  async getAnalytics() {
    const res = await this.get('/analytics');
    return res.data;
  },

  // ---- Planner ----
  async generatePlan(dailyHours) {
    const res = await this.post('/generate-plan', { daily_hours: dailyHours });
    return res.data;
  },

  async generateWeeklyPlan(dailyHours) {
    const res = await this.post('/generate-weekly-plan', { daily_hours: dailyHours });
    return res.data;
  },

  async getStudyPlans() {
    const res = await this.get('/study-plans');
    return res.data.study_plans;
  },

  async updateStudyPlan(id, data) {
    const res = await this.put(`/study-plans/${id}`, data);
    return res.data.study_plan;
  },

  async deleteStudyPlan(id) {
    await this.del(`/study-plans/${id}`);
  },

  // ---- Progress ----
  async createProgress(data) {
    const res = await this.post('/progress', data);
    return res.data.progress;
  },

  async getProgress() {
    const res = await this.get('/progress');
    return res.data;
  },

  // ---- Revision ----
  async getRevisionSuggestions() {
    const res = await this.get('/revision-suggestions');
    return res.data.revision_suggestions;
  },

  async getRevisionSchedule(days = 7) {
    const res = await this.get(`/revision-schedule?days=${days}`);
    return res.data.revision_schedule;
  },

  // ---- Achievements ----
  async getAchievements() {
    const res = await this.get('/achievements');
    return res.data;
  },

  // ---- Chat ----
  async chat(message) {
    const res = await this.post('/chat', { message });
    return res.data;
  }
};
