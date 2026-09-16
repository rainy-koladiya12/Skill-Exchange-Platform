/**
 * ============================================================================
 * SkillBridge — Peer-to-Peer Student Skill Exchange Platform
 * Full Single-Page Application (HTML + CSS + JavaScript)
 * 
 * Storage Mechanism: HTML5 LocalStorage (No backend required)
 * Modules: Users → Skills → Requests → Sessions → Reviews (All with full CRUD)
 * Designed for clarity and easy explanation in viva / academic demos.
 * ============================================================================
 */

// ============================================================================
// MODULE 1: STORAGE & STATE KEYS
// ============================================================================
const STORAGE_KEYS = {
  USERS: 'skillbridge_users',
  CURRENT_USER: 'skillbridge_current_user',
  SKILLS: 'skillbridge_skills',
  REQUESTS: 'skillbridge_requests',
  SESSIONS: 'skillbridge_sessions',
  REVIEWS: 'skillbridge_reviews',
  SEEDED: 'skillbridge_seeded'
};

/**
 * Generic helper to retrieve JSON arrays from LocalStorage safely
 */
function getStorageItem(key, defaultValue = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
    return defaultValue;
  }
}

/**
 * Generic helper to persist JSON data into LocalStorage safely
 */
function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to localStorage:`, err);
  }
}

/**
 * Generates unique string IDs for records (e.g., 'usr_1710000000_abc')
 */
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

// Current active view state for sub-tabs
let currentRequestTab = 'received'; // 'received' | 'sent'
let currentSessionFilter = 'all';    // 'all' | 'upcoming' | 'completed' | 'cancelled'

// ============================================================================
// MODULE 2: NAVIGATION CONTROLLER & SPA VIEW SWITCHER
// ============================================================================

/**
 * Initializes navbar links, URL hash listener, and section switching
 */
function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  // Handle nav link clicks
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSection = link.getAttribute('data-target');
      navigateTo(targetSection);

      // Close mobile menu if open
      if (navMenu && navMenu.classList.contains('open')) {
        navMenu.classList.remove('open');
      }
    });
  });

  // Mobile hamburger toggle
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });
  }

  // Handle browser back/forward buttons & URL hashes
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '') || 'home';
    navigateTo(hash, false);
  });

  // Initial load navigation
  const initialHash = window.location.hash.replace('#', '') || 'home';
  navigateTo(initialHash, false);
}

/**
 * Switches the active module container on the single page
 * @param {string} sectionId - 'home' | 'skills' | 'requests' | 'sessions' | 'reviews'
 * @param {boolean} updateHash - Whether to update window.location.hash
 */
function navigateTo(sectionId, updateHash = true) {
  // 1. Hide all sections
  const sections = document.querySelectorAll('.section');
  sections.forEach(sec => sec.classList.remove('active'));

  // 2. Remove active class from all nav links
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => link.classList.remove('active'));

  // 3. Find and show target section
  const targetSec = document.getElementById(`section-${sectionId}`);
  if (targetSec) {
    targetSec.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    // Fallback to home if invalid section ID
    const homeSec = document.getElementById('section-home');
    if (homeSec) homeSec.classList.add('active');
    sectionId = 'home';
  }

  // 4. Highlight matching nav link
  const matchingLink = document.querySelector(`.nav-link[data-target="${sectionId}"]`);
  if (matchingLink) {
    matchingLink.classList.add('active');
  }

  // 5. Update hash in browser address bar
  if (updateHash) {
    window.location.hash = sectionId;
  }

  // 6. Close mobile menu if open
  const navMenu = document.getElementById('navMenu');
  if (navMenu && navMenu.classList.contains('open')) {
    navMenu.classList.remove('open');
  }
}

/**
 * Helper to handle Hero CTA button "Offer a Skill"
 */
function handleShareSkillClick() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    showToast('Please log in or sign up first to offer a skill.', 'warning');
    openAuthModal('login');
    return;
  }
  navigateTo('skills');
  openAddSkillModal();
}

// ============================================================================
// MODULE 3: MODAL CONTROLLERS & TOAST SYSTEM
// ============================================================================

function initModals() {
  // Close modals when clicking on the dark backdrop
  const overlays = document.querySelectorAll('.modal-overlay');
  overlays.forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.add('hidden');
      }
    });
  });

  // Close modals on 'Escape' key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
}

/**
 * Open a specific modal by its HTML element ID
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
  }
}

/**
 * Close a specific modal by its HTML element ID
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
  }
}

/**
 * Close all active modal overlays
 */
function closeAllModals() {
  const overlays = document.querySelectorAll('.modal-overlay');
  overlays.forEach(overlay => overlay.classList.add('hidden'));
}

/**
 * Auth modal tab switch between Login and Signup modes
 */
function toggleAuthMode(mode) {
  const tabBtnLogin = document.getElementById('tabBtnLogin');
  const tabBtnSignup = document.getElementById('tabBtnSignup');
  const formLogin = document.getElementById('formLogin');
  const formSignup = document.getElementById('formSignup');

  if (mode === 'login') {
    if (tabBtnLogin) tabBtnLogin.classList.add('active');
    if (tabBtnSignup) tabBtnSignup.classList.remove('active');
    if (formLogin) formLogin.classList.remove('hidden');
    if (formSignup) formSignup.classList.add('hidden');
  } else {
    if (tabBtnSignup) tabBtnSignup.classList.add('active');
    if (tabBtnLogin) tabBtnLogin.classList.remove('active');
    if (formSignup) formSignup.classList.remove('hidden');
    if (formLogin) formLogin.classList.add('hidden');
  }
}

/**
 * Opens Auth modal in specified mode ('login' or 'signup')
 */
function openAuthModal(mode = 'login') {
  toggleAuthMode(mode);
  openModal('modalAuth');
}

/**
 * Displays a non-intrusive floating toast message
 * @param {string} message - Text to display
 * @param {'success'|'danger'|'warning'|'info'} type - Alert style
 * @param {number} duration - Milliseconds before auto-dismiss
 */
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: '✓',
    danger: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.5rem;">
      <span style="font-weight:700;">${iconMap[type] || '•'}</span>
      <span>${escapeHtml(message)}</span>
    </div>
    <button style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:1.1rem;" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Security helper to prevent XSS in dynamic renders
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// MODULE 4: USER MODULE (CRUD)
// ============================================================================

/**
 * CREATE: Register a new user
 */
function registerUser(name, email, password, bio = '') {
  const users = getStorageItem(STORAGE_KEYS.USERS, []);
  
  // Check if email already registered
  const exists = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (exists) {
    showToast('An account with this email already exists!', 'danger');
    return null;
  }

  const newUser = {
    id: generateId('usr'),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: password,
    bio: bio.trim(),
    avatar: name.trim().charAt(0).toUpperCase(),
    joinedAt: new Date().toISOString()
  };

  users.push(newUser);
  setStorageItem(STORAGE_KEYS.USERS, users);

  // Auto login upon registration
  setCurrentUser(newUser);
  showToast(`Welcome to SkillBridge, ${newUser.name}!`, 'success');
  return newUser;
}

/**
 * READ: Login existing user by email and password
 */
function loginUser(email, password) {
  const users = getStorageItem(STORAGE_KEYS.USERS, []);
  const user = users.find(
    u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
  );

  if (!user) {
    showToast('Invalid email or password. Please try again.', 'danger');
    return null;
  }

  setCurrentUser(user);
  showToast(`Welcome back, ${user.name}!`, 'success');
  return user;
}

/**
 * READ: Get currently logged in user
 */
function getCurrentUser() {
  return getStorageItem(STORAGE_KEYS.CURRENT_USER, null);
}

/**
 * Sets current user in state & updates navbar UI
 */
function setCurrentUser(user) {
  if (user) {
    const sessionSafeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      bio: user.bio,
      avatar: user.avatar
    };
    setStorageItem(STORAGE_KEYS.CURRENT_USER, sessionSafeUser);
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
  renderAuthUI();
  refreshAllViews();
}

/**
 * LOGOUT: Clears user session
 */
function logoutUser() {
  const user = getCurrentUser();
  setCurrentUser(null);
  showToast(user ? `Goodbye, ${user.name}!` : 'Logged out.', 'info');
  navigateTo('home');
}

/**
 * UPDATE: Edit profile details (name, bio)
 */
function updateUserProfile(userId, { name, bio }) {
  const users = getStorageItem(STORAGE_KEYS.USERS, []);
  const index = users.findIndex(u => u.id === userId);

  if (index === -1) {
    showToast('User not found.', 'danger');
    return false;
  }

  users[index].name = name.trim();
  users[index].bio = bio.trim();
  users[index].avatar = name.trim().charAt(0).toUpperCase();
  setStorageItem(STORAGE_KEYS.USERS, users);

  // Sync current user session
  setCurrentUser(users[index]);

  // Update teacherName across authored skills
  const skills = getStorageItem(STORAGE_KEYS.SKILLS, []);
  skills.forEach(skill => {
    if (skill.teacherId === userId) {
      skill.teacherName = name.trim();
    }
  });
  setStorageItem(STORAGE_KEYS.SKILLS, skills);

  showToast('Profile updated successfully!', 'success');
  closeModal('modalProfile');
  return true;
}

/**
 * DELETE: Delete account and cascade removal of user data
 */
function deleteUserAccount(userId) {
  if (!confirm('Are you sure you want to permanently delete your account? This will remove your skills and cancel active requests.')) {
    return false;
  }

  // 1. Remove from users list
  let users = getStorageItem(STORAGE_KEYS.USERS, []);
  users = users.filter(u => u.id !== userId);
  setStorageItem(STORAGE_KEYS.USERS, users);

  // 2. Remove user's authored skills
  let skills = getStorageItem(STORAGE_KEYS.SKILLS, []);
  skills = skills.filter(s => s.teacherId !== userId);
  setStorageItem(STORAGE_KEYS.SKILLS, skills);

  // 3. Cancel active requests involving this user
  let requests = getStorageItem(STORAGE_KEYS.REQUESTS, []);
  requests = requests.filter(r => r.learnerId !== userId && r.teacherId !== userId);
  setStorageItem(STORAGE_KEYS.REQUESTS, requests);

  // 4. Log out
  setCurrentUser(null);
  closeModal('modalProfile');
  showToast('Your account has been deleted.', 'warning');
  navigateTo('home');
  return true;
}

/**
 * Updates navbar display depending on auth state
 */
function renderAuthUI() {
  const currentUser = getCurrentUser();
  const authGuest = document.getElementById('authGuest');
  const authUser = document.getElementById('authUser');
  const navUserName = document.getElementById('navUserName');
  const navUserAvatar = document.getElementById('navUserAvatar');

  if (currentUser) {
    if (authGuest) authGuest.classList.add('hidden');
    if (authUser) authUser.classList.remove('hidden');
    if (navUserName) navUserName.textContent = currentUser.name;
    if (navUserAvatar) navUserAvatar.textContent = currentUser.avatar || currentUser.name.charAt(0);
  } else {
    if (authGuest) authGuest.classList.remove('hidden');
    if (authUser) authUser.classList.add('hidden');
  }
}

// User Profile & Account Actions
function openProfileModal() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    openAuthModal('login');
    return;
  }
  document.getElementById('profileName').value = currentUser.name || '';
  document.getElementById('profileEmail').value = currentUser.email || '';
  document.getElementById('profileBio').value = currentUser.bio || '';
  openModal('modalProfile');
}

function confirmDeleteAccount() {
  const currentUser = getCurrentUser();
  if (currentUser) {
    deleteUserAccount(currentUser.id);
  }
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPassword').value;
  const user = loginUser(email, pass);
  if (user) {
    closeModal('modalAuth');
    e.target.reset();
  }
}

function handleSignupSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const pass = document.getElementById('signupPassword').value;
  const bio = document.getElementById('signupBio').value;

  const user = registerUser(name, email, pass, bio);
  if (user) {
    closeModal('modalAuth');
    e.target.reset();
  }
}

function handleProfileUpdateSubmit(e) {
  e.preventDefault();
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const name = document.getElementById('profileName').value;
  const bio = document.getElementById('profileBio').value;
  updateUserProfile(currentUser.id, { name, bio });
}

// ============================================================================
// MODULE 5: SKILLS MODULE (CRUD)
// ============================================================================

/**
 * CREATE: Add a new skill
 */
function createSkill(title, category, description, level) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    showToast('Please log in to offer a skill.', 'warning');
    openAuthModal('login');
    return null;
  }

  const skills = getStorageItem(STORAGE_KEYS.SKILLS, []);

  const newSkill = {
    id: generateId('skl'),
    title: title.trim(),
    category: category,
    description: description.trim(),
    level: level,
    teacherId: currentUser.id,
    teacherName: currentUser.name,
    createdAt: new Date().toISOString()
  };

  skills.unshift(newSkill);
  setStorageItem(STORAGE_KEYS.SKILLS, skills);
  showToast('Skill posted successfully! Other students can now request sessions.', 'success');
  renderSkillsGrid();
  updateHeroStats();
  return newSkill;
}

/**
 * READ: Fetch all skills with search and category filtering
 */
function getAllSkills(searchQuery = '', categoryFilter = 'all', levelFilter = 'all') {
  let skills = getStorageItem(STORAGE_KEYS.SKILLS, []);

  if (categoryFilter && categoryFilter !== 'all') {
    skills = skills.filter(s => s.category.toLowerCase() === categoryFilter.toLowerCase());
  }

  if (levelFilter && levelFilter !== 'all') {
    skills = skills.filter(s => s.level.toLowerCase() === levelFilter.toLowerCase());
  }

  if (searchQuery && searchQuery.trim() !== '') {
    const q = searchQuery.trim().toLowerCase();
    skills = skills.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.teacherName.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  }

  return skills;
}

/**
 * UPDATE: Edit existing skill
 */
function updateSkill(skillId, { title, category, description, level }) {
  const currentUser = getCurrentUser();
  const skills = getStorageItem(STORAGE_KEYS.SKILLS, []);
  const index = skills.findIndex(s => s.id === skillId);

  if (index === -1) {
    showToast('Skill not found.', 'danger');
    return false;
  }

  if (!currentUser || skills[index].teacherId !== currentUser.id) {
    showToast('You can only edit skills you created.', 'danger');
    return false;
  }

  skills[index].title = title.trim();
  skills[index].category = category;
  skills[index].description = description.trim();
  skills[index].level = level;
  skills[index].updatedAt = new Date().toISOString();

  setStorageItem(STORAGE_KEYS.SKILLS, skills);
  showToast('Skill updated successfully!', 'success');
  renderSkillsGrid();
  return true;
}

/**
 * DELETE: Delete a skill
 */
function deleteSkill(skillId) {
  const currentUser = getCurrentUser();
  const skills = getStorageItem(STORAGE_KEYS.SKILLS, []);
  const skill = skills.find(s => s.id === skillId);

  if (!skill) {
    showToast('Skill not found.', 'danger');
    return false;
  }

  if (!currentUser || skill.teacherId !== currentUser.id) {
    showToast('You are not authorized to delete this skill.', 'danger');
    return false;
  }

  if (!confirm(`Are you sure you want to delete "${skill.title}"?`)) {
    return false;
  }

  const updatedSkills = skills.filter(s => s.id !== skillId);
  setStorageItem(STORAGE_KEYS.SKILLS, updatedSkills);
  showToast('Skill deleted successfully.', 'info');
  renderSkillsGrid();
  updateHeroStats();
  return true;
}

/**
 * Renders the Skills Card Grid in the DOM
 */
function renderSkillsGrid() {
  const container = document.getElementById('skillsContainer');
  if (!container) return;

  const searchVal = document.getElementById('skillSearchInput')?.value || '';
  const categoryVal = document.getElementById('skillCategoryFilter')?.value || 'all';
  const levelVal = document.getElementById('skillLevelFilter')?.value || 'all';

  const skills = getAllSkills(searchVal, categoryVal, levelVal);
  const currentUser = getCurrentUser();

  if (skills.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No Skills Found</h3>
        <p>No matching skills available. Try adjusting your search filters or offer a new skill!</p>
        <button class="btn btn-primary" onclick="openAddSkillModal()">+ Offer a Skill</button>
      </div>
    `;
    return;
  }

  container.innerHTML = skills.map(skill => {
    const isOwner = currentUser && currentUser.id === skill.teacherId;
    const ratingData = getSkillAverageRating(skill.id);
    const levelClass = `level-${(skill.level || 'beginner').toLowerCase()}`;

    return `
      <div class="card" id="card-${skill.id}">
        <div class="card-header">
          <span class="badge badge-primary">${escapeHtml(skill.category)}</span>
          <span class="badge ${levelClass}">${escapeHtml(skill.level)}</span>
        </div>

        <h3 class="card-title">${escapeHtml(skill.title)}</h3>

        <div class="card-meta">
          <div class="rating-stars-display">
            <span>★</span>
            <strong>${ratingData.avg > 0 ? ratingData.avg.toFixed(1) : 'New'}</strong>
            <span style="color:var(--text-muted);font-size:0.8rem;">(${ratingData.count} ${ratingData.count === 1 ? 'review' : 'reviews'})</span>
          </div>
        </div>

        <p class="card-description">${escapeHtml(skill.description)}</p>

        <div class="card-footer">
          <div class="card-author">
            <span class="card-author-avatar">${escapeHtml(skill.teacherName.charAt(0))}</span>
            <span>${escapeHtml(skill.teacherName)} ${isOwner ? '<strong>(You)</strong>' : ''}</span>
          </div>

          <div class="card-actions">
            ${isOwner ? `
              <button class="btn btn-sm btn-outline" onclick="openEditSkillModal('${skill.id}')">Edit</button>
              <button class="btn btn-sm btn-outline text-danger" onclick="deleteSkill('${skill.id}')">Delete</button>
            ` : `
              <button class="btn btn-sm btn-primary" onclick="openRequestModal('${skill.id}')">Request Session</button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openAddSkillModal() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    showToast('Please log in or sign up first to offer a skill.', 'warning');
    openAuthModal('login');
    return;
  }
  document.getElementById('skillModalTitle').textContent = 'Add a New Skill';
  document.getElementById('skillEditId').value = '';
  document.getElementById('formSkill').reset();
  openModal('modalSkill');
}

function openEditSkillModal(skillId) {
  const skills = getStorageItem(STORAGE_KEYS.SKILLS, []);
  const skill = skills.find(s => s.id === skillId);
  if (!skill) return;

  document.getElementById('skillModalTitle').textContent = 'Edit Skill';
  document.getElementById('skillEditId').value = skill.id;
  document.getElementById('skillTitle').value = skill.title;
  document.getElementById('skillCategory').value = skill.category;
  document.getElementById('skillLevel').value = skill.level;
  document.getElementById('skillDescription').value = skill.description;
  openModal('modalSkill');
}

function handleSkillFormSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('skillEditId').value;
  const title = document.getElementById('skillTitle').value;
  const category = document.getElementById('skillCategory').value;
  const level = document.getElementById('skillLevel').value;
  const description = document.getElementById('skillDescription').value;

  if (editId) {
    updateSkill(editId, { title, category, description, level });
  } else {
    createSkill(title, category, description, level);
  }
  closeModal('modalSkill');
}

// ============================================================================
// MODULE 6: REQUESTS MODULE (CRUD)
// ============================================================================

/**
 * CREATE: Learner sends a session request for a skill
 */
function createLearningRequest(skillId, preferredDate, preferredTime, message) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    showToast('Please log in to request a session.', 'warning');
    openAuthModal('login');
    return null;
  }

  const skills = getStorageItem(STORAGE_KEYS.SKILLS, []);
  const skill = skills.find(s => s.id === skillId);

  if (!skill) {
    showToast('Skill does not exist.', 'danger');
    return null;
  }

  if (skill.teacherId === currentUser.id) {
    showToast('You cannot request a session for your own skill!', 'warning');
    return null;
  }

  const requests = getStorageItem(STORAGE_KEYS.REQUESTS, []);

  const newRequest = {
    id: generateId('req'),
    skillId: skill.id,
    skillTitle: skill.title,
    teacherId: skill.teacherId,
    teacherName: skill.teacherName,
    learnerId: currentUser.id,
    learnerName: currentUser.name,
    preferredDate: preferredDate,
    preferredTime: preferredTime,
    message: message.trim(),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  requests.unshift(newRequest);
  setStorageItem(STORAGE_KEYS.REQUESTS, requests);

  showToast('Learning request sent to mentor!', 'success');
  closeModal('modalRequest');
  renderRequestsView();
  return newRequest;
}

/**
 * READ: Get requests for current user (sent or received)
 */
function getRequestsForUser(type = 'received') {
  const currentUser = getCurrentUser();
  if (!currentUser) return [];

  const requests = getStorageItem(STORAGE_KEYS.REQUESTS, []);
  if (type === 'received') {
    return requests.filter(r => r.teacherId === currentUser.id);
  } else {
    return requests.filter(r => r.learnerId === currentUser.id);
  }
}

/**
 * UPDATE: Learner updates pending request details
 */
function updateRequest(requestId, { preferredDate, preferredTime, message }) {
  const currentUser = getCurrentUser();
  const requests = getStorageItem(STORAGE_KEYS.REQUESTS, []);
  const req = requests.find(r => r.id === requestId);

  if (!req) {
    showToast('Request not found.', 'danger');
    return false;
  }

  if (!currentUser || req.learnerId !== currentUser.id) {
    showToast('Unauthorized to edit this request.', 'danger');
    return false;
  }

  if (req.status !== 'pending') {
    showToast(`Cannot edit a request that is already ${req.status}.`, 'warning');
    return false;
  }

  req.preferredDate = preferredDate;
  req.preferredTime = preferredTime;
  req.message = message.trim();
  req.updatedAt = new Date().toISOString();

  setStorageItem(STORAGE_KEYS.REQUESTS, requests);
  showToast('Request details updated.', 'success');
  closeModal('modalRequest');
  renderRequestsView();
  return true;
}

/**
 * UPDATE: Teacher accepts or rejects a request
 * Accepting a request AUTOMATICALLY creates an exchange Session!
 */
function respondToRequest(requestId, newStatus) {
  const currentUser = getCurrentUser();
  const requests = getStorageItem(STORAGE_KEYS.REQUESTS, []);
  const req = requests.find(r => r.id === requestId);

  if (!req) {
    showToast('Request not found.', 'danger');
    return false;
  }

  if (!currentUser || req.teacherId !== currentUser.id) {
    showToast('Only the mentor can respond to this request.', 'danger');
    return false;
  }

  req.status = newStatus;
  req.respondedAt = new Date().toISOString();
  setStorageItem(STORAGE_KEYS.REQUESTS, requests);

  if (newStatus === 'accepted') {
    createSessionFromRequest(req);
    showToast(`Request accepted! A confirmed session has been scheduled.`, 'success');
  } else {
    showToast(`Request declined.`, 'info');
  }

  renderRequestsView();
  renderSessionsView();
  updateHeroStats();
  return true;
}

/**
 * DELETE: Cancel / remove a request (Learner action)
 */
function cancelRequest(requestId) {
  const currentUser = getCurrentUser();
  const requests = getStorageItem(STORAGE_KEYS.REQUESTS, []);
  const req = requests.find(r => r.id === requestId);

  if (!req) {
    showToast('Request not found.', 'danger');
    return false;
  }

  if (!currentUser || req.learnerId !== currentUser.id) {
    showToast('Only the requester can cancel this request.', 'danger');
    return false;
  }

  if (!confirm('Are you sure you want to cancel this request?')) {
    return false;
  }

  const updatedRequests = requests.filter(r => r.id !== requestId);
  setStorageItem(STORAGE_KEYS.REQUESTS, updatedRequests);
  showToast('Request cancelled.', 'info');
  renderRequestsView();
  return true;
}

/**
 * Switches tab between 'received' and 'sent' requests
 */
function switchRequestTab(tab) {
  currentRequestTab = tab;
  document.getElementById('tabReceivedRequests')?.classList.toggle('active', tab === 'received');
  document.getElementById('tabSentRequests')?.classList.toggle('active', tab === 'sent');
  renderRequestsView();
}

/**
 * Renders the Requests view
 */
function renderRequestsView() {
  const container = document.getElementById('requestsContainer');
  if (!container) return;

  const currentUser = getCurrentUser();
  const receivedReqs = getRequestsForUser('received');
  const sentReqs = getRequestsForUser('sent');

  const countReceivedEl = document.getElementById('countReceivedReqs');
  const countSentEl = document.getElementById('countSentReqs');
  if (countReceivedEl) countReceivedEl.textContent = receivedReqs.length;
  if (countSentEl) countSentEl.textContent = sentReqs.length;

  if (!currentUser) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔒</div>
        <h3>Log In to View Requests</h3>
        <p>You must be signed in to view incoming and outgoing session requests.</p>
        <button class="btn btn-primary" onclick="openAuthModal('login')">Log In Now</button>
      </div>
    `;
    return;
  }

  const activeList = currentRequestTab === 'received' ? receivedReqs : sentReqs;

  if (activeList.length === 0) {
    const isReceived = currentRequestTab === 'received';
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${isReceived ? '📬' : '📤'}</div>
        <h3>No ${isReceived ? 'Received' : 'Sent'} Requests</h3>
        <p>${isReceived 
          ? 'You do not have any pending student requests. Offer more skills to receive requests!' 
          : 'You haven\'t requested any skills yet. Explore skills to send your first learning request!'}
        </p>
        <button class="btn btn-primary" onclick="navigateTo('skills')">Browse Skills</button>
      </div>
    `;
    return;
  }

  container.innerHTML = activeList.map(req => {
    const isTeacher = currentUser.id === req.teacherId;
    const isPending = req.status === 'pending';

    let statusBadge = '';
    if (req.status === 'pending') statusBadge = `<span class="badge badge-warning">Pending</span>`;
    else if (req.status === 'accepted') statusBadge = `<span class="badge badge-success">Accepted</span>`;
    else if (req.status === 'rejected') statusBadge = `<span class="badge badge-danger">Declined</span>`;
    else statusBadge = `<span class="badge badge-neutral">${req.status}</span>`;

    return `
      <div class="card" style="margin-bottom:1rem;">
        <div class="card-header">
          <div>
            <h4 style="font-size:1.1rem;font-weight:700;">${escapeHtml(req.skillTitle)}</h4>
            <span style="font-size:0.85rem;color:var(--text-muted);">
              ${isTeacher ? `From student: <strong>${escapeHtml(req.learnerName)}</strong>` : `Mentor: <strong>${escapeHtml(req.teacherName)}</strong>`}
            </span>
          </div>
          <div>${statusBadge}</div>
        </div>

        <div style="background:#f8fafc;padding:0.75rem 1rem;border-radius:var(--radius-md);margin:0.75rem 0;font-size:0.9rem;">
          <div style="margin-bottom:0.25rem;">
            📅 <strong>Date:</strong> ${escapeHtml(req.preferredDate)} &nbsp;|&nbsp; ⏰ <strong>Time:</strong> ${escapeHtml(req.preferredTime)}
          </div>
          <div>💬 <strong>Message:</strong> "${escapeHtml(req.message)}"</div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:0.5rem;align-items:center;">
          ${isTeacher && isPending ? `
            <button class="btn btn-sm btn-success" onclick="respondToRequest('${req.id}', 'accepted')">✓ Accept Request</button>
            <button class="btn btn-sm btn-outline text-danger" onclick="respondToRequest('${req.id}', 'rejected')">✕ Decline</button>
          ` : ''}

          ${!isTeacher && isPending ? `
            <button class="btn btn-sm btn-outline" onclick="openEditRequestModal('${req.id}')">Edit Request</button>
            <button class="btn btn-sm btn-outline text-danger" onclick="cancelRequest('${req.id}')">Cancel Request</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function openRequestModal(skillId) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    showToast('Please log in or sign up first to request a session.', 'warning');
    openAuthModal('login');
    return;
  }

  const skills = getStorageItem(STORAGE_KEYS.SKILLS, []);
  const skill = skills.find(s => s.id === skillId);
  if (!skill) return;

  if (skill.teacherId === currentUser.id) {
    showToast('You cannot request a session for your own skill!', 'warning');
    return;
  }

  document.getElementById('formRequest').reset();
  document.getElementById('requestSkillId').value = skill.id;
  document.getElementById('requestEditId').value = '';
  document.getElementById('requestSkillTitle').value = skill.title;
  document.getElementById('requestModalSubtitle').textContent = `Request a learning session with ${skill.teacherName}`;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('requestDate').value = tomorrow.toISOString().split('T')[0];
  document.getElementById('requestTime').value = '17:00';

  openModal('modalRequest');
}

function openEditRequestModal(requestId) {
  const requests = getStorageItem(STORAGE_KEYS.REQUESTS, []);
  const req = requests.find(r => r.id === requestId);
  if (!req) return;

  document.getElementById('requestSkillId').value = req.skillId;
  document.getElementById('requestEditId').value = req.id;
  document.getElementById('requestSkillTitle').value = req.skillTitle;
  document.getElementById('requestDate').value = req.preferredDate;
  document.getElementById('requestTime').value = req.preferredTime;
  document.getElementById('requestMessage').value = req.message;
  document.getElementById('requestModalSubtitle').textContent = 'Edit your learning request';

  openModal('modalRequest');
}

function handleRequestFormSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('requestEditId').value;
  const skillId = document.getElementById('requestSkillId').value;
  const date = document.getElementById('requestDate').value;
  const time = document.getElementById('requestTime').value;
  const message = document.getElementById('requestMessage').value;

  if (editId) {
    updateRequest(editId, { preferredDate: date, preferredTime: time, message });
  } else {
    createLearningRequest(skillId, date, time, message);
  }
}

// ============================================================================
// MODULE 7: SESSIONS MODULE (CRUD)
// ============================================================================

/**
 * CREATE: Automatically called when teacher accepts request
 */
function createSessionFromRequest(request) {
  const sessions = getStorageItem(STORAGE_KEYS.SESSIONS, []);

  const newSession = {
    id: generateId('ses'),
    requestId: request.id,
    skillId: request.skillId,
    skillTitle: request.skillTitle,
    teacherId: request.teacherId,
    teacherName: request.teacherName,
    learnerId: request.learnerId,
    learnerName: request.learnerName,
    date: request.preferredDate,
    time: request.preferredTime,
    status: 'upcoming',
    notes: request.message,
    createdAt: new Date().toISOString()
  };

  sessions.unshift(newSession);
  setStorageItem(STORAGE_KEYS.SESSIONS, sessions);
  return newSession;
}

/**
 * READ: Get user sessions with filter
 */
function getUserSessions(statusFilter = 'all') {
  const currentUser = getCurrentUser();
  if (!currentUser) return [];

  let sessions = getStorageItem(STORAGE_KEYS.SESSIONS, []);
  
  sessions = sessions.filter(
    s => s.teacherId === currentUser.id || s.learnerId === currentUser.id
  );

  if (statusFilter && statusFilter !== 'all') {
    sessions = sessions.filter(s => s.status === statusFilter);
  }

  return sessions;
}

/**
 * UPDATE: Reschedule session date and time
 */
function rescheduleSession(sessionId, newDate, newTime) {
  const currentUser = getCurrentUser();
  const sessions = getStorageItem(STORAGE_KEYS.SESSIONS, []);
  const session = sessions.find(s => s.id === sessionId);

  if (!session) {
    showToast('Session not found.', 'danger');
    return false;
  }

  if (!currentUser || (session.teacherId !== currentUser.id && session.learnerId !== currentUser.id)) {
    showToast('You are not a participant in this session.', 'danger');
    return false;
  }

  session.date = newDate;
  session.time = newTime;
  session.updatedAt = new Date().toISOString();

  setStorageItem(STORAGE_KEYS.SESSIONS, sessions);
  showToast('Session successfully rescheduled!', 'success');
  closeModal('modalReschedule');
  renderSessionsView();
  return true;
}

/**
 * UPDATE: Change session status ('completed' | 'cancelled')
 */
function updateSessionStatus(sessionId, newStatus) {
  const currentUser = getCurrentUser();
  const sessions = getStorageItem(STORAGE_KEYS.SESSIONS, []);
  const session = sessions.find(s => s.id === sessionId);

  if (!session) {
    showToast('Session not found.', 'danger');
    return false;
  }

  if (!currentUser || (session.teacherId !== currentUser.id && session.learnerId !== currentUser.id)) {
    showToast('Unauthorized.', 'danger');
    return false;
  }

  session.status = newStatus;
  session.statusUpdatedAt = new Date().toISOString();
  setStorageItem(STORAGE_KEYS.SESSIONS, sessions);

  if (newStatus === 'completed') {
    showToast('Session marked as completed! Learner can now leave a review.', 'success');
  } else if (newStatus === 'cancelled') {
    showToast('Session has been cancelled.', 'info');
  }

  renderSessionsView();
  updateHeroStats();
  return true;
}

/**
 * DELETE: Remove a cancelled session from history
 */
function deleteSession(sessionId) {
  const currentUser = getCurrentUser();
  const sessions = getStorageItem(STORAGE_KEYS.SESSIONS, []);
  const session = sessions.find(s => s.id === sessionId);

  if (!session) {
    showToast('Session not found.', 'danger');
    return false;
  }

  if (!currentUser || (session.teacherId !== currentUser.id && session.learnerId !== currentUser.id)) {
    showToast('Unauthorized.', 'danger');
    return false;
  }

  if (!confirm('Remove this session record?')) {
    return false;
  }

  const updated = sessions.filter(s => s.id !== sessionId);
  setStorageItem(STORAGE_KEYS.SESSIONS, updated);
  showToast('Session removed from history.', 'info');
  renderSessionsView();
  return true;
}

function filterSessions(status) {
  currentSessionFilter = status;
  const buttons = document.querySelectorAll('#section-sessions .sub-tab-btn');
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.textContent.toLowerCase().includes(status));
  });
  renderSessionsView();
}

/**
 * Renders the Sessions list view
 */
function renderSessionsView() {
  const container = document.getElementById('sessionsContainer');
  if (!container) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔒</div>
        <h3>Log In to View Sessions</h3>
        <p>Sign in to manage your scheduled exchange lessons, reschedule, and complete sessions.</p>
        <button class="btn btn-primary" onclick="openAuthModal('login')">Log In Now</button>
      </div>
    `;
    return;
  }

  const sessions = getUserSessions(currentSessionFilter);

  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <h3>No ${currentSessionFilter !== 'all' ? currentSessionFilter : ''} Sessions Found</h3>
        <p>You don't have any sessions in this category. Accept an incoming request or request a skill to schedule one!</p>
        <button class="btn btn-primary" onclick="navigateTo('skills')">Find Skills</button>
      </div>
    `;
    return;
  }

  const reviews = getStorageItem(STORAGE_KEYS.REVIEWS, []);

  container.innerHTML = sessions.map(ses => {
    const isTeacher = currentUser.id === ses.teacherId;
    const isLearner = currentUser.id === ses.learnerId;
    const isUpcoming = ses.status === 'upcoming';
    const isCompleted = ses.status === 'completed';
    const isCancelled = ses.status === 'cancelled';

    const existingReview = reviews.find(r => r.sessionId === ses.id);

    let badgeClass = 'badge-primary';
    if (isCompleted) badgeClass = 'badge-success';
    if (isCancelled) badgeClass = 'badge-neutral';

    return `
      <div class="card" style="margin-bottom:1.25rem;">
        <div class="card-header">
          <div>
            <h4 style="font-size:1.15rem;font-weight:700;">${escapeHtml(ses.skillTitle)}</h4>
            <span style="font-size:0.875rem;color:var(--text-muted);">
              ${isTeacher 
                ? `Student: <strong>${escapeHtml(ses.learnerName)}</strong> (You are teaching)` 
                : `Mentor: <strong>${escapeHtml(ses.teacherName)}</strong> (You are learning)`}
            </span>
          </div>
          <span class="badge ${badgeClass}" style="text-transform:capitalize;">${ses.status}</span>
        </div>

        <div style="background:#f8fafc;padding:0.85rem 1rem;border-radius:var(--radius-md);margin:0.85rem 0;display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.9rem;">
          <div>📅 <strong>Date:</strong> ${escapeHtml(ses.date)}</div>
          <div>⏰ <strong>Time:</strong> ${escapeHtml(ses.time)}</div>
          ${ses.notes ? `<div style="width:100%;color:var(--text-muted);">📝 "${escapeHtml(ses.notes)}"</div>` : ''}
        </div>

        <div style="display:flex;justify-content:flex-end;gap:0.65rem;flex-wrap:wrap;align-items:center;">
          ${isUpcoming ? `
            <button class="btn btn-sm btn-outline" onclick="openRescheduleModal('${ses.id}', '${ses.date}', '${ses.time}')">🕒 Reschedule</button>
            <button class="btn btn-sm btn-success" onclick="updateSessionStatus('${ses.id}', 'completed')">✓ Mark Completed</button>
            <button class="btn btn-sm btn-outline text-danger" onclick="updateSessionStatus('${ses.id}', 'cancelled')">Cancel</button>
          ` : ''}

          ${isCompleted && isLearner && !existingReview ? `
            <button class="btn btn-sm btn-primary" onclick="openReviewModal('${ses.id}')">★ Leave Review</button>
          ` : ''}

          ${isCompleted && isLearner && existingReview ? `
            <span class="badge badge-success">Reviewed (${existingReview.rating}★)</span>
            <button class="btn btn-sm btn-outline" onclick="openEditReviewModal('${existingReview.id}')">Edit Review</button>
          ` : ''}

          ${isCancelled ? `
            <button class="btn btn-sm btn-outline text-danger" onclick="deleteSession('${ses.id}')">Remove Record</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function openRescheduleModal(sessionId, currentDate, currentTime) {
  document.getElementById('rescheduleSessionId').value = sessionId;
  document.getElementById('rescheduleDate').value = currentDate;
  document.getElementById('rescheduleTime').value = currentTime;
  openModal('modalReschedule');
}

function handleRescheduleFormSubmit(e) {
  e.preventDefault();
  const sessionId = document.getElementById('rescheduleSessionId').value;
  const date = document.getElementById('rescheduleDate').value;
  const time = document.getElementById('rescheduleTime').value;
  rescheduleSession(sessionId, date, time);
}

// ============================================================================
// MODULE 8: REVIEWS MODULE (CRUD)
// ============================================================================

/**
 * CREATE: Learner adds review for mentor after session completion
 */
function createReview(sessionId, rating, comment) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    showToast('Please log in to submit a review.', 'warning');
    return null;
  }

  const sessions = getStorageItem(STORAGE_KEYS.SESSIONS, []);
  const session = sessions.find(s => s.id === sessionId);

  if (!session) {
    showToast('Session not found.', 'danger');
    return null;
  }

  if (session.status !== 'completed') {
    showToast('You can only review a completed session.', 'warning');
    return null;
  }

  if (session.learnerId !== currentUser.id) {
    showToast('Only the learner can submit a review for this session.', 'danger');
    return null;
  }

  const reviews = getStorageItem(STORAGE_KEYS.REVIEWS, []);

  const alreadyReviewed = reviews.find(r => r.sessionId === sessionId);
  if (alreadyReviewed) {
    showToast('You have already submitted a review for this session.', 'warning');
    return null;
  }

  const newReview = {
    id: generateId('rev'),
    sessionId: session.id,
    skillId: session.skillId,
    skillTitle: session.skillTitle,
    teacherId: session.teacherId,
    teacherName: session.teacherName,
    learnerId: currentUser.id,
    learnerName: currentUser.name,
    rating: parseInt(rating, 10),
    comment: comment.trim(),
    createdAt: new Date().toISOString()
  };

  reviews.unshift(newReview);
  setStorageItem(STORAGE_KEYS.REVIEWS, reviews);

  showToast('Thank you for your feedback! Review published.', 'success');
  closeModal('modalReview');
  renderReviewsView();
  renderSessionsView();
  renderSkillsGrid();
  updateHeroStats();
  return newReview;
}

/**
 * READ: Calculate average rating for a skill
 */
function getSkillAverageRating(skillId) {
  const reviews = getStorageItem(STORAGE_KEYS.REVIEWS, []);
  const skillReviews = reviews.filter(r => r.skillId === skillId);

  if (skillReviews.length === 0) {
    return { avg: 0, count: 0 };
  }

  const sum = skillReviews.reduce((acc, r) => acc + r.rating, 0);
  return {
    avg: Number((sum / skillReviews.length).toFixed(1)),
    count: skillReviews.length
  };
}

/**
 * UPDATE: Learner updates their review
 */
function updateReview(reviewId, newRating, newComment) {
  const currentUser = getCurrentUser();
  const reviews = getStorageItem(STORAGE_KEYS.REVIEWS, []);
  const review = reviews.find(r => r.id === reviewId);

  if (!review) {
    showToast('Review not found.', 'danger');
    return false;
  }

  if (!currentUser || review.learnerId !== currentUser.id) {
    showToast('Unauthorized to edit this review.', 'danger');
    return false;
  }

  review.rating = parseInt(newRating, 10);
  review.comment = newComment.trim();
  review.updatedAt = new Date().toISOString();

  setStorageItem(STORAGE_KEYS.REVIEWS, reviews);
  showToast('Review updated successfully.', 'success');
  closeModal('modalReview');
  renderReviewsView();
  renderSessionsView();
  renderSkillsGrid();
  updateHeroStats();
  return true;
}

/**
 * DELETE: Learner removes their review
 */
function deleteReview(reviewId) {
  const currentUser = getCurrentUser();
  const reviews = getStorageItem(STORAGE_KEYS.REVIEWS, []);
  const review = reviews.find(r => r.id === reviewId);

  if (!review) {
    showToast('Review not found.', 'danger');
    return false;
  }

  if (!currentUser || review.learnerId !== currentUser.id) {
    showToast('Unauthorized to delete this review.', 'danger');
    return false;
  }

  if (!confirm('Are you sure you want to delete this review?')) {
    return false;
  }

  const updated = reviews.filter(r => r.id !== reviewId);
  setStorageItem(STORAGE_KEYS.REVIEWS, updated);
  showToast('Review removed.', 'info');
  renderReviewsView();
  renderSessionsView();
  renderSkillsGrid();
  updateHeroStats();
  return true;
}

/**
 * Renders the Community Reviews grid
 */
function renderReviewsView() {
  const container = document.getElementById('reviewsContainer');
  if (!container) return;

  const reviews = getStorageItem(STORAGE_KEYS.REVIEWS, []);
  const currentUser = getCurrentUser();

  if (reviews.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⭐</div>
        <h3>No Reviews Yet</h3>
        <p>Reviews will appear here once learners complete exchange sessions and leave feedback.</p>
        <button class="btn btn-primary" onclick="navigateTo('skills')">Explore Skills</button>
      </div>
    `;
    return;
  }

  container.innerHTML = reviews.map(rev => {
    const isAuthor = currentUser && currentUser.id === rev.learnerId;
    const stars = '★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating);
    const dateFormatted = new Date(rev.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    return `
      <div class="card" style="margin-bottom:1.25rem;">
        <div class="card-header">
          <div>
            <span style="color:#f59e0b;font-size:1.15rem;letter-spacing:1px;">${stars}</span>
            <h4 style="font-size:1.05rem;font-weight:700;margin-top:0.25rem;">${escapeHtml(rev.skillTitle)}</h4>
            <span style="font-size:0.85rem;color:var(--text-muted);">
              Mentor: <strong>${escapeHtml(rev.teacherName || 'Student Mentor')}</strong>
            </span>
          </div>
          <span style="font-size:0.8rem;color:var(--text-muted);">${dateFormatted}</span>
        </div>

        <p style="font-size:0.925rem;color:var(--text-main);margin:0.75rem 0;line-height:1.5;">
          "${escapeHtml(rev.comment)}"
        </p>

        <div class="card-footer">
          <div class="card-author">
            <span class="card-author-avatar">${escapeHtml(rev.learnerName.charAt(0))}</span>
            <span>Reviewed by <strong>${escapeHtml(rev.learnerName)}</strong></span>
          </div>

          ${isAuthor ? `
            <div style="display:flex;gap:0.5rem;">
              <button class="btn btn-sm btn-outline" onclick="openEditReviewModal('${rev.id}')">Edit</button>
              <button class="btn btn-sm btn-outline text-danger" onclick="deleteReview('${rev.id}')">Delete</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function initStarRatingPicker() {
  const starBtns = document.querySelectorAll('#starRatingSelect .star-btn');
  const ratingInput = document.getElementById('reviewRatingVal');

  function updateStars(val) {
    starBtns.forEach(btn => {
      const btnVal = parseInt(btn.getAttribute('data-val'), 10);
      btn.classList.toggle('active', btnVal <= val);
    });
    if (ratingInput) ratingInput.value = val;
  }

  starBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseInt(btn.getAttribute('data-val'), 10);
      updateStars(val);
    });
  });

  updateStars(5);
}

function openReviewModal(sessionId) {
  document.getElementById('formReview').reset();
  document.getElementById('reviewModalTitle').textContent = 'Leave a Review';
  document.getElementById('reviewSessionId').value = sessionId;
  document.getElementById('reviewEditId').value = '';
  document.getElementById('reviewRatingVal').value = '5';
  
  document.querySelectorAll('#starRatingSelect .star-btn').forEach(btn => btn.classList.add('active'));
  openModal('modalReview');
}

function openEditReviewModal(reviewId) {
  const reviews = getStorageItem(STORAGE_KEYS.REVIEWS, []);
  const rev = reviews.find(r => r.id === reviewId);
  if (!rev) return;

  document.getElementById('reviewModalTitle').textContent = 'Edit Review';
  document.getElementById('reviewSessionId').value = rev.sessionId;
  document.getElementById('reviewEditId').value = rev.id;
  document.getElementById('reviewRatingVal').value = rev.rating;
  document.getElementById('reviewComment').value = rev.comment;

  document.querySelectorAll('#starRatingSelect .star-btn').forEach(btn => {
    const btnVal = parseInt(btn.getAttribute('data-val'), 10);
    btn.classList.toggle('active', btnVal <= rev.rating);
  });

  openModal('modalReview');
}

function handleReviewFormSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('reviewEditId').value;
  const sessionId = document.getElementById('reviewSessionId').value;
  const rating = document.getElementById('reviewRatingVal').value;
  const comment = document.getElementById('reviewComment').value;

  if (editId) {
    updateReview(editId, rating, comment);
  } else {
    createReview(sessionId, rating, comment);
  }
}

// ============================================================================
// MODULE 9: SEARCH, FILTER, METRICS & INITIALIZATION
// ============================================================================

function initSearchAndFilters() {
  const searchInput = document.getElementById('skillSearchInput');
  const categoryFilter = document.getElementById('skillCategoryFilter');
  const levelFilter = document.getElementById('skillLevelFilter');

  if (searchInput) searchInput.addEventListener('input', () => renderSkillsGrid());
  if (categoryFilter) categoryFilter.addEventListener('change', () => renderSkillsGrid());
  if (levelFilter) levelFilter.addEventListener('change', () => renderSkillsGrid());
}

function refreshAllViews() {
  renderSkillsGrid();
  renderRequestsView();
  renderSessionsView();
  renderReviewsView();
  updateHeroStats();
}

function updateHeroStats() {
  const skills = getStorageItem(STORAGE_KEYS.SKILLS, []);
  const sessions = getStorageItem(STORAGE_KEYS.SESSIONS, []);
  const reviews = getStorageItem(STORAGE_KEYS.REVIEWS, []);

  const statSkills = document.getElementById('statSkillsCount');
  const statSessions = document.getElementById('statSessionsCount');
  const statRating = document.getElementById('statRatingAvg');

  if (statSkills) statSkills.textContent = `${skills.length}`;
  
  const completedSessions = sessions.filter(s => s.status === 'completed');
  if (statSessions) statSessions.textContent = `${completedSessions.length}`;

  if (statRating) {
    if (reviews.length > 0) {
      const avg = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
      statRating.textContent = `${avg} ★`;
    } else {
      statRating.textContent = `5.0 ★`;
    }
  }
}

/**
 * Seeds realistic campus data for instant presentation and viva testing
 */
function seedDemoData(force = true) {
  if (!force && localStorage.getItem(STORAGE_KEYS.SEEDED)) {
    return;
  }

  const demoUsers = [
    {
      id: 'usr_maya',
      name: 'Maya Chen',
      email: 'maya@campus.edu',
      password: 'password123',
      bio: '3rd year Design student passionate about UI/UX and digital illustration.',
      avatar: 'M',
      joinedAt: new Date(Date.now() - 86400000 * 14).toISOString()
    },
    {
      id: 'usr_liam',
      name: 'Liam Davies',
      email: 'liam@campus.edu',
      password: 'password123',
      bio: 'CS sophomore building fullstack apps and teaching Python scripting.',
      avatar: 'L',
      joinedAt: new Date(Date.now() - 86400000 * 10).toISOString()
    },
    {
      id: 'usr_priya',
      name: 'Priya Sharma',
      email: 'priya@campus.edu',
      password: 'password123',
      bio: 'Media arts major, video editor, and acoustic guitar enthusiast.',
      avatar: 'P',
      joinedAt: new Date(Date.now() - 86400000 * 7).toISOString()
    }
  ];

  const demoSkills = [
    {
      id: 'skl_1',
      title: 'Modern UI/UX Design & Figma Prototyping',
      category: 'Drawing',
      description: 'Learn wireframing, color psychology, and interactive prototyping in Figma from scratch.',
      level: 'Beginner',
      teacherId: 'usr_maya',
      teacherName: 'Maya Chen',
      createdAt: new Date(Date.now() - 86400000 * 12).toISOString()
    },
    {
      id: 'skl_2',
      title: 'Python Automation & Web Scraping',
      category: 'Coding',
      description: 'Automate repetitive tasks, fetch data from websites using BeautifulSoup and Requests.',
      level: 'Intermediate',
      teacherId: 'usr_liam',
      teacherName: 'Liam Davies',
      createdAt: new Date(Date.now() - 86400000 * 9).toISOString()
    },
    {
      id: 'skl_3',
      title: 'Cinematic Video Editing with Premiere Pro',
      category: 'Editing',
      description: 'Pacing, cut techniques, color grading basics, and clean sound design for social reels.',
      level: 'Intermediate',
      teacherId: 'usr_priya',
      teacherName: 'Priya Sharma',
      createdAt: new Date(Date.now() - 86400000 * 6).toISOString()
    },
    {
      id: 'skl_4',
      title: 'Acoustic Guitar Fingerpicking Basics',
      category: 'Music',
      description: 'Chords, rhythm patterns, finger exercises, and learning your first two complete songs.',
      level: 'Beginner',
      teacherId: 'usr_priya',
      teacherName: 'Priya Sharma',
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString()
    }
  ];

  const demoRequests = [
    {
      id: 'req_1',
      skillId: 'skl_1',
      skillTitle: 'Modern UI/UX Design & Figma Prototyping',
      teacherId: 'usr_maya',
      teacherName: 'Maya Chen',
      learnerId: 'usr_liam',
      learnerName: 'Liam Davies',
      preferredDate: '2026-09-20',
      preferredTime: '16:00',
      message: 'Hey Maya! Would love to learn Figma components to design clean interfaces for my coding projects.',
      status: 'accepted',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: 'req_2',
      skillId: 'skl_2',
      skillTitle: 'Python Automation & Web Scraping',
      teacherId: 'usr_liam',
      teacherName: 'Liam Davies',
      learnerId: 'usr_priya',
      learnerName: 'Priya Sharma',
      preferredDate: '2026-09-22',
      preferredTime: '18:00',
      message: 'Hi Liam! Want to automate batch video renaming scripts with Python.',
      status: 'pending',
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
    }
  ];

  const demoSessions = [
    {
      id: 'ses_1',
      requestId: 'req_1',
      skillId: 'skl_1',
      skillTitle: 'Modern UI/UX Design & Figma Prototyping',
      teacherId: 'usr_maya',
      teacherName: 'Maya Chen',
      learnerId: 'usr_liam',
      learnerName: 'Liam Davies',
      date: '2026-09-18',
      time: '16:00',
      status: 'completed',
      notes: 'Covered Figma auto-layout and components.',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: 'ses_2',
      requestId: 'req_demo_upcoming',
      skillId: 'skl_3',
      skillTitle: 'Cinematic Video Editing with Premiere Pro',
      teacherId: 'usr_priya',
      teacherName: 'Priya Sharma',
      learnerId: 'usr_maya',
      learnerName: 'Maya Chen',
      date: '2026-09-24',
      time: '15:30',
      status: 'upcoming',
      notes: 'Planning color wheels & keyframes session.',
      createdAt: new Date().toISOString()
    }
  ];

  const demoReviews = [
    {
      id: 'rev_1',
      sessionId: 'ses_1',
      skillId: 'skl_1',
      skillTitle: 'Modern UI/UX Design & Figma Prototyping',
      teacherId: 'usr_maya',
      teacherName: 'Maya Chen',
      learnerId: 'usr_liam',
      learnerName: 'Liam Davies',
      rating: 5,
      comment: 'Maya was incredible! She walked me through component variants and auto-layout with such clarity.',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
    }
  ];

  setStorageItem(STORAGE_KEYS.USERS, demoUsers);
  setStorageItem(STORAGE_KEYS.SKILLS, demoSkills);
  setStorageItem(STORAGE_KEYS.REQUESTS, demoRequests);
  setStorageItem(STORAGE_KEYS.SESSIONS, demoSessions);
  setStorageItem(STORAGE_KEYS.REVIEWS, demoReviews);
  localStorage.setItem(STORAGE_KEYS.SEEDED, 'true');

  setCurrentUser(demoUsers[0]);

  showToast('Demo data loaded successfully! Logged in as Maya Chen.', 'success');
  refreshAllViews();
}

/**
 * Resets all LocalStorage data cleanly
 */
function resetAllData() {
  if (confirm('Are you sure you want to reset all platform data to clean state?')) {
    localStorage.clear();
    showToast('Platform data reset. Starting clean.', 'info');
    setCurrentUser(null);
    refreshAllViews();
  }
}

// ============================================================================
// SYSTEM BOOTSTRAP
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initModals();
  initStarRatingPicker();
  initSearchAndFilters();

  if (!localStorage.getItem(STORAGE_KEYS.SEEDED)) {
    seedDemoData(true);
  } else {
    renderAuthUI();
    refreshAllViews();
  }

  console.log('SkillBridge initialized: Full CRUD across Users, Skills, Requests, Sessions & Reviews active.');
});
