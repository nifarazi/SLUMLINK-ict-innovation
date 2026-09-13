(function () {
  // Global error handler for audio-related AbortErrors
  window.addEventListener('error', (event) => {
    if (event.message && event.message.includes('play() request was interrupted')) {
      console.warn('🔇 Audio AbortError caught and handled:', event.message);
      event.preventDefault(); // Prevent the error from appearing in console
      return true;
    }
  });

  // Handle unhandled promise rejections for audio
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.name === 'AbortError') {
      console.warn('🔇 Audio AbortError promise rejection caught and handled:', event.reason);
      event.preventDefault();
    }
  });
})();

(function () {
  // Sidebar routing: navigate to Complaint Status when clicked
  const nav = document.querySelector('.nav');
  if (!nav) return;
  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-btn');
    if (!btn) return;
    const target = btn.getAttribute('data-target');
    if (target === '#complaint-status') {
      window.location.href = './complaint-status.html';
      return;
    }
    if (target === '#aid-services') {
      window.location.href = './aid-services.html';
      return;
    }
    if (target === '#qr-code') {
      if (window.__openQrModal) window.__openQrModal();
      return;
    }
    if (target === '#logout') {
      if (window.__openLogoutModal) window.__openLogoutModal();
      return;
    }
    if (target === '#dashboard') {
      window.location.href = './dashboard.html';
      return;
    }
    if (target === '#submit-complaint') {
      window.location.href = './create-complaint.html';
      return;
    }
  });
})();

(function () {
  const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
  const panels = {
    personal: document.getElementById('tab-personal'),
    marital: document.getElementById('tab-marital'),
    children: document.getElementById('tab-children')
  };

  const activate = (key) => {
    // Buttons
    tabButtons.forEach((btn) => {
      const isActive = btn.dataset.tab === key;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
      // Manage tabindex for accessibility
      btn.setAttribute('tabindex', isActive ? '0' : '-1');
    });
    // Panels
    Object.entries(panels).forEach(([k, el]) => {
      if (!el) return;
      if (k === key) {
        el.hidden = false;
      } else {
        el.hidden = true;
      }
    });
  };

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => activate(btn.dataset.tab));
    // Keyboard support: Left/Right arrows
    btn.addEventListener('keydown', (e) => {
      const idx = tabButtons.indexOf(btn);
      if (e.key === 'ArrowRight') {
        const next = tabButtons[(idx + 1) % tabButtons.length];
        next.focus();
        activate(next.dataset.tab);
      } else if (e.key === 'ArrowLeft') {
        const prev = tabButtons[(idx - 1 + tabButtons.length) % tabButtons.length];
        prev.focus();
        activate(prev.dataset.tab);
      }
    });
  });

  // Initialize default tab
  activate('personal');
})();

// Helper functions
function safeJsonParse(raw, fallback){ try { return JSON.parse(raw); } catch { return fallback; } }

// Get current user info
function getCurrentUser() {
  const currentRaw = localStorage.getItem('SLUMLINK_CURRENT_USER');
  return currentRaw ? safeJsonParse(currentRaw, null) : null;
}

// Show success toast for profile updates
function showProfileUpdateToast() {
  // Remove any existing toast
  const existing = document.querySelector('.profile-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'profile-toast';
  toast.innerHTML = [
    '<span class="icon" aria-hidden="true">',
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
        '<path d="M9 16.17 5.83 13l-1.42 1.41L9 19 20.59 7.41 19.17 6z"/>',
      '</svg>',
    '</span>',
    '<div class="toast-content">',
      '<strong>Success</strong>',
      '<div class="subtitle">Profile Information Editted Successfully</div>',
    '</div>'
  ].join('');
  document.body.appendChild(toast);

  // Auto-dismiss after 2.5s
  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => { try { toast.remove(); } catch {} }, 350);
  }, 2500);
}

// Show success toast for member removal submission
function showMemberRemovalSuccessToast() {
  // Remove any existing toast
  const existing = document.querySelector('.profile-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'profile-toast';
  toast.innerHTML = [
    '<span class="icon" aria-hidden="true">',
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
        '<path d="M9 16.17 5.83 13l-1.42 1.41L9 19 20.59 7.41 19.17 6z"/>',
      '</svg>',
    '</span>',
    '<div class="toast-content">',
      '<strong>Success</strong>',
      '<div class="subtitle">Your Request Has Been Sent For Verification</div>',
    '</div>'
  ].join('');
  document.body.appendChild(toast);

  // Auto-dismiss after 2.5s
  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => { try { toast.remove(); } catch {} }, 350);
  }, 2500);
}

// Resolve slum name from area for SLUMLINK_APPLICATIONS
function resolveSlumFromArea(area){
  const a = String(area || '').toLowerCase().trim();
  const clean = a.replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ');
  const map = new Map([
    ['korail','Korail'],
    ['begun bari','Begun Bari'],
    ['begunbari','Begun Bari'],
    ['molla','Molla'],
    ['duaripara','DuariPara'],
    ['duari para','DuariPara'],
    ['kallyanpur','Kallyanpur'],
    ['pora basti','Pora Basti'],
    ['porabasti','Pora Basti'],
    ['pura','Pura'],
    ['nubur','Nubur'],
    ['mannan','Mannan'],
    ['basbari','Basbari'],
    ['chalantika','Chalantika'],
    ['nama para','Nama Para'],
    ['namapara','Nama Para'],
  ]);
  if (map.has(clean)) return map.get(clean);
  for (const [key, val] of map.entries()) { if (clean.includes(key)) return val; }
  return '';
}

// Area data for cascading dropdowns
const AREA_DATA = {
  "Dhaka": {
    "Dhaka (North)": [
      "Korail",
      "Begun Bari",
      "Duaripara",
      "Kallyanpur",
      "Pora Basti",
      "Chalantika",
      "Agargaon",
      "Sattola (Mohakhali)",
      "Mohammadpur",
      "Basbari",
      "Molla"
    ],
    "Dhaka (South)": [
      "Nama Para",
      "Pura",
      "Nubur",
      "Mannan"
    ],
    "Narayanganj": [
      "Bhuigar",
      "Chashara",
      "Fatullah Cluster"
    ],
    "Gazipur": [
      "Tongi Cluster",
      "Board Bazar Cluster"
    ]
  },
  "Chattogram": {
    "Chattogram (City)": ["Halishahar", "Pahartali", "Agrabad Cluster"],
    "Cox's Bazar": ["Teknaf Cluster", "Kutupalong (Nearby)"]
  },
  "Khulna": { "Khulna": ["Rupsha Ghat Cluster", "Khalishpur Cluster"] },
  "Rajshahi": { "Rajshahi": ["Kazla Cluster", "Bornali Cluster"] },
  "Barishal": { "Barishal": ["Nathullabad Cluster", "Battala Cluster"] },
  "Sylhet": { "Sylhet": ["Ambarkhana Cluster", "Subid Bazar Cluster"] },
  "Rangpur": { "Rangpur": ["Jahaj Company Cluster", "Modern Mor Cluster"] },
  "Mymensingh": { "Mymensingh": ["Town Hall Cluster", "Charpara Cluster"] }
};

// Education options for dropdown
const educationOptions = [
  { value: 'None', label: 'None' },
  { value: 'Primary', label: 'Primary' },
  { value: 'Secondary', label: 'Secondary' },
  { value: 'HSC', label: 'HSC' },
  { value: 'Diploma', label: 'Diploma' },
  { value: 'Graduate', label: 'Graduate' },
];

// Skills options for dropdown
const skillsOptions = [
  { value: 'None', label: 'None' },
  { value: 'Tailoring', label: 'Tailoring' },
  { value: 'Embroidery', label: 'Embroidery' },
  { value: 'Housekeeping', label: 'Housekeeping' },
  { value: 'Cooking', label: 'Cooking' },
  { value: 'Caregiving', label: 'Caregiving' },
  { value: 'Delivery', label: 'Delivery' },
  { value: 'Driver', label: 'Driver' },
  { value: 'Rickshaw', label: 'Rickshaw' },
  { value: 'Electric Helper', label: 'Electric Helper' },
  { value: 'Electrician', label: 'Electrician' },
  { value: 'Plumbing Helper', label: 'Plumbing Helper' },
  { value: 'Plumber', label: 'Plumber' },
  { value: 'Masonry Helper', label: 'Masonry Helper' },
  { value: 'Welding Helper', label: 'Welding Helper' },
  { value: 'Welding', label: 'Welding' },
  { value: 'Carpentry', label: 'Carpentry' },
  { value: 'Barbering', label: 'Barbering' },
  { value: 'Beauty Parlor', label: 'Beauty Parlor' },
  { value: 'Mobile Servicing', label: 'Mobile Servicing' },
  { value: 'Electronics Repair', label: 'Electronics Repair' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Typing', label: 'Typing' },
  { value: 'MS Office', label: 'MS Office' },
  { value: 'Data Entry', label: 'Data Entry' },
  { value: 'Tutoring', label: 'Tutoring' },
  { value: 'Security Guard', label: 'Security Guard' },
];

// Income range options for dropdown
const incomeRangeOptions = [
  { value: 'No Income', label: 'No Income' },
  { value: 'Less than ৳3,000', label: 'Less than ৳3,000' },
  { value: '৳3,000 – ৳5,000', label: '৳3,000 – ৳5,000' },
  { value: '৳5,001 – ৳9,999', label: '৳5,001 – ৳9,999' },
  { value: '৳10,000 and above', label: '৳10,000 and above' },
];

// Utility functions for dropdowns
function fillSelectOptions(selectEl, items, placeholder = "Select", currentValue = '') {
  selectEl.innerHTML = "";
  
  let hasCurrentValue = currentValue && currentValue.trim() !== '';
  
  // Add placeholder option
  const opt0 = document.createElement("option");
  opt0.value = hasCurrentValue ? currentValue : "";
  opt0.disabled = !hasCurrentValue;
  opt0.selected = true;
  opt0.textContent = currentValue || placeholder;
  selectEl.appendChild(opt0);

  items.forEach((item) => {
    const opt = document.createElement("option");
    const value = item.value || item;
    const label = item.label || item;
    opt.value = value;
    opt.textContent = label;
    
    // If this option matches the current value, select it instead of placeholder
    if (hasCurrentValue && (value === currentValue || label === currentValue)) {
      opt.selected = true;
      opt0.selected = false;
      opt0.disabled = true;
      opt0.value = "";
    }
    
    selectEl.appendChild(opt);
  });
}

function createDivisionSelect(currentValue = '') {
  const selectEl = document.createElement('select');
  selectEl.className = 'info-input division-select';
  const divisions = Object.keys(AREA_DATA);
  fillSelectOptions(selectEl, divisions, "Select division", currentValue);
  return selectEl;
}

function createDistrictSelect(division = '', currentValue = '') {
  const selectEl = document.createElement('select');
  selectEl.className = 'info-input district-select';
  if (!division) {
    selectEl.disabled = true;
    fillSelectOptions(selectEl, [], "Select district");
  } else {
    const districts = Object.keys(AREA_DATA[division] || {});
    fillSelectOptions(selectEl, districts, "Select district", currentValue);
  }
  return selectEl;
}

function createAreaSelect(division = '', district = '', currentValue = '') {
  const selectEl = document.createElement('select');
  selectEl.className = 'info-input area-select';
  if (!division || !district) {
    selectEl.disabled = true;
    fillSelectOptions(selectEl, [], "Select area");
  } else {
    const areas = (AREA_DATA[division]?.[district] || []);
    fillSelectOptions(selectEl, areas, "Select area", currentValue);
  }
  return selectEl;
}

function setupCascadingDropdowns(divisionEl, districtEl, areaEl) {
  divisionEl.addEventListener('change', () => {
    const division = divisionEl.value;
    if (!division) {
      districtEl.disabled = true;
      areaEl.disabled = true;
      fillSelectOptions(districtEl, [], "Select district");
      fillSelectOptions(areaEl, [], "Select area");
      return;
    }

    const districts = Object.keys(AREA_DATA[division] || {});
    fillSelectOptions(districtEl, districts, "Select district");
    districtEl.disabled = false;

    areaEl.disabled = true;
    fillSelectOptions(areaEl, [], "Select area");
  });

  districtEl.addEventListener('change', () => {
    const division = divisionEl.value;
    const district = districtEl.value;

    if (!division || !district) {
      areaEl.disabled = true;
      fillSelectOptions(areaEl, [], "Select area");
      return;
    }

    const areas = (AREA_DATA[division]?.[district] || []);
    fillSelectOptions(areaEl, areas, "Select area");
    areaEl.disabled = false;
  });
}

// Get current user and application data
function getCurrentUserApp() {
  const currentRaw = localStorage.getItem('SLUMLINK_CURRENT_USER');
  const current = currentRaw ? safeJsonParse(currentRaw, null) : null;
  if (!current) return { current: null, app: null, apps: [], appIndex: -1 };

  const appsRaw = sessionStorage.getItem('SLUMLINK_APPLICATIONS');
  const apps = appsRaw ? safeJsonParse(appsRaw, []) : [];
  const appIndex = apps.findIndex(a => String(a.id || '') === String(current.id || ''));
  const app = appIndex >= 0 ? apps[appIndex] : null;
  
  return { current, app, apps, appIndex };
}

// Save updated application back to localStorage
function saveApplication(apps) {
  sessionStorage.setItem('SLUMLINK_APPLICATIONS', JSON.stringify(apps));
}

// Format date to readable format
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return '—';
  }
}

// Populate profile data from database for the signed-in user
(function(){
  const { current } = getCurrentUserApp();
  if (!current || !current.id) {
    window.location.href = '/src/signin.html?role=dweller';
    return;
  }

  const personalPanel = document.getElementById('tab-personal');
  const maritalPanel = document.getElementById('tab-marital');
  const childrenPanel = document.getElementById('tab-children');
  const personalGrid = personalPanel?.querySelector('.info-grid');
  const spouseList = maritalPanel?.querySelector('.spouse-list');
  const childrenList = childrenPanel?.querySelector('.children-list');

  // Fetch data from backend
  fetch(`/api/slum-dweller/${current.id}`)
    .then(async (r) => {
      if (!r.ok) {
        throw new Error('Failed to fetch profile data');
      }
      const response = await r.json();
      if (response.status === 'success' && response.data) {
        return response.data;
      }
      throw new Error('Invalid response format');
    })
    .then((data) => {
      const resident = data.resident || {};
      const spouses = data.spouses || [];
      const children = data.children || [];

      // Render Personal Information
      if (personalGrid) {
        const rows = [
          { key: 'Full Name', val: resident.full_name || '', editable: false },
          { key: 'Phone Number', val: resident.mobile || '', editable: false, field: 'mobile' },
          { key: 'Gender', val: resident.gender || '', editable: false },
          { key: 'Date of Birth', val: formatDate(resident.dob), editable: false },
          { key: 'NID', val: resident.nid || '', editable: false },
          { key: 'Occupation', val: resident.occupation || '', editable: true, field: 'occupation' },
          { key: 'Education', val: resident.education || '', editable: true, field: 'education' },
          { key: 'Skills 1', val: resident.skills_1 || 'None', editable: true, field: 'skills_1' },
          { key: 'Skills 2', val: resident.skills_2 || 'None', editable: true, field: 'skills_2' },
          { key: 'Income Range', val: resident.income || '', editable: true, field: 'income', type: 'select' },
          { key: 'Area', val: resident.area || '', editable: true, field: 'area' },
          { key: 'District', val: resident.district || '', editable: true, field: 'district' },
          { key: 'Division', val: resident.division || '', editable: true, field: 'division' },
          { key: 'Family Members', val: resident.family_members || '', editable: false },
        ];
        personalGrid.innerHTML = rows.map(r => `
          <div class="info-row" data-field="${r.field || ''}" data-editable="${r.editable}" data-type="${r.type || 'text'}">
            <span class="info-key">${r.key}</span>
            <span class="info-val">${r.val || '—'}</span>
          </div>
        `).join('');
      }

      // Render Marital Information (spouses)
      if (spouseList) {
        if (!spouses.length) {
          spouseList.innerHTML = '<div class="empty">No spouse information available.</div>';
        } else {
          spouseList.innerHTML = spouses.map((s, idx) => `
            <div class="spouse-card" data-spouse-index="${idx}" data-spouse-id="${s.id}">
              <div class="spouse-header">
                <div class="spouse-name">${s.name || 'Spouse ' + (idx + 1)}</div>
                <div class="card-actions">
                  <button class="btn primary edit-spouse-btn" type="button">Edit Profile</button>
                  <button class="btn outlined change-spouse-phone-btn" type="button" data-spouse-id="${s.id}">Change Phone Number</button>
                  <button class="btn primary save-spouse-btn" type="button" hidden>Save</button>
                  <button class="btn outlined cancel-spouse-btn" type="button" hidden>Cancel</button>
                </div>
              </div>
              <div class="info-grid">
                <div class="info-row" data-field="name" data-editable="false"><span class="info-key">Name</span><span class="info-val">${s.name || '—'}</span></div>
                <div class="info-row" data-field="dob" data-editable="false"><span class="info-key">Date of Birth</span><span class="info-val">${formatDate(s.dob)}</span></div>
                <div class="info-row" data-field="gender" data-editable="false"><span class="info-key">Gender</span><span class="info-val">${s.gender || '—'}</span></div>
                <div class="info-row" data-field="nid" data-editable="false"><span class="info-key">NID</span><span class="info-val">${s.nid || '—'}</span></div>
                <div class="info-row" data-field="mobile" data-editable="false"><span class="info-key">Phone Number</span><span class="info-val">${s.mobile || '—'}</span></div>
                <div class="info-row" data-field="education" data-editable="true"><span class="info-key">Education</span><span class="info-val">${s.education || '—'}</span></div>
                <div class="info-row" data-field="job" data-editable="true"><span class="info-key">Occupation</span><span class="info-val">${s.job || '—'}</span></div>
                <div class="info-row" data-field="skills_1" data-editable="true"><span class="info-key">Skills 1</span><span class="info-val">${s.skills_1 || 'None'}</span></div>
                <div class="info-row" data-field="skills_2" data-editable="true"><span class="info-key">Skills 2</span><span class="info-val">${s.skills_2 || 'None'}</span></div>
                <div class="info-row" data-field="income" data-editable="true" data-type="select"><span class="info-key">Income Range</span><span class="info-val">${s.income || '—'}</span></div>
              </div>
            </div>
          `).join('');
        }
      }

      // Render Children Information
      if (childrenList) {
        if (!children.length) {
          childrenList.innerHTML = '<div class="empty">No children information available.</div>';
        } else {
          childrenList.innerHTML = children.map((c, idx) => `
            <div class="child-card" data-child-index="${idx}" data-child-id="${c.id}">
              <div class="child-header">
                <div class="child-name">${c.name || 'Child ' + (idx + 1)}</div>
                <div class="card-actions">
                  <button class="btn primary edit-child-btn" type="button">Edit Profile</button>
                  <button class="btn primary save-child-btn" type="button" hidden>Save</button>
                  <button class="btn outlined cancel-child-btn" type="button" hidden>Cancel</button>
                </div>
              </div>
              <div class="info-grid">
                <div class="info-row" data-field="name" data-editable="false"><span class="info-key">Name</span><span class="info-val">${c.name || '—'}</span></div>
                <div class="info-row" data-field="dob" data-editable="false"><span class="info-key">Date of Birth</span><span class="info-val">${formatDate(c.dob)}</span></div>
                <div class="info-row" data-field="gender" data-editable="false"><span class="info-key">Gender</span><span class="info-val">${c.gender || '—'}</span></div>
                <div class="info-row" data-field="birth_certificate_number" data-editable="false"><span class="info-key">Birth Certificate Number</span><span class="info-val">${c.birth_certificate_number || '—'}</span></div>
                <div class="info-row" data-field="education" data-editable="true"><span class="info-key">Education</span><span class="info-val">${c.education || '—'}</span></div>
                <div class="info-row" data-field="job" data-editable="true"><span class="info-key">Occupation</span><span class="info-val">${c.job || '—'}</span></div>
                <div class="info-row" data-field="skills_1" data-editable="true"><span class="info-key">Skills 1</span><span class="info-val">${c.skills_1 || 'None'}</span></div>
                <div class="info-row" data-field="skills_2" data-editable="true"><span class="info-key">Skills 2</span><span class="info-val">${c.skills_2 || 'None'}</span></div>
                <div class="info-row" data-field="income" data-editable="true" data-type="select"><span class="info-key">Income Range</span><span class="info-val">${c.income || '—'}</span></div>
                <div class="info-row" data-field="preferred_job" data-editable="true"><span class="info-key">Preferred Job</span><span class="info-val">${c.preferred_job || '—'}</span></div>
              </div>
            </div>
          `).join('');
        }
      }

      // Store fetched data for edit functionality
      window.__profileData = {
        resident,
        spouses,
        children
      };
      
      console.log('✅ Profile data loaded successfully:', {
        resident: resident.full_name,
        spousesCount: spouses.length,
        childrenCount: children.length
      });
    })
    .catch((err) => {
      console.error('Failed to load profile data:', err);
      
      // Show error message to user
      if (personalGrid) {
        personalGrid.innerHTML = '<div class="empty" style="color: #d32f2f;">Failed to load profile data. Please try again later.</div>';
      }
      if (spouseList) {
        spouseList.innerHTML = '<div class="empty" style="color: #d32f2f;">Failed to load spouse data.</div>';
      }
      if (childrenList) {
        childrenList.innerHTML = '<div class="empty" style="color: #d32f2f;">Failed to load children data.</div>';
      }
    });
})();

// Edit Profile logic for Personal Information
(function () {
  const personalPanel = document.getElementById('tab-personal');
  if (!personalPanel) return;

  const grid = personalPanel.querySelector('.info-grid');
  const editBtn = document.getElementById('editProfileBtn');
  const saveBtn = document.getElementById('saveProfileBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');

  if (!grid || !editBtn || !saveBtn || !cancelBtn) return;

  let original = {}; // store original values during edit
  let editing = false;

  const enterEdit = () => {
    if (editing) return;
    editing = true;
    original = {};

    const rows = grid.querySelectorAll('.info-row');
    rows.forEach((row) => {
      const valEl = row.querySelector('.info-val');
      if (!valEl) return;
      const field = row.dataset.field || '';
      const isEditable = row.dataset.editable === 'true';
      const type = row.dataset.type || 'text';
      const value = (valEl.textContent || '').trim();
      original[field] = value === '—' ? '' : value;

      if (isEditable) {
        let inputEl;
        if (type === 'select') {
          inputEl = document.createElement('select');
          inputEl.className = 'info-input';
          inputEl.innerHTML = incomeRangeOptions.map(opt => 
            `<option value="${opt.value}" ${(original[field] === opt.value || original[field] === opt.label) ? 'selected' : ''}>${opt.label}</option>`
          ).join('');
        } else if (field === 'division') {
          inputEl = createDivisionSelect(original[field]);
          inputEl.setAttribute('data-field', 'division');
        } else if (field === 'district') {
          inputEl = createDistrictSelect('', original[field]);
          inputEl.setAttribute('data-field', 'district');
        } else if (field === 'area') {
          inputEl = createAreaSelect('', '', original[field]);
          inputEl.setAttribute('data-field', 'area');
        } else if (field === 'education') {
          inputEl = document.createElement('select');
          inputEl.className = 'info-input';
          const currentEducation = original[field] || '';
          fillSelectOptions(inputEl, educationOptions, "Select education", currentEducation);
        } else if (field === 'skills_1') {
          inputEl = document.createElement('select');
          inputEl.className = 'info-input';
          inputEl.setAttribute('data-skill-type', 'skill1');
          const currentSkill1 = original[field] || '';
          fillSelectOptions(inputEl, skillsOptions, "Select skill", currentSkill1);
        } else if (field === 'skills_2') {
          inputEl = document.createElement('select');
          inputEl.className = 'info-input';
          inputEl.setAttribute('data-skill-type', 'skill2');
          const currentSkill2 = original[field] || '';
          fillSelectOptions(inputEl, skillsOptions, "Select skill", currentSkill2);
        } else {
          inputEl = document.createElement('input');
          inputEl.className = 'info-input';
          inputEl.type = field === 'mobile' ? 'tel' : 'text';
          inputEl.value = original[field];
        }
        valEl.replaceWith(inputEl);
      }
    });

    // Setup cascading dropdowns and skill validation after all fields are created
    const divisionEl = grid.querySelector('.division-select');
    const districtEl = grid.querySelector('.district-select');
    const areaEl = grid.querySelector('.area-select');
    
    if (divisionEl && districtEl && areaEl) {
      // Restore the cascading state based on current values
      const currentDivision = original.division;
      const currentDistrict = original.district;
      const currentArea = original.area;
      
      if (currentDivision) {
        // Update district options
        const districts = Object.keys(AREA_DATA[currentDivision] || {});
        fillSelectOptions(districtEl, districts, "Select district", currentDistrict);
        districtEl.disabled = false;
        
        if (currentDistrict) {
          // Update area options
          const areas = (AREA_DATA[currentDivision]?.[currentDistrict] || []);
          fillSelectOptions(areaEl, areas, "Select area", currentArea);
          areaEl.disabled = false;
        }
      }
      
      setupCascadingDropdowns(divisionEl, districtEl, areaEl);
    }
    
    // Setup skill validation
    const skill1El = grid.querySelector('[data-skill-type="skill1"]');
    const skill2El = grid.querySelector('[data-skill-type="skill2"]');
    
    if (skill1El && skill2El) {
      const validateSkills = () => {
        const val1 = skill1El.value;
        const val2 = skill2El.value;
        if (val1 && val2 && val1 === val2 && val1 !== 'None') {
          skill2El.setCustomValidity('Skill 1 and Skill 2 cannot be the same');
        } else {
          skill1El.setCustomValidity('');
          skill2El.setCustomValidity('');
        }
      };
      
      skill1El.addEventListener('change', validateSkills);
      skill2El.addEventListener('change', validateSkills);
    }

    // Toggle buttons
    editBtn.hidden = true;
    saveBtn.hidden = false;
    cancelBtn.hidden = false;
  };

  const exitEdit = async (applyChanges) => {
    if (!editing) return;
    
    const rows = grid.querySelectorAll('.info-row');
    const newValues = {};
    
    rows.forEach((row) => {
      const field = row.dataset.field || '';
      const isEditable = row.dataset.editable === 'true';
      const currentField = row.querySelector('.info-input');

      const span = document.createElement('span');
      span.className = 'info-val';
      
      if (applyChanges && currentField && isEditable) {
        const newVal = currentField.value.trim();
        const originalVal = original[field] || '';
        
        // Only include in newValues if the value has actually changed
        if (newVal !== originalVal && newVal !== '') {
          newValues[field] = newVal;
        }
        
        // Display the new value or fall back to original
        const displayVal = newVal !== '' ? newVal : originalVal;
        span.textContent = displayVal || '—';
      } else {
        span.textContent = original[field] || '—';
      }
      
      if (currentField) currentField.replaceWith(span);
    });

    // Save to backend API if applying changes
    if (applyChanges && Object.keys(newValues).length > 0) {
      try {
        const currentUser = getCurrentUser();
        if (!currentUser || !currentUser.slum_code) {
          throw new Error('User not authenticated');
        }

        const response = await fetch(`/api/slum-dweller/${currentUser.slum_code}/personal`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newValues)
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to update personal information');
        }

        showProfileUpdateToast();
      } catch (error) {
        console.error('Error updating personal information:', error);
        alert('Failed to update personal information: ' + error.message);
        // Revert changes on error
        rows.forEach((row) => {
          const span = row.querySelector('.info-val');
          const field = row.dataset.field || '';
          if (span) {
            span.textContent = original[field] || '—';
          }
        });
      }
    }

    // Toggle buttons back
    editBtn.hidden = false;
    saveBtn.hidden = true;
    cancelBtn.hidden = true;
    editing = false;
    original = {};
  };

  editBtn.addEventListener('click', enterEdit);
  saveBtn.addEventListener('click', () => exitEdit(true));
  cancelBtn.addEventListener('click', () => exitEdit(false));
})();

// Edit Profile logic for Spouse Information
(function () {
  const maritalPanel = document.getElementById('tab-marital');
  if (!maritalPanel) return;

  const spouseList = maritalPanel.querySelector('.spouse-list');
  if (!spouseList) return;

  spouseList.addEventListener('click', async (e) => {
    const card = e.target.closest('.spouse-card');
    if (!card) return;
    const spouseIndex = parseInt(card.dataset.spouseIndex, 10);
    
    const editBtn = card.querySelector('.edit-spouse-btn');
    const saveBtn = card.querySelector('.save-spouse-btn');
    const cancelBtn = card.querySelector('.cancel-spouse-btn');
    const grid = card.querySelector('.info-grid');

    if (e.target.closest('.edit-spouse-btn')) {
      // Enter edit mode
      const original = {};
      const rows = grid.querySelectorAll('.info-row');
      
      rows.forEach((row) => {
        const valEl = row.querySelector('.info-val');
        if (!valEl) return;
        const field = row.dataset.field || '';
        const isEditable = row.dataset.editable === 'true';
        const type = row.dataset.type || 'text';
        const value = (valEl.textContent || '').trim();
        original[field] = value === '—' ? '' : value;

        if (isEditable) {
          let inputEl;
          if (type === 'select') {
            inputEl = document.createElement('select');
            inputEl.className = 'info-input';
            inputEl.innerHTML = incomeRangeOptions.map(opt => 
              `<option value="${opt.value}" ${(original[field] === opt.value || original[field] === opt.label) ? 'selected' : ''}>${opt.label}</option>`
            ).join('');
          } else if (field === 'education') {
            inputEl = document.createElement('select');
            inputEl.className = 'info-input';
            const currentEducation = original[field] || '';
            fillSelectOptions(inputEl, educationOptions, "Select education", currentEducation);
          } else if (field === 'skills_1') {
            inputEl = document.createElement('select');
            inputEl.className = 'info-input spouse-skill-1';
            const currentSkill1 = original[field] || '';
            fillSelectOptions(inputEl, skillsOptions, "Select skill", currentSkill1);
          } else if (field === 'skills_2') {
            inputEl = document.createElement('select');
            inputEl.className = 'info-input spouse-skill-2';
            const currentSkill2 = original[field] || '';
            fillSelectOptions(inputEl, skillsOptions, "Select skill", currentSkill2);
          } else {
            inputEl = document.createElement('input');
            inputEl.className = 'info-input';
            inputEl.type = field === 'mobile' ? 'tel' : 'text';
            inputEl.value = original[field];
          }
          valEl.replaceWith(inputEl);
        }
      });

      // Setup skill validation for spouse
      const spouseSkill1 = card.querySelector('.spouse-skill-1');
      const spouseSkill2 = card.querySelector('.spouse-skill-2');
      
      if (spouseSkill1 && spouseSkill2) {
        const validateSpouseSkills = () => {
          const val1 = spouseSkill1.value;
          const val2 = spouseSkill2.value;
          if (val1 && val2 && val1 === val2 && val1 !== 'None') {
            spouseSkill2.setCustomValidity('Skill 1 and Skill 2 cannot be the same');
          } else {
            spouseSkill1.setCustomValidity('');
            spouseSkill2.setCustomValidity('');
          }
        };
        
        spouseSkill1.addEventListener('change', validateSpouseSkills);
        spouseSkill2.addEventListener('change', validateSpouseSkills);
      }

      card._original = original;
      editBtn.hidden = true;
      saveBtn.hidden = false;
      cancelBtn.hidden = false;
    }

    if (e.target.closest('.save-spouse-btn')) {
      // Save changes
      const rows = grid.querySelectorAll('.info-row');
      const newValues = {};
      
      rows.forEach((row) => {
        const field = row.dataset.field || '';
        const isEditable = row.dataset.editable === 'true';
        const currentField = row.querySelector('.info-input');

        const span = document.createElement('span');
        span.className = 'info-val';
        
        if (currentField && isEditable) {
          const newVal = currentField.value.trim();
          const originalVal = (card._original && card._original[field]) || '';
          
          // Only include in newValues if the value has actually changed
          if (newVal !== originalVal && newVal !== '') {
            newValues[field] = newVal;
          }
          
          // Display the new value or fall back to original
          const displayVal = newVal !== '' ? newVal : originalVal;
          span.textContent = displayVal || '—';
        } else {
          span.textContent = (card._original && card._original[field]) || '—';
        }
        
        if (currentField) currentField.replaceWith(span);
      });

      // Save to backend API
      if (Object.keys(newValues).length > 0) {
        try {
          const currentUser = getCurrentUser();
          if (!currentUser || !currentUser.slum_code) {
            throw new Error('User not authenticated');
          }

          // We need to get the actual spouse ID from the card data attribute
          const actualSpouseId = card.dataset.spouseId;
          if (!actualSpouseId) {
            throw new Error('Spouse ID not found');
          }

          const response = await fetch(`/api/slum-dweller/${currentUser.slum_code}/spouse/${actualSpouseId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(newValues)
          });

          const result = await response.json();
          
          if (!response.ok) {
            throw new Error(result.message || 'Failed to update spouse information');
          }

          showProfileUpdateToast();
        } catch (error) {
          console.error('Error updating spouse information:', error);
          alert('Failed to update spouse information: ' + error.message);
          // Revert changes on error
          const rows = grid.querySelectorAll('.info-row');
          rows.forEach((row) => {
            const span = row.querySelector('.info-val');
            const field = row.dataset.field || '';
            if (span) {
              span.textContent = (card._original && card._original[field]) || '—';
            }
          });
        }
      }

      editBtn.hidden = false;
      saveBtn.hidden = true;
      cancelBtn.hidden = true;
      delete card._original;
    }

    if (e.target.closest('.cancel-spouse-btn')) {
      // Cancel - restore original values
      const rows = grid.querySelectorAll('.info-row');
      
      rows.forEach((row) => {
        const field = row.dataset.field || '';
        const currentField = row.querySelector('.info-input');

        if (currentField) {
          const span = document.createElement('span');
          span.className = 'info-val';
          span.textContent = (card._original && card._original[field]) || '—';
          currentField.replaceWith(span);
        }
      });

      editBtn.hidden = false;
      saveBtn.hidden = true;
      cancelBtn.hidden = true;
      delete card._original;
    }
  });
})();

// Edit Profile logic for Children Information
(function () {
  const childrenPanel = document.getElementById('tab-children');
  if (!childrenPanel) return;

  const childrenList = childrenPanel.querySelector('.children-list');
  if (!childrenList) return;

  childrenList.addEventListener('click', async (e) => {
    const card = e.target.closest('.child-card');
    if (!card) return;
    const childIndex = parseInt(card.dataset.childIndex, 10);
    
    const editBtn = card.querySelector('.edit-child-btn');
    const saveBtn = card.querySelector('.save-child-btn');
    const cancelBtn = card.querySelector('.cancel-child-btn');
    const grid = card.querySelector('.info-grid');

    if (e.target.closest('.edit-child-btn')) {
      // Enter edit mode
      const original = {};
      const rows = grid.querySelectorAll('.info-row');
      
      rows.forEach((row) => {
        const valEl = row.querySelector('.info-val');
        if (!valEl) return;
        const field = row.dataset.field || '';
        const isEditable = row.dataset.editable === 'true';
        const type = row.dataset.type || 'text';
        const value = (valEl.textContent || '').trim();
        original[field] = value === '—' ? '' : value;

        if (isEditable) {
          let inputEl;
          if (type === 'select') {
            inputEl = document.createElement('select');
            inputEl.className = 'info-input';
            inputEl.innerHTML = incomeRangeOptions.map(opt => 
              `<option value="${opt.value}" ${(original[field] === opt.value || original[field] === opt.label) ? 'selected' : ''}>${opt.label}</option>`
            ).join('');
          } else if (field === 'education') {
            inputEl = document.createElement('select');
            inputEl.className = 'info-input';
            const currentEducation = original[field] || '';
            fillSelectOptions(inputEl, educationOptions, "Select education", currentEducation);
          } else if (field === 'skills_1') {
            inputEl = document.createElement('select');
            inputEl.className = 'info-input child-skill-1';
            const currentSkill1 = original[field] || '';
            fillSelectOptions(inputEl, skillsOptions, "Select skill", currentSkill1);
          } else if (field === 'skills_2') {
            inputEl = document.createElement('select');
            inputEl.className = 'info-input child-skill-2';
            const currentSkill2 = original[field] || '';
            fillSelectOptions(inputEl, skillsOptions, "Select skill", currentSkill2);
          } else {
            inputEl = document.createElement('input');
            inputEl.className = 'info-input';
            inputEl.type = 'text';
            inputEl.value = original[field];
          }
          valEl.replaceWith(inputEl);
        }
      });

      // Setup skill validation for children
      const childSkill1 = card.querySelector('.child-skill-1');
      const childSkill2 = card.querySelector('.child-skill-2');
      
      if (childSkill1 && childSkill2) {
        const validateChildSkills = () => {
          const val1 = childSkill1.value;
          const val2 = childSkill2.value;
          if (val1 && val2 && val1 === val2 && val1 !== 'None') {
            childSkill2.setCustomValidity('Skill 1 and Skill 2 cannot be the same');
          } else {
            childSkill1.setCustomValidity('');
            childSkill2.setCustomValidity('');
          }
        };
        
        childSkill1.addEventListener('change', validateChildSkills);
        childSkill2.addEventListener('change', validateChildSkills);
      }

      card._original = original;
      editBtn.hidden = true;
      saveBtn.hidden = false;
      cancelBtn.hidden = false;
    }

    if (e.target.closest('.save-child-btn')) {
      // Save changes
      const rows = grid.querySelectorAll('.info-row');
      const newValues = {};
      
      rows.forEach((row) => {
        const field = row.dataset.field || '';
        const isEditable = row.dataset.editable === 'true';
        const currentField = row.querySelector('.info-input');

        const span = document.createElement('span');
        span.className = 'info-val';
        
        if (currentField && isEditable) {
          const newVal = currentField.value.trim();
          const originalVal = (card._original && card._original[field]) || '';
          
          // Only include in newValues if the value has actually changed
          if (newVal !== originalVal && newVal !== '') {
            newValues[field] = newVal;
          }
          
          // Display the new value or fall back to original
          const displayVal = newVal !== '' ? newVal : originalVal;
          span.textContent = displayVal || '—';
        } else {
          span.textContent = (card._original && card._original[field]) || '—';
        }
        
        if (currentField) currentField.replaceWith(span);
      });

      // Save to backend API
      if (Object.keys(newValues).length > 0) {
        try {
          const currentUser = getCurrentUser();
          if (!currentUser || !currentUser.slum_code) {
            throw new Error('User not authenticated');
          }

          // We need to get the actual child ID from the card data attribute
          const actualChildId = card.dataset.childId;
          if (!actualChildId) {
            throw new Error('Child ID not found');
          }

          const response = await fetch(`/api/slum-dweller/${currentUser.slum_code}/child/${actualChildId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(newValues)
          });

          const result = await response.json();
          
          if (!response.ok) {
            throw new Error(result.message || 'Failed to update child information');
          }

          showProfileUpdateToast();
        } catch (error) {
          console.error('Error updating child information:', error);
          alert('Failed to update child information: ' + error.message);
          // Revert changes on error
          const rows = grid.querySelectorAll('.info-row');
          rows.forEach((row) => {
            const span = row.querySelector('.info-val');
            const field = row.dataset.field || '';
            if (span) {
              span.textContent = (card._original && card._original[field]) || '—';
            }
          });
        }
      }

      editBtn.hidden = false;
      saveBtn.hidden = true;
      cancelBtn.hidden = true;
      delete card._original;
    }

    if (e.target.closest('.cancel-child-btn')) {
      // Cancel - restore original values
      const rows = grid.querySelectorAll('.info-row');
      
      rows.forEach((row) => {
        const field = row.dataset.field || '';
        const currentField = row.querySelector('.info-input');

        if (currentField) {
          const span = document.createElement('span');
          span.className = 'info-val';
          span.textContent = (card._original && card._original[field]) || '—';
          currentField.replaceWith(span);
        }
      });

      editBtn.hidden = false;
      saveBtn.hidden = true;
      cancelBtn.hidden = true;
      delete card._original;
    }
  });
})();

// Change Password Modal Logic
(function () {
  const modal = document.getElementById('changePasswordModal');
  const openBtn = document.getElementById('changePasswordBtn');
  const closeBtn = document.getElementById('closePasswordModal');
  const cancelBtn = document.getElementById('cancelPasswordBtn');
  const form = document.getElementById('changePasswordForm');
  const errorEl = document.getElementById('passwordError');
  const successEl = document.getElementById('passwordSuccess');

  if (!modal || !openBtn || !form) return;

  const openModal = () => {
    modal.hidden = false;
    form.reset();
    errorEl.hidden = true;
    successEl.hidden = true;
    document.getElementById('currentPassword')?.focus();
  };

  const closeModal = () => {
    modal.hidden = true;
    form.reset();
    errorEl.hidden = true;
    successEl.hidden = true;
  };

  openBtn.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  // Toggle password visibility with checkboxes
  modal.querySelectorAll('.view-pwd-checkbox').forEach(checkbox => {
    const targetId = checkbox.getAttribute('data-target');
    const input = document.getElementById(targetId);
    if (!input) return;

    checkbox.addEventListener('change', () => {
      input.type = checkbox.checked ? 'text' : 'password';
    });
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    successEl.hidden = true;

    const currentPassword = form.currentPassword.value.trim();
    const newPassword = form.newPassword.value.trim();
    const confirmPassword = form.confirmPassword.value.trim();

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      errorEl.textContent = 'Please fill in all fields.';
      errorEl.hidden = false;
      return;
    }

    if (newPassword.length < 6) {
      errorEl.textContent = 'New password must be at least 6 characters.';
      errorEl.hidden = false;
      return;
    }

    if (newPassword !== confirmPassword) {
      errorEl.textContent = 'New password and confirmation do not match.';
      errorEl.hidden = false;
      return;
    }

    if (newPassword === currentPassword) {
      errorEl.textContent = 'New password must be different from current password.';
      errorEl.hidden = false;
      return;
    }

    // Get current user
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.slum_code) {
      errorEl.textContent = 'User not found. Please sign in again.';
      errorEl.hidden = false;
      return;
    }

    try {
      // Disable form during submission
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Changing...';

      // Send password change request to backend
      const response = await fetch(`/api/slum-dweller/${currentUser.slum_code}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to change password');
      }

      // Success - show success message and auto logout
      form.reset();
      closeModal();
      showPasswordChangeSuccessAndLogout();

    } catch (error) {
      console.error('Error changing password:', error);
      
      // Check for specific error messages
      if (error.message.includes('Current password is incorrect') || 
          error.message.includes('current password')) {
        errorEl.textContent = 'Current password is incorrect.';
      } else if (error.message.includes('same as current') || 
                 error.message.includes('must be different')) {
        errorEl.textContent = 'New password must be different from current password.';
      } else {
        errorEl.textContent = error.message || 'Failed to change password. Please try again.';
      }
      errorEl.hidden = false;
    } finally {
      // Re-enable form
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Password';
      }
    }
  });
})();

// Show success popup for password change and auto logout
function showPasswordChangeSuccessAndLogout() {
  // Remove any existing popup
  const existing = document.querySelector('.password-success-popup');
  if (existing) existing.remove();

  // Create popup modal
  const popup = document.createElement('div');
  popup.className = 'password-success-popup';
  popup.innerHTML = [
    '<div class="popup-content">',
      '<div class="success-icon">',
        '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">',
          '<path d="M9 16.17 5.83 13l-1.42 1.41L9 19 20.59 7.41 19.17 6z" fill="#4caf50"/>',
        '</svg>',
      '</div>',
      '<h2>Password Changed Successfully</h2>',
      '<p>Logging Out....</p>',
    '</div>'
  ].join('');
  
  document.body.appendChild(popup);

  // Style the popup
  popup.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    font-family: 'Poppins', system-ui, sans-serif;
  `;

  const popupContent = popup.querySelector('.popup-content');
  popupContent.style.cssText = `
    background: white;
    padding: 40px 30px;
    border-radius: 12px;
    text-align: center;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    max-width: 400px;
    width: 90%;
  `;

  const successIcon = popup.querySelector('.success-icon');
  successIcon.style.cssText = `
    width: 60px;
    height: 60px;
    margin: 0 auto 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #e8f5e8;
    border-radius: 50%;
  `;

  const successIconSvg = popup.querySelector('.success-icon svg');
  successIconSvg.style.cssText = `
    width: 30px;
    height: 30px;
  `;

  const heading = popup.querySelector('h2');
  heading.style.cssText = `
    margin: 0 0 15px 0;
    font-size: 22px;
    font-weight: 600;
    color: #333;
  `;

  const text = popup.querySelector('p');
  text.style.cssText = `
    margin: 0;
    font-size: 16px;
    color: #666;
  `;

  // Perform logout after showing the popup
  setTimeout(() => {
    try { 
      // Clear user data
      localStorage.removeItem('SLUMLINK_CURRENT_USER');
      sessionStorage.removeItem('SLUMLINK_APPLICATIONS');
    } catch {} 
    
    // Redirect to home page
    window.location.href = '/index.html';
  }, 2000);
}

// Toast notification function
function showToast(title, message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'success') {
    toast.style.background = '#4CAF50';
  } else if (type === 'error') {
    toast.style.background = '#f44336';
  }
  
  toast.innerHTML = `
    <div class="toast-title">${title}</div>
    <div class="toast-message">${message}</div>
  `;
  
  document.body.appendChild(toast);
  
  // Remove toast after 4 seconds
  setTimeout(() => {
    if (toast && toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 4000);
}

// Edit Member Modal Logic
(function () {
  const modal = document.getElementById('editMemberModal');
  const openBtn = document.getElementById('editMemberBtn');
  const closeBtn = document.getElementById('closeEditMemberModal');
  const cancelBtn = document.getElementById('cancelEditMemberBtn');
  const form = document.getElementById('editMemberForm');
  const errorEl = document.getElementById('memberError');
  
  const memberActionSelect = document.getElementById('memberAction');
  const removeMembersSection = document.getElementById('removeMembersSection');
  const addMembersSection = document.getElementById('addMembersSection');
  const spouseRemovalList = document.getElementById('spouseRemovalList');
  const childrenRemovalList = document.getElementById('childrenRemovalList');
  
  // Add members elements
  const spouseAddCount = document.getElementById('spouseAddCount');
  const childrenAddCount = document.getElementById('childrenAddCount');
  const spouseAddForms = document.getElementById('spouseAddForms');
  const childrenAddForms = document.getElementById('childrenAddForms');

  if (!modal || !openBtn || !form) return;

  // Check if user has pending edit member submission
  function hasPendingEditMemberSubmission() {
    const { app } = getCurrentUserApp();
    return app?.data?.pendingEditMember === true;
  }

  // Disable/Enable Edit Member button based on pending status
  function updateEditMemberButtonState() {
    if (hasPendingEditMemberSubmission()) {
      openBtn.disabled = true;
      openBtn.classList.add('btn-disabled');
      openBtn.title = 'You have a pending edit member request';
    } else {
      openBtn.disabled = false;
      openBtn.classList.remove('btn-disabled');
      openBtn.title = '';
    }
  }

  // Initial check on page load
  updateEditMemberButtonState();

  // Get current user's spouse and children data
  function getMemberData() {
    // Use the data fetched from backend API stored in window.__profileData
    // instead of stale localStorage data
    if (window.__profileData) {
      const spouses = window.__profileData.spouses || [];
      const children = window.__profileData.children || [];
      return { spouses, children };
    }
    
    // Fallback to localStorage data if API data not available yet
    const { app } = getCurrentUserApp();
    const spouses = app?.data?.marital?.spouses || [];
    const children = app?.data?.children?.children || [];
    return { spouses, children };
  }

  // Create spouse removal card
  function createSpouseRemovalCard(spouse, index) {
    const isPendingRemove = spouse.status === 'pending_remove';
    const card = document.createElement('div');
    card.className = `member-removal-card ${isPendingRemove ? 'pending-remove' : ''}`;
    
    if (isPendingRemove) {
      // Simplified view for pending removal - only show name, phone, and status
      card.innerHTML = `
        <div class="member-removal-card-header">
          <input type="checkbox" 
                 class="member-removal-checkbox spouse-checkbox" 
                 data-spouse-id="${spouse.id}" 
                 checked disabled />
          <div class="member-info">
            <div class="member-name">${spouse.name || 'N/A'}</div>
            <div class="member-detail">Phone: ${spouse.mobile || 'N/A'}</div>
            <div class="member-status">Requested for Removal</div>
          </div>
        </div>
      `;
    } else {
      // Full view for active members with file upload
      card.innerHTML = `
        <div class="member-removal-card-header">
          <input type="checkbox" 
                 class="member-removal-checkbox spouse-checkbox" 
                 data-spouse-id="${spouse.id}" />
          <div class="member-info">
            <div class="member-name">${spouse.name || 'N/A'}</div>
            <div class="member-detail">Phone: ${spouse.mobile || 'N/A'}</div>
          </div>
        </div>
        <div class="removal-file-section">
          <label class="removal-file-label">Divorce Certificate (Required)</label>
          <input type="file" 
                 class="removal-file-input" 
                 name="spouse_${spouse.id}_certificate" 
                 accept=".pdf,.jpg,.jpeg,.png" />
        </div>
      `;
    }
    
    return card;
  }

  // Create children removal card
  function createChildRemovalCard(child, index) {
    const isPendingRemove = child.status === 'pending_remove';
    const card = document.createElement('div');
    card.className = `member-removal-card ${isPendingRemove ? 'pending-remove' : ''}`;
    
    if (isPendingRemove) {
      // Simplified view for pending removal - only show name, birth certificate, and status
      card.innerHTML = `
        <div class="member-removal-card-header">
          <input type="checkbox" 
                 class="member-removal-checkbox child-checkbox" 
                 data-child-id="${child.id}" 
                 checked disabled />
          <div class="member-info">
            <div class="member-name">${child.name || 'N/A'}</div>
            <div class="member-detail">Birth Certificate: ${child.birth_certificate_number || 'N/A'}</div>
            <div class="member-status">Requested for Removal</div>
          </div>
        </div>
      `;
    } else {
      // Full view for active members with file upload
      card.innerHTML = `
        <div class="member-removal-card-header">
          <input type="checkbox" 
                 class="member-removal-checkbox child-checkbox" 
                 data-child-id="${child.id}" />
          <div class="member-info">
            <div class="member-name">${child.name || 'N/A'}</div>
            <div class="member-detail">Birth Certificate: ${child.birth_certificate_number || 'N/A'}</div>
          </div>
        </div>
        <div class="removal-file-section">
          <label class="removal-file-label">Death Certificate (Required)</label>
          <input type="file" 
                 class="removal-file-input" 
                 name="child_${child.id}_certificate" 
                 accept=".pdf,.jpg,.jpeg,.png" />
        </div>
      `;
    }
    
    return card;
  }

  // Populate spouse removal list
  function populateSpouseRemovalList() {
    const { spouses } = getMemberData();
    
    console.log('🔍 Populating spouse removal list:', spouses);
    
    spouseRemovalList.innerHTML = '';
    
    if (spouses.length === 0) {
      spouseRemovalList.innerHTML = '<div class="no-members">No spouses to remove</div>';
      return;
    }
    
    spouses.forEach((spouse, index) => {
      const card = createSpouseRemovalCard(spouse, index);
      spouseRemovalList.appendChild(card);
    });
    
    // Add checkbox event listeners
    const checkboxes = spouseRemovalList.querySelectorAll('.spouse-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', handleSpouseCheckboxChange);
    });
  }

  // Populate children removal list
  function populateChildrenRemovalList() {
    const { children } = getMemberData();
    
    console.log('🔍 Populating children removal list:', children);
    
    childrenRemovalList.innerHTML = '';
    
    if (children.length === 0) {
      childrenRemovalList.innerHTML = '<div class="no-members">No children to remove</div>';
      return;
    }
    
    children.forEach((child, index) => {
      const card = createChildRemovalCard(child, index);
      childrenRemovalList.appendChild(card);
    });
    
    // Add checkbox event listeners
    const checkboxes = childrenRemovalList.querySelectorAll('.child-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', handleChildCheckboxChange);
    });
  }

  // Handle spouse checkbox change
  function handleSpouseCheckboxChange(e) {
    const checkbox = e.target;
    const card = checkbox.closest('.member-removal-card');
    const fileSection = card.querySelector('.removal-file-section');
    
    if (checkbox.checked) {
      fileSection.classList.add('show');
    } else {
      fileSection.classList.remove('show');
      // Clear file input when unchecked
      const fileInput = fileSection.querySelector('.removal-file-input');
      if (fileInput) fileInput.value = '';
    }
  }

  // Handle child checkbox change
  function handleChildCheckboxChange(e) {
    const checkbox = e.target;
    const card = checkbox.closest('.member-removal-card');
    const fileSection = card.querySelector('.removal-file-section');
    
    if (checkbox.checked) {
      fileSection.classList.add('show');
    } else {
      fileSection.classList.remove('show');
      // Clear file input when unchecked
      const fileInput = fileSection.querySelector('.removal-file-input');
      if (fileInput) fileInput.value = '';
    }
  }

  // =====================
  // ADD MEMBERS FUNCTIONS
  // =====================

  // Create spouse add form
  function createSpouseAddForm(index) {
    const card = document.createElement('div');
    card.className = 'add-card';
    card.innerHTML = `
      <h4>Spouse ${index}</h4>
      <div class="modal-field">
        <label><span>Full Name</span></label>
        <input type="text" name="spouse_add_${index}_name" placeholder="Enter full name" />
      </div>
      <div class="modal-field">
        <label><span>Date of Birth</span></label>
        <input type="date" name="spouse_add_${index}_dob" />
      </div>
      <div class="modal-field">
        <label><span>Gender</span></label>
        <select name="spouse_add_${index}_gender">
          <option value="">Select gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="modal-field">
        <label><span>NID</span></label>
        <input type="text" name="spouse_add_${index}_nid" placeholder="Enter NID number" inputmode="numeric" maxlength="20" />
        <span class="field-error" id="spouseAddNidError_${index}" style="display: none; color: #d32f2f; font-size: 0.875rem; margin-top: 0.25rem;"></span>
      </div>
      <div class="modal-field">
        <label><span>Education</span></label>
        <select name="spouse_add_${index}_education">
          <option value="">Select education</option>
          <option value="None">None</option>
          <option value="Primary">Primary</option>
          <option value="Secondary">Secondary</option>
          <option value="HSC">HSC</option>
          <option value="Diploma">Diploma</option>
          <option value="Graduate">Graduate</option>
        </select>
      </div>
      <div class="modal-field">
        <label><span>Occupation</span></label>
        <input type="text" name="spouse_add_${index}_occupation" placeholder="Enter occupation" />
      </div>
      <div class="modal-field">
        <label><span>Skills 1</span></label>
        <select name="spouse_add_${index}_skills_1" class="spouse-add-skill-1">
          <option value="">Select skill</option>
          <option value="None">None</option>
          <option value="Tailoring">Tailoring</option>
          <option value="Embroidery">Embroidery</option>
          <option value="Housekeeping">Housekeeping</option>
          <option value="Cooking">Cooking</option>
          <option value="Caregiving">Caregiving</option>
          <option value="Delivery">Delivery</option>
          <option value="Driver">Driver</option>
          <option value="Rickshaw">Rickshaw</option>
          <option value="Electric Helper">Electric Helper</option>
          <option value="Electrician">Electrician</option>
          <option value="Plumbing Helper">Plumbing Helper</option>
          <option value="Plumber">Plumber</option>
          <option value="Masonry Helper">Masonry Helper</option>
          <option value="Welding Helper">Welding Helper</option>
          <option value="Welding">Welding</option>
          <option value="Carpentry">Carpentry</option>
          <option value="Barbering">Barbering</option>
          <option value="Beauty Parlor">Beauty Parlor</option>
          <option value="Mobile Servicing">Mobile Servicing</option>
          <option value="Electronics Repair">Electronics Repair</option>
          <option value="Sales">Sales</option>
          <option value="Typing">Typing</option>
          <option value="MS Office">MS Office</option>
          <option value="Data Entry">Data Entry</option>
          <option value="Tutoring">Tutoring</option>
          <option value="Security Guard">Security Guard</option>
        </select>
      </div>
      <div class="modal-field">
        <label><span>Skills 2</span></label>
        <select name="spouse_add_${index}_skills_2" class="spouse-add-skill-2">
          <option value="">Select skill</option>
          <option value="None">None</option>
          <option value="Tailoring">Tailoring</option>
          <option value="Embroidery">Embroidery</option>
          <option value="Housekeeping">Housekeeping</option>
          <option value="Cooking">Cooking</option>
          <option value="Caregiving">Caregiving</option>
          <option value="Delivery">Delivery</option>
          <option value="Driver">Driver</option>
          <option value="Rickshaw">Rickshaw</option>
          <option value="Electric Helper">Electric Helper</option>
          <option value="Electrician">Electrician</option>
          <option value="Plumbing Helper">Plumbing Helper</option>
          <option value="Plumber">Plumber</option>
          <option value="Masonry Helper">Masonry Helper</option>
          <option value="Welding Helper">Welding Helper</option>
          <option value="Welding">Welding</option>
          <option value="Carpentry">Carpentry</option>
          <option value="Barbering">Barbering</option>
          <option value="Beauty Parlor">Beauty Parlor</option>
          <option value="Mobile Servicing">Mobile Servicing</option>
          <option value="Electronics Repair">Electronics Repair</option>
          <option value="Sales">Sales</option>
          <option value="Typing">Typing</option>
          <option value="MS Office">MS Office</option>
          <option value="Data Entry">Data Entry</option>
          <option value="Tutoring">Tutoring</option>
          <option value="Security Guard">Security Guard</option>
        </select>
      </div>
      <div class="modal-field">
        <label><span>Income Range</span></label>
        <select name="spouse_add_${index}_income">
          <option value="">Select income range</option>
          <option value="No Income">No Income</option>
          <option value="Less than ৳3,000">Less than ৳3,000</option>
          <option value="৳3,000 – ৳5,000">৳3,000 – ৳5,000</option>
          <option value="৳5,001 – ৳9,999">৳5,001 – ৳9,999</option>
          <option value="৳10,000 and above">৳10,000 and above</option>
        </select>
      </div>
      <div class="modal-field">
        <label><span>Mobile Number</span></label>
        <input type="tel" name="spouse_add_${index}_mobile" placeholder="Enter mobile number" inputmode="numeric" maxlength="11" pattern="[0-9]{11}" />
      </div>
      <div class="modal-field">
        <label><span>Marriage Certificate</span></label>
        <div class="file-input-wrapper">
          <input type="file" name="spouse_add_${index}_certificate" accept=".pdf,image/*" />
        </div>
      </div>
    `;
    return card;
  }

  // Create child add form
  function createChildAddForm(index) {
    const card = document.createElement('div');
    card.className = 'add-card';
    card.innerHTML = `
      <h4>Child ${index}</h4>
      <div class="modal-field">
        <label><span>Full Name</span></label>
        <input type="text" name="child_add_${index}_name" placeholder="Enter full name" />
      </div>
      <div class="modal-field">
        <label><span>Date of Birth</span></label>
        <input type="date" name="child_add_${index}_dob" />
      </div>
      <div class="modal-field">
        <label><span>Gender</span></label>
        <select name="child_add_${index}_gender">
          <option value="">Select gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="modal-field">
        <label><span>Birth Certificate Number</span></label>
        <input type="text" name="child_add_${index}_birth_certificate_number" placeholder="Enter 17-digit birth certificate number" inputmode="numeric" maxlength="17" />
        <span class="field-error" id="childAddBirthCertError_${index}" style="display: none; color: #d32f2f; font-size: 0.875rem; margin-top: 0.25rem;"></span>
      </div>
      <div class="modal-field">
        <label><span>Education</span></label>
        <select name="child_add_${index}_education">
          <option value="">Select education</option>
          <option value="None">None</option>
          <option value="Primary">Primary</option>
          <option value="Secondary">Secondary</option>
          <option value="HSC">HSC</option>
          <option value="Diploma">Diploma</option>
          <option value="Graduate">Graduate</option>
        </select>
      </div>
      <div class="modal-field">
        <label><span>Occupation</span></label>
        <input type="text" name="child_add_${index}_occupation" placeholder="Enter occupation" />
      </div>
      <div class="modal-field">
        <label><span>Skills 1</span></label>
        <select name="child_add_${index}_skills_1" class="child-add-skill-1">
          <option value="">Select skill</option>
          <option value="None">None</option>
          <option value="Tailoring">Tailoring</option>
          <option value="Embroidery">Embroidery</option>
          <option value="Housekeeping">Housekeeping</option>
          <option value="Cooking">Cooking</option>
          <option value="Caregiving">Caregiving</option>
          <option value="Delivery">Delivery</option>
          <option value="Driver">Driver</option>
          <option value="Rickshaw">Rickshaw</option>
          <option value="Electric Helper">Electric Helper</option>
          <option value="Electrician">Electrician</option>
          <option value="Plumbing Helper">Plumbing Helper</option>
          <option value="Plumber">Plumber</option>
          <option value="Masonry Helper">Masonry Helper</option>
          <option value="Welding Helper">Welding Helper</option>
          <option value="Welding">Welding</option>
          <option value="Carpentry">Carpentry</option>
          <option value="Barbering">Barbering</option>
          <option value="Beauty Parlor">Beauty Parlor</option>
          <option value="Mobile Servicing">Mobile Servicing</option>
          <option value="Electronics Repair">Electronics Repair</option>
          <option value="Sales">Sales</option>
          <option value="Typing">Typing</option>
          <option value="MS Office">MS Office</option>
          <option value="Data Entry">Data Entry</option>
          <option value="Tutoring">Tutoring</option>
          <option value="Security Guard">Security Guard</option>
        </select>
      </div>
      <div class="modal-field">
        <label><span>Skills 2</span></label>
        <select name="child_add_${index}_skills_2" class="child-add-skill-2">
          <option value="">Select skill</option>
          <option value="None">None</option>
          <option value="Tailoring">Tailoring</option>
          <option value="Embroidery">Embroidery</option>
          <option value="Housekeeping">Housekeeping</option>
          <option value="Cooking">Cooking</option>
          <option value="Caregiving">Caregiving</option>
          <option value="Delivery">Delivery</option>
          <option value="Driver">Driver</option>
          <option value="Rickshaw">Rickshaw</option>
          <option value="Electric Helper">Electric Helper</option>
          <option value="Electrician">Electrician</option>
          <option value="Plumbing Helper">Plumbing Helper</option>
          <option value="Plumber">Plumber</option>
          <option value="Masonry Helper">Masonry Helper</option>
          <option value="Welding Helper">Welding Helper</option>
          <option value="Welding">Welding</option>
          <option value="Carpentry">Carpentry</option>
          <option value="Barbering">Barbering</option>
          <option value="Beauty Parlor">Beauty Parlor</option>
          <option value="Mobile Servicing">Mobile Servicing</option>
          <option value="Electronics Repair">Electronics Repair</option>
          <option value="Sales">Sales</option>
          <option value="Typing">Typing</option>
          <option value="MS Office">MS Office</option>
          <option value="Data Entry">Data Entry</option>
          <option value="Tutoring">Tutoring</option>
          <option value="Security Guard">Security Guard</option>
        </select>
      </div>
      <div class="modal-field">
        <label><span>Income Range</span></label>
        <select name="child_add_${index}_income">
          <option value="">Select income range</option>
          <option value="No Income">No Income</option>
          <option value="Less than ৳3,000">Less than ৳3,000</option>
          <option value="৳3,000 – ৳5,000">৳3,000 – ৳5,000</option>
          <option value="৳5,001 – ৳9,999">৳5,001 – ৳9,999</option>
          <option value="৳10,000 and above">৳10,000 and above</option>
        </select>
      </div>
      <div class="modal-field">
        <label><span>Preferred Job</span></label>
        <input type="text" name="child_add_${index}_preferred_job" placeholder="Enter preferred job" />
      </div>
      <div class="modal-field">
        <label><span>Birth Certificate</span></label>
        <div class="file-input-wrapper">
          <input type="file" name="child_add_${index}_certificate" accept=".pdf,image/*" />
        </div>
      </div>
    `;
    return card;
  }

  // Render spouse add forms
  function renderSpouseAddForms(count) {
    if (!spouseAddForms) return;
    spouseAddForms.innerHTML = '';
    for (let i = 1; i <= count; i++) {
      spouseAddForms.appendChild(createSpouseAddForm(i));
    }
    // Setup constraints for newly created forms
    setupSpouseAddMobileConstraints();
    setupSpouseAddNidConstraints();
    setupSpouseAddSkillValidation();
  }

  // Render children add forms
  function renderChildrenAddForms(count) {
    if (!childrenAddForms) return;
    childrenAddForms.innerHTML = '';
    for (let i = 1; i <= count; i++) {
      childrenAddForms.appendChild(createChildAddForm(i));
    }
    // Setup constraints for newly created forms
    setupChildrenAddBirthCertificateConstraints();
    setupChildrenAddSkillValidation();
  }

  const openModal = () => {
    // Prevent opening if user has pending edit member submission
    if (hasPendingEditMemberSubmission()) {
      return;
    }
    modal.hidden = false;
    form.reset();
    errorEl.hidden = true;
    removeMembersSection.hidden = true;
    addMembersSection.hidden = true;
    spouseRemovalList.innerHTML = '';
    childrenRemovalList.innerHTML = '';
    if (spouseAddForms) spouseAddForms.innerHTML = '';
    if (childrenAddForms) childrenAddForms.innerHTML = '';
  };

  const closeModal = () => {
    modal.hidden = true;
    form.reset();
    errorEl.hidden = true;
    removeMembersSection.hidden = true;
    addMembersSection.hidden = true;
  };

  openBtn.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  // Handle action dropdown change
  memberActionSelect?.addEventListener('change', () => {
    const action = memberActionSelect.value;
    if (action === 'remove') {
      removeMembersSection.hidden = false;
      addMembersSection.hidden = true;
      // Populate removal lists with current data
      populateSpouseRemovalList();
      populateChildrenRemovalList();
    } else if (action === 'add') {
      removeMembersSection.hidden = true;
      addMembersSection.hidden = false;
    } else {
      removeMembersSection.hidden = true;
      addMembersSection.hidden = true;
    }
  });

  // Handle spouse add count change
  spouseAddCount?.addEventListener('input', () => {
    let count = parseInt(spouseAddCount.value, 10) || 0;
    if (count < 0) count = 0;
    if (count > 10) count = 10;
    spouseAddCount.value = count; // Update display to sanitized value
    renderSpouseAddForms(count);
  });

  // ===================
  // SPOUSE ADD CONSTRAINTS AND VALIDATION
  // ===================

  // Mobile input constraints for spouse add forms
  function setupSpouseAddMobileConstraints() {
    const mobileInputs = spouseAddForms?.querySelectorAll('input[name*="mobile"]') || [];
    mobileInputs.forEach(mobileEl => {
      // Remove existing listeners to avoid duplicates
      mobileEl.removeEventListener('input', handleSpouseAddMobileInput);
      mobileEl.removeEventListener('keypress', handleSpouseAddMobileKeypress);
      
      // Add new listeners
      mobileEl.addEventListener('input', handleSpouseAddMobileInput);
      mobileEl.addEventListener('keypress', handleSpouseAddMobileKeypress);
    });
  }

  function handleSpouseAddMobileInput(e) {
    // Remove any non-digit characters
    let value = e.target.value.replace(/\D/g, '');
    // Limit to 11 digits
    if (value.length > 11) {
      value = value.substring(0, 11);
    }
    e.target.value = value;
  }

  function handleSpouseAddMobileKeypress(e) {
    // Prevent non-numeric input
    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
  }

  // NID input constraints for spouse add forms
  function setupSpouseAddNidConstraints() {
    const nidInputs = spouseAddForms?.querySelectorAll('input[name*="nid"]') || [];
    nidInputs.forEach(nidEl => {
      // Remove existing listeners to avoid duplicates
      nidEl.removeEventListener('input', handleSpouseAddNidInput);
      nidEl.removeEventListener('keypress', handleSpouseAddNidKeypress);
      nidEl.removeEventListener('blur', handleSpouseAddNidBlur);
      
      // Add new listeners
      nidEl.addEventListener('input', handleSpouseAddNidInput);
      nidEl.addEventListener('keypress', handleSpouseAddNidKeypress);
      nidEl.addEventListener('blur', handleSpouseAddNidBlur);
    });
  }

  function handleSpouseAddNidInput(e) {
    // Remove any non-digit characters
    let value = e.target.value.replace(/\D/g, '');
    
    // Limit to 17 digits maximum
    if (value.length > 17) {
      value = value.substring(0, 17);
    }
    
    // Format with spaces every 4 digits for display
    let formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    e.target.value = formatted;
    
    // Custom validation for min/max length
    const digitCount = value.length;
    if (digitCount > 0 && digitCount < 10) {
      e.target.setCustomValidity(`NID number must be at least 10 digits (currently ${digitCount})`);
    } else if (digitCount > 17) {
      e.target.setCustomValidity('NID number cannot exceed 17 digits');
    } else {
      e.target.setCustomValidity('');
    }

    // Clear previous debounce timer
    if (e.target.debounceTimer) {
      clearTimeout(e.target.debounceTimer);
    }
    
    // Debounce API call for duplicate check (only if valid length)
    if (digitCount >= 10 && digitCount <= 17) {
      e.target.debounceTimer = setTimeout(() => {
        checkSpouseAddNidDuplicate(value, e.target);
      }, 500); // Wait 500ms after user stops typing
    } else {
      // Clear error display if length is invalid
      clearSpouseAddNidError(e.target);
    }
  }

  function handleSpouseAddNidKeypress(e) {
    // Prevent non-numeric input
    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
  }

  function handleSpouseAddNidBlur(e) {
    const digits = e.target.value.replace(/\D/g, '');
    if (digits.length > 0 && digits.length < 10) {
      e.target.setCustomValidity(`NID number must be at least 10 digits (currently ${digits.length})`);
      e.target.reportValidity();
    } else if (digits.length >= 10 && digits.length <= 17) {
      // Final check on blur
      checkSpouseAddNidDuplicate(digits, e.target);
    }
  }

  async function checkSpouseAddNidDuplicate(nidDigits, nidEl) {
    if (!nidEl || !nidDigits) {
      clearSpouseAddNidError(nidEl);
      return;
    }

    // Check against current user's personal NID
    const currentUser = getCurrentUser();
    if (currentUser?.nid) {
      const personalNid = String(currentUser.nid).replace(/\s+/g, '');
      const currentNid = String(nidDigits).replace(/\s+/g, '');
      if (personalNid === currentNid) {
        showSpouseAddNidError(nidEl, 'Spouse NID cannot be the same as your personal NID');
        nidEl.setCustomValidity('Spouse NID cannot be the same as your personal NID');
        return;
      }
    }

    // Check against current user's existing spouse NIDs from profile data
    if (window.__profileData?.spouses) {
      const currentNid = String(nidDigits).replace(/\s+/g, '');
      for (const spouse of window.__profileData.spouses) {
        if (spouse.nid) {
          const existingNid = String(spouse.nid).replace(/\s+/g, '');
          if (existingNid === currentNid) {
            showSpouseAddNidError(nidEl, 'This NID already belongs to an existing spouse');
            nidEl.setCustomValidity('This NID already belongs to an existing spouse');
            return;
          }
        }
      }
    }

    // Check against other spouse NIDs on the same form
    const allSpouseAddNids = getAllSpouseAddNids();
    const currentNid = String(nidDigits).replace(/\s+/g, '');
    const currentFieldName = nidEl.name;
    
    for (const [fieldName, nid] of Object.entries(allSpouseAddNids)) {
      if (fieldName !== currentFieldName && nid === currentNid) {
        showSpouseAddNidError(nidEl, 'Duplicate NID found among added spouses');
        nidEl.setCustomValidity('Duplicate NID found among added spouses');
        return;
      }
    }

    try {
      const response = await fetch('/api/slum-dweller/check-nid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nid: nidDigits })
      });

      if (!response.ok) {
        console.log('NID check API not available, skipping duplicate check');
        clearSpouseAddNidError(nidEl);
        return; // Gracefully handle API unavailability
      }

      const result = await response.json();

      if (result.status === 'success') {
        if (result.isDuplicate) {
          showSpouseAddNidError(nidEl, 'This NID number already exists in the system');
          nidEl.setCustomValidity('Duplicate NID - This NID number already exists in the system');
        } else {
          showSpouseAddNidSuccess(nidEl);
          // Clear any duplicate error, but preserve other validation errors
          const currentError = nidEl.validationMessage;
          if (currentError.includes('Duplicate NID') || currentError.includes('Spouse NID') || currentError.includes('already exists') || currentError.includes('already belongs')) {
            nidEl.setCustomValidity('');
          }
        }
      }
    } catch (error) {
      console.log('NID check service unavailable, proceeding without duplicate check');
      clearSpouseAddNidError(nidEl);
      // Clear any existing duplicate validation errors when service is unavailable
      const currentError = nidEl.validationMessage;
      if (currentError && (currentError.includes('Duplicate NID') || currentError.includes('Spouse NID') || currentError.includes('already exists') || currentError.includes('already belongs'))) {
        nidEl.setCustomValidity('');
      }
    }
  }

  function getAllSpouseAddNids() {
    const nids = {};
    const nidInputs = spouseAddForms?.querySelectorAll('input[name*="nid"]') || [];
    nidInputs.forEach(input => {
      const nid = input.value.replace(/\s+/g, '');
      if (nid) {
        nids[input.name] = nid;
      }
    });
    return nids;
  }

  function showSpouseAddNidError(nidEl, message) {
    const nidField = nidEl?.closest('.modal-field');
    const fieldName = nidEl.name;
    const index = fieldName.match(/spouse_add_(\d+)_nid/)?.[1];
    const errorEl = index ? document.getElementById(`spouseAddNidError_${index}`) : null;
    
    if (nidField) {
      nidField.classList.add('has-error');
      nidField.classList.remove('has-success');
    }
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  function showSpouseAddNidSuccess(nidEl) {
    const nidField = nidEl?.closest('.modal-field');
    const fieldName = nidEl.name;
    const index = fieldName.match(/spouse_add_(\d+)_nid/)?.[1];
    const errorEl = index ? document.getElementById(`spouseAddNidError_${index}`) : null;
    
    if (nidField) {
      nidField.classList.remove('has-error');
      nidField.classList.add('has-success');
    }
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  }

  function clearSpouseAddNidError(nidEl) {
    const nidField = nidEl?.closest('.modal-field');
    const fieldName = nidEl?.name;
    const index = fieldName?.match(/spouse_add_(\d+)_nid/)?.[1];
    const errorEl = index ? document.getElementById(`spouseAddNidError_${index}`) : null;
    
    if (nidField) {
      nidField.classList.remove('has-error', 'has-success');
    }
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  }

  // Skills validation for spouse add forms
  function setupSpouseAddSkillValidation() {
    const skillSets = [];
    for (let i = 1; i <= 10; i++) {
      const skill1 = spouseAddForms?.querySelector(`[name="spouse_add_${i}_skills_1"]`);
      const skill2 = spouseAddForms?.querySelector(`[name="spouse_add_${i}_skills_2"]`);
      if (skill1 && skill2) {
        skillSets.push({ skill1, skill2, index: i });
      }
    }

    skillSets.forEach(({ skill1, skill2, index }) => {
      const validateSkills = () => {
        const val1 = skill1.value;
        const val2 = skill2.value;
        if (val1 && val2 && val1 === val2 && val1 !== 'None' && val1 !== '') {
          skill2.setCustomValidity('Skill 1 and Skill 2 cannot be the same');
        } else {
          skill1.setCustomValidity('');
          skill2.setCustomValidity('');
        }
      };
      
      skill1.addEventListener('change', validateSkills);
      skill2.addEventListener('change', validateSkills);
    });
  }

  // Handle children add count change
  childrenAddCount?.addEventListener('input', () => {
    let count = parseInt(childrenAddCount.value, 10) || 0;
    if (count < 0) count = 0;
    childrenAddCount.value = count; // Update display to sanitized value
    renderChildrenAddForms(count);
  });

  // ===================
  // CHILDREN ADD CONSTRAINTS AND VALIDATION
  // ===================

  // Birth Certificate Number constraints for children add forms
  function setupChildrenAddBirthCertificateConstraints() {
    const birthCertInputs = childrenAddForms?.querySelectorAll('input[name*="birth_certificate_number"]') || [];
    birthCertInputs.forEach(certEl => {
      // Remove existing listeners to avoid duplicates
      certEl.removeEventListener('input', handleChildAddBirthCertificateInput);
      certEl.removeEventListener('keypress', handleChildAddBirthCertificateKeypress);
      certEl.removeEventListener('blur', handleChildAddBirthCertificateBlur);
      
      // Add new listeners
      certEl.addEventListener('input', handleChildAddBirthCertificateInput);
      certEl.addEventListener('keypress', handleChildAddBirthCertificateKeypress);
      certEl.addEventListener('blur', handleChildAddBirthCertificateBlur);
    });
  }

  function handleChildAddBirthCertificateInput(e) {
    // Remove any non-digit characters
    let value = e.target.value.replace(/\D/g, '');
    
    // Limit to 17 digits exactly
    if (value.length > 17) {
      value = value.substring(0, 17);
    }
    
    e.target.value = value;
    
    // Custom validation for exact length
    const digitCount = value.length;
    if (digitCount > 0 && digitCount !== 17) {
      e.target.setCustomValidity(`Birth certificate number must be exactly 17 digits (currently ${digitCount})`);
    } else if (digitCount === 17) {
      e.target.setCustomValidity('');
      // Clear previous debounce timer
      if (e.target.debounceTimer) {
        clearTimeout(e.target.debounceTimer);
      }
      // Debounce API call for duplicate check
      e.target.debounceTimer = setTimeout(() => {
        checkChildAddBirthCertificateDuplicate(value, e.target);
      }, 500); // Wait 500ms after user stops typing
    } else {
      e.target.setCustomValidity('');
      // Clear error display if not complete
      clearChildAddBirthCertError(e.target);
    }
  }

  function handleChildAddBirthCertificateKeypress(e) {
    // Prevent non-numeric input
    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
  }

  function handleChildAddBirthCertificateBlur(e) {
    const digits = e.target.value.replace(/\D/g, '');
    if (digits.length > 0 && digits.length !== 17) {
      e.target.setCustomValidity(`Birth certificate number must be exactly 17 digits (currently ${digits.length})`);
      e.target.reportValidity();
    } else if (digits.length === 17) {
      // Final check on blur
      checkChildAddBirthCertificateDuplicate(digits, e.target);
    }
  }

  async function checkChildAddBirthCertificateDuplicate(certNumber, certEl) {
    if (!certEl || !certNumber) {
      clearChildAddBirthCertError(certEl);
      return;
    }

    // Check against current user's existing children birth certificates from profile data
    if (window.__profileData?.children) {
      for (const child of window.__profileData.children) {
        if (child.birth_certificate_number) {
          const existingCert = String(child.birth_certificate_number).replace(/\D/g, '');
          if (existingCert === certNumber) {
            showChildAddBirthCertError(certEl, 'This birth certificate number already belongs to an existing child');
            certEl.setCustomValidity('This birth certificate number already belongs to an existing child');
            return;
          }
        }
      }
    }

    // Check against other birth certificate numbers on the same form
    const allChildAddBirthCerts = getAllChildAddBirthCerts();
    const currentFieldName = certEl.name;
    
    for (const [fieldName, certNum] of Object.entries(allChildAddBirthCerts)) {
      if (fieldName !== currentFieldName && certNum === certNumber) {
        showChildAddBirthCertError(certEl, 'Duplicate birth certificate number found among added children');
        certEl.setCustomValidity('Duplicate birth certificate number found among added children');
        return;
      }
    }

    try {
      const response = await fetch('/api/slum-dweller/check-birth-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ birth_certificate_number: certNumber })
      });

      if (!response.ok) {
        console.log('Birth certificate check API not available, skipping duplicate check');
        clearChildAddBirthCertError(certEl);
        return; // Gracefully handle API unavailability
      }

      const result = await response.json();

      if (result.status === 'success') {
        if (result.isDuplicate) {
          showChildAddBirthCertError(certEl, 'This birth certificate number already exists in the system');
          certEl.setCustomValidity('Duplicate birth certificate number - This number already exists in the system');
        } else {
          showChildAddBirthCertSuccess(certEl);
          // Clear any duplicate error, but preserve other validation errors
          const currentError = certEl.validationMessage;
          if (currentError.includes('Duplicate birth certificate number') || currentError.includes('already belongs') || currentError.includes('already exists')) {
            certEl.setCustomValidity('');
          }
        }
      }
    } catch (error) {
      console.log('Birth certificate check service unavailable, proceeding without duplicate check');
      clearChildAddBirthCertError(certEl);
      // Clear any existing duplicate validation errors when service is unavailable
      const currentError = certEl.validationMessage;
      if (currentError && (currentError.includes('Duplicate birth certificate number') || currentError.includes('already belongs') || currentError.includes('already exists'))) {
        certEl.setCustomValidity('');
      }
    }
  }

  function getAllChildAddBirthCerts() {
    const certNumbers = {};
    const certInputs = childrenAddForms?.querySelectorAll('input[name*="birth_certificate_number"]') || [];
    certInputs.forEach(input => {
      const certNum = input.value.replace(/\D/g, '');
      if (certNum && certNum.length === 17) {
        certNumbers[input.name] = certNum;
      }
    });
    return certNumbers;
  }

  function showChildAddBirthCertError(certEl, message) {
    const certField = certEl?.closest('.modal-field');
    const fieldName = certEl.name;
    const index = fieldName.match(/child_add_(\d+)_birth_certificate_number/)?.[1];
    const errorEl = index ? document.getElementById(`childAddBirthCertError_${index}`) : null;
    
    if (certField) {
      certField.classList.add('has-error');
      certField.classList.remove('has-success');
    }
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  function showChildAddBirthCertSuccess(certEl) {
    const certField = certEl?.closest('.modal-field');
    const fieldName = certEl.name;
    const index = fieldName.match(/child_add_(\d+)_birth_certificate_number/)?.[1];
    const errorEl = index ? document.getElementById(`childAddBirthCertError_${index}`) : null;
    
    if (certField) {
      certField.classList.remove('has-error');
      certField.classList.add('has-success');
    }
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  }

  function clearChildAddBirthCertError(certEl) {
    const certField = certEl?.closest('.modal-field');
    const fieldName = certEl?.name;
    const index = fieldName?.match(/child_add_(\d+)_birth_certificate_number/)?.[1];
    const errorEl = index ? document.getElementById(`childAddBirthCertError_${index}`) : null;
    
    if (certField) {
      certField.classList.remove('has-error', 'has-success');
    }
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  }

  // Skills validation for children add forms
  function setupChildrenAddSkillValidation() {
    const skillSets = [];
    for (let i = 1; i <= 10; i++) {
      const skill1 = childrenAddForms?.querySelector(`[name="child_add_${i}_skills_1"]`);
      const skill2 = childrenAddForms?.querySelector(`[name="child_add_${i}_skills_2"]`);
      if (skill1 && skill2) {
        skillSets.push({ skill1, skill2, index: i });
      }
    }

    skillSets.forEach(({ skill1, skill2, index }) => {
      const validateSkills = () => {
        const val1 = skill1.value;
        const val2 = skill2.value;
        if (val1 && val2 && val1 === val2 && val1 !== 'None' && val1 !== '') {
          skill2.setCustomValidity('Skill 1 and Skill 2 cannot be the same');
        } else {
          skill1.setCustomValidity('');
          skill2.setCustomValidity('');
        }
      };
      
      skill1.addEventListener('change', validateSkills);
      skill2.addEventListener('change', validateSkills);
    });
  }

  // Form submission with validation
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    // Clear previous error states
    form.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));
    form.querySelectorAll('.field-error-text').forEach(el => el.remove());

    const action = memberActionSelect.value;

    if (!action) {
      errorEl.textContent = 'Please select an action.';
      errorEl.hidden = false;
      return;
    }

    if (action === 'remove') {
      // Get checked spouses and children
      const checkedSpouses = [];
      const checkedChildren = [];
      
      spouseRemovalList.querySelectorAll('.spouse-checkbox:checked').forEach(checkbox => {
        const spouseId = checkbox.dataset.spouseId;
        const card = checkbox.closest('.member-removal-card');
        const fileInput = card.querySelector('.removal-file-input');
        
        // Skip if disabled (pending_remove)
        if (!checkbox.disabled) {
          checkedSpouses.push({
            id: spouseId,
            fileInput: fileInput
          });
        }
      });
      
      childrenRemovalList.querySelectorAll('.child-checkbox:checked').forEach(checkbox => {
        const childId = checkbox.dataset.childId;
        const card = checkbox.closest('.member-removal-card');
        const fileInput = card.querySelector('.removal-file-input');
        
        // Skip if disabled (pending_remove)
        if (!checkbox.disabled) {
          checkedChildren.push({
            id: childId,
            fileInput: fileInput
          });
        }
      });

      if (checkedSpouses.length === 0 && checkedChildren.length === 0) {
        errorEl.textContent = 'Please select at least one spouse or child to remove.';
        errorEl.hidden = false;
        return;
      }

      // Validate file uploads for checked members
      let hasError = false;
      let firstErrorField = null;

      // Validate spouse certificates
      checkedSpouses.forEach(spouse => {
        if (!spouse.fileInput.files || spouse.fileInput.files.length === 0) {
          spouse.fileInput.classList.add('field-error');
          if (!firstErrorField) firstErrorField = spouse.fileInput;
          hasError = true;
        }
      });

      // Validate children certificates
      checkedChildren.forEach(child => {
        if (!child.fileInput.files || child.fileInput.files.length === 0) {
          child.fileInput.classList.add('field-error');
          if (!firstErrorField) firstErrorField = child.fileInput;
          hasError = true;
        }
      });

      if (hasError) {
        errorEl.textContent = 'Please upload required certificates for selected members.';
        errorEl.hidden = false;
        if (firstErrorField) firstErrorField.focus();
        return;
      }

      // Show confirmation modal
      showConfirmationModal('remove');
    }

    if (action === 'add') {
      const spouseCount = parseInt(spouseAddCount?.value, 10) || 0;
      const childCount = parseInt(childrenAddCount?.value, 10) || 0;

      if (spouseCount === 0 && childCount === 0) {
        errorEl.textContent = 'Please add at least one spouse or child.';
        errorEl.hidden = false;
        return;
      }

      let hasError = false;
      let firstErrorField = null;

      // Helper function to add error to a field
      function addFieldError(input, message) {
        if (!input) return;
        input.classList.add('field-error');
        // Remove any existing error text
        const existingError = input.parentNode.querySelector('.field-error-text');
        if (existingError) existingError.remove();
        const errorText = document.createElement('div');
        errorText.className = 'field-error-text';
        errorText.textContent = message;
        input.parentNode.appendChild(errorText);
        if (!firstErrorField) firstErrorField = input;
        hasError = true;
      }

      // Validate spouse add forms
      for (let i = 1; i <= spouseCount; i++) {
        const nameInput = form.querySelector(`[name="spouse_add_${i}_name"]`);
        const dobInput = form.querySelector(`[name="spouse_add_${i}_dob"]`);
        const genderInput = form.querySelector(`[name="spouse_add_${i}_gender"]`);
        const nidInput = form.querySelector(`[name="spouse_add_${i}_nid"]`);
        const educationInput = form.querySelector(`[name="spouse_add_${i}_education"]`);
        const occupationInput = form.querySelector(`[name="spouse_add_${i}_occupation"]`);
        const incomeInput = form.querySelector(`[name="spouse_add_${i}_income"]`);
        const mobileInput = form.querySelector(`[name="spouse_add_${i}_mobile"]`);
        const certInput = form.querySelector(`[name="spouse_add_${i}_certificate"]`);

        if (nameInput && !nameInput.value.trim()) {
          addFieldError(nameInput, 'This field is required');
        }
        if (dobInput && !dobInput.value) {
          addFieldError(dobInput, 'This field is required');
        }
        if (genderInput && !genderInput.value) {
          addFieldError(genderInput, 'This field is required');
        }
        if (nidInput && !nidInput.value.trim()) {
          addFieldError(nidInput, 'This field is required');
        } else if (nidInput && nidInput.value.trim()) {
          // Validate NID format and length
          const nidDigits = nidInput.value.replace(/\D/g, '');
          if (nidDigits.length < 10) {
            addFieldError(nidInput, `NID number must be at least 10 digits (currently ${nidDigits.length})`);
          } else if (nidDigits.length > 17) {
            addFieldError(nidInput, 'NID number cannot exceed 17 digits');
          }
          // Check for validation errors from duplicate check
          const currentError = nidInput.validationMessage;
          if (currentError && (currentError.includes('Duplicate NID') || currentError.includes('Spouse NID') || currentError.includes('already exists') || currentError.includes('already belongs'))) {
            addFieldError(nidInput, currentError);
          }
        }
        if (educationInput && !educationInput.value) {
          addFieldError(educationInput, 'This field is required');
        }
        if (occupationInput && !occupationInput.value.trim()) {
          addFieldError(occupationInput, 'This field is required');
        }
        if (incomeInput && !incomeInput.value) {
          addFieldError(incomeInput, 'This field is required');
        }
        if (mobileInput && !mobileInput.value.trim()) {
          addFieldError(mobileInput, 'This field is required');
        } else if (mobileInput && mobileInput.value.trim()) {
          // Validate mobile number format
          const mobileDigits = mobileInput.value.replace(/\D/g, '');
          if (mobileDigits.length !== 11) {
            addFieldError(mobileInput, 'Mobile number must be exactly 11 digits');
          }
        }
        if (certInput && (!certInput.files || certInput.files.length === 0)) {
          addFieldError(certInput, 'This field is required');
        }
      }

      // Validate children add forms
      for (let i = 1; i <= childCount; i++) {
        const nameInput = form.querySelector(`[name="child_add_${i}_name"]`);
        const dobInput = form.querySelector(`[name="child_add_${i}_dob"]`);
        const genderInput = form.querySelector(`[name="child_add_${i}_gender"]`);
        const birthCertInput = form.querySelector(`[name="child_add_${i}_birth_certificate_number"]`);
        const educationInput = form.querySelector(`[name="child_add_${i}_education"]`);
        const occupationInput = form.querySelector(`[name="child_add_${i}_occupation"]`);
        const incomeInput = form.querySelector(`[name="child_add_${i}_income"]`);
        const preferredJobInput = form.querySelector(`[name="child_add_${i}_preferred_job"]`);
        const certInput = form.querySelector(`[name="child_add_${i}_certificate"]`);

        if (nameInput && !nameInput.value.trim()) {
          addFieldError(nameInput, 'This field is required');
        }
        if (dobInput && !dobInput.value) {
          addFieldError(dobInput, 'This field is required');
        }
        if (genderInput && !genderInput.value) {
          addFieldError(genderInput, 'This field is required');
        }
        if (birthCertInput && !birthCertInput.value.trim()) {
          addFieldError(birthCertInput, 'This field is required');
        } else if (birthCertInput && birthCertInput.value.trim()) {
          // Validate birth certificate format and length
          const birthCertDigits = birthCertInput.value.replace(/\D/g, '');
          if (birthCertDigits.length !== 17) {
            addFieldError(birthCertInput, `Birth certificate number must be exactly 17 digits (currently ${birthCertDigits.length})`);
          }
          // Check for validation errors from duplicate check
          const currentError = birthCertInput.validationMessage;
          if (currentError && (currentError.includes('Duplicate birth certificate number') || currentError.includes('already exists') || currentError.includes('already belongs'))) {
            addFieldError(birthCertInput, currentError);
          }
        }
        if (educationInput && !educationInput.value) {
          addFieldError(educationInput, 'This field is required');
        }
        if (occupationInput && !occupationInput.value.trim()) {
          addFieldError(occupationInput, 'This field is required');
        }
        if (incomeInput && !incomeInput.value) {
          addFieldError(incomeInput, 'This field is required');
        }
        if (preferredJobInput && !preferredJobInput.value.trim()) {
          addFieldError(preferredJobInput, 'This field is required');
        }
        if (certInput && (!certInput.files || certInput.files.length === 0)) {
          addFieldError(certInput, 'This field is required');
        }
      }

      if (hasError) {
        errorEl.textContent = 'Please fill in all required fields.';
        errorEl.hidden = false;
        if (firstErrorField) firstErrorField.focus();
        return;
      }

      // All validations passed - show confirmation modal
      showConfirmationModal('add');
    }
  });

  // Confirmation Modal Logic
  const confirmationModal = document.getElementById('confirmationModal');
  const closeConfirmationBtn = document.getElementById('closeConfirmationModal');
  const cancelConfirmationBtn = document.getElementById('cancelConfirmationBtn');
  const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');
  let pendingAction = null;

  function showConfirmationModal(action) {
    pendingAction = action;
    confirmationModal.hidden = false;
  }

  function hideConfirmationModal() {
    confirmationModal.hidden = true;
    pendingAction = null;
  }

  closeConfirmationBtn?.addEventListener('click', hideConfirmationModal);
  cancelConfirmationBtn?.addEventListener('click', hideConfirmationModal);

  confirmationModal?.addEventListener('click', (e) => {
    if (e.target === confirmationModal) hideConfirmationModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && confirmationModal && !confirmationModal.hidden) {
      hideConfirmationModal();
    }
  });

  confirmSubmitBtn?.addEventListener('click', async () => {
    if (pendingAction === 'remove') {
      try {
        // Get current user
        const currentUser = getCurrentUser();
        if (!currentUser) {
          showToast('Error', 'User session not found. Please login again.', 'error');
          return;
        }

        // Get checked spouses and children that are not disabled
        const checkedSpouses = [];
        const checkedChildren = [];
        
        spouseRemovalList.querySelectorAll('.spouse-checkbox:checked:not(:disabled)').forEach(checkbox => {
          checkedSpouses.push(checkbox.dataset.spouseId);
        });
        
        childrenRemovalList.querySelectorAll('.child-checkbox:checked:not(:disabled)').forEach(checkbox => {
          checkedChildren.push(checkbox.dataset.childId);
        });

        // Update status to 'pending_remove' for checked members
        const updatePromises = [];

        // Update spouse statuses with file uploads
        for (const spouseId of checkedSpouses) {
          const spouseCard = spouseRemovalList.querySelector(`[data-spouse-id="${spouseId}"]`).closest('.member-removal-card');
          const fileInput = spouseCard.querySelector('.removal-file-input');
          
          const formData = new FormData();
          formData.append('status', 'pending_remove');
          if (fileInput.files[0]) {
            formData.append('divorce_certificate', fileInput.files[0]);
          }
          
          const updatePromise = fetch(`/api/slum-dweller/${currentUser.slum_code}/spouse/${spouseId}/status`, {
            method: 'PATCH',
            body: formData
          });
          updatePromises.push(updatePromise);
        }

        // Update children statuses with file uploads
        for (const childId of checkedChildren) {
          const childCard = childrenRemovalList.querySelector(`[data-child-id="${childId}"]`).closest('.member-removal-card');
          const fileInput = childCard.querySelector('.removal-file-input');
          
          const formData = new FormData();
          formData.append('status', 'pending_remove');
          if (fileInput.files[0]) {
            formData.append('death_certificate', fileInput.files[0]);
          }
          
          const updatePromise = fetch(`/api/slum-dweller/${currentUser.slum_code}/child/${childId}/status`, {
            method: 'PATCH',
            body: formData
          });
          updatePromises.push(updatePromise);
        }

        // Wait for all updates to complete
        const responses = await Promise.all(updatePromises);
        
        // Check if all updates were successful
        const allSuccessful = responses.every(response => response.ok);
        
        if (allSuccessful) {
          // Save pending edit member flag to user's application
          const { app, idx } = getCurrentUserApp();
          if (app && idx !== -1) {
            if (!app.data) app.data = {};
            app.data.pendingEditMember = true;
            const apps = safeJsonParse(sessionStorage.getItem('SLUMLINK_APPLICATIONS'), []);
            apps[idx] = app;
            sessionStorage.setItem('SLUMLINK_APPLICATIONS', JSON.stringify(apps));
          }

          hideConfirmationModal();
          closeModal();
          showMemberRemovalSuccessToast();
          updateEditMemberButtonState();
          
          // Automatically refresh the page after showing success toast
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        } else {
          showToast('Error', 'Failed to update member statuses. Please try again.', 'error');
        }
        
      } catch (error) {
        console.error('Error updating member statuses:', error);
        showToast('Error', 'An error occurred while processing your request.', 'error');
      }
    } else if (pendingAction === 'add') {
      await handleAddMembersSubmission();
    }
  });

  // Handle add members submission with OTP verification
  async function handleAddMembersSubmission() {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        showToast('Error', 'User session not found. Please login again.', 'error');
        return;
      }

      const spouseCount = parseInt(spouseAddCount?.value, 10) || 0;
      const childCount = parseInt(childrenAddCount?.value, 10) || 0;

      // Arrays to store spouse mobile numbers for OTP
      const spouseMobiles = [];

      // First, add all children (no OTP required)
      for (let i = 1; i <= childCount; i++) {
        const childData = {
          name: form.querySelector(`[name="child_add_${i}_name"]`)?.value,
          dob: form.querySelector(`[name="child_add_${i}_dob"]`)?.value,
          gender: form.querySelector(`[name="child_add_${i}_gender"]`)?.value,
          birth_certificate_number: form.querySelector(`[name="child_add_${i}_birth_certificate_number"]`)?.value?.replace(/\s+/g, ''),
          education: form.querySelector(`[name="child_add_${i}_education"]`)?.value,
          job: form.querySelector(`[name="child_add_${i}_occupation"]`)?.value,
          skills_1: form.querySelector(`[name="child_add_${i}_skills_1"]`)?.value,
          skills_2: form.querySelector(`[name="child_add_${i}_skills_2"]`)?.value,
          income: form.querySelector(`[name="child_add_${i}_income"]`)?.value,
          preferred_job: form.querySelector(`[name="child_add_${i}_preferred_job"]`)?.value
        };

        // Create FormData for child with file upload
        const childFormData = new FormData();
        childFormData.append('childData', JSON.stringify(childData));
        
        const childCertFile = form.querySelector(`[name="child_add_${i}_certificate"]`)?.files[0];
        if (childCertFile) {
          childFormData.append('birth_certificate', childCertFile);
        }

        // Add child to database
        const childResponse = await fetch(`/api/slum-dweller/${currentUser.slum_code}/add-child`, {
          method: 'POST',
          body: childFormData
        });

        if (!childResponse.ok) {
          const error = await childResponse.json();
          throw new Error(error.message || 'Failed to add child');
        }
      }

      // Then, add all spouses
      for (let i = 1; i <= spouseCount; i++) {
        const spouseData = {
          name: form.querySelector(`[name="spouse_add_${i}_name"]`)?.value,
          dob: form.querySelector(`[name="spouse_add_${i}_dob"]`)?.value,
          gender: form.querySelector(`[name="spouse_add_${i}_gender"]`)?.value,
          nid: form.querySelector(`[name="spouse_add_${i}_nid"]`)?.value?.replace(/\s+/g, ''),
          mobile: form.querySelector(`[name="spouse_add_${i}_mobile"]`)?.value,
          education: form.querySelector(`[name="spouse_add_${i}_education"]`)?.value,
          job: form.querySelector(`[name="spouse_add_${i}_occupation"]`)?.value,
          skills_1: form.querySelector(`[name="spouse_add_${i}_skills_1"]`)?.value,
          skills_2: form.querySelector(`[name="spouse_add_${i}_skills_2"]`)?.value,
          income: form.querySelector(`[name="spouse_add_${i}_income"]`)?.value
        };

        // Create FormData for spouse with file upload
        const spouseFormData = new FormData();
        spouseFormData.append('spouseData', JSON.stringify(spouseData));
        
        const spouseCertFile = form.querySelector(`[name="spouse_add_${i}_certificate"]`)?.files[0];
        if (spouseCertFile) {
          spouseFormData.append('marriage_certificate', spouseCertFile);
        }

        // Prepare spouse addition (validate and get spouse key) without database insertion
        const spouseResponse = await fetch(`/api/slum-dweller/${currentUser.slum_code}/prepare-spouse-add`, {
          method: 'POST',
          body: spouseFormData
        });

        if (!spouseResponse.ok) {
          const error = await spouseResponse.json();
          throw new Error(error.message || 'Failed to prepare spouse addition');
        }

        const spouseResult = await spouseResponse.json();
        spouseMobiles.push({
          mobile: spouseData.mobile,
          name: spouseData.name,
          spouseKey: spouseResult.data.spouseKey // Store spouse key for OTP verification
        });
      }

      hideConfirmationModal();
      closeModal();

      // If there are spouses, start OTP verification process
      if (spouseMobiles.length > 0) {
        showSpouseOTPVerificationModal(spouseMobiles);
      } else {
        // Only children were added
        showMemberRemovalSuccessToast();
        updateEditMemberButtonState();
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }

    } catch (error) {
      console.error('Error adding members:', error);
      showToast('Error', 'Failed to add members: ' + error.message, 'error');
    }
  }

  // Spouse OTP Verification Modal functionality
  function showSpouseOTPVerificationModal(spouseMobiles) {
    // Create modal if it doesn't exist
    let otpModal = document.getElementById('spouseOTPModal');
    if (!otpModal) {
      createSpouseOTPModal();
      otpModal = document.getElementById('spouseOTPModal');
    }

    const modalContent = otpModal.querySelector('.spouse-otp-content');
    let currentSpouseIndex = 0;
    let verifiedSpouses = 0;

    function showSpouseOTPStep(index) {
      if (index >= spouseMobiles.length) {
        // All spouses verified
        hideSpouseOTPModal();
        showMemberRemovalSuccessToast();
        updateEditMemberButtonState();
        setTimeout(() => {
          window.location.reload();
        }, 3000);
        return;
      }

      const spouse = spouseMobiles[index];
      modalContent.innerHTML = `
        <h3>Spouse Verification ${index + 1} of ${spouseMobiles.length}</h3>
        <div class="spouse-info">
          <p><strong>Name:</strong> ${spouse.name}</p>
          <p><strong>Mobile:</strong> ${spouse.mobile}</p>
        </div>
        <div class="otp-step">
          <p>An OTP has been sent to the spouse's mobile number for verification.</p>
          <div class="modal-field">
            <label><span>Enter OTP</span></label>
            <input type="text" id="spouseOTP_${index}" maxlength="6" placeholder="Enter 6-digit OTP" />
            <span class="field-error" id="spouseOTPError_${index}" style="display: none; color: #d32f2f; font-size: 0.875rem; margin-top: 0.25rem;"></span>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn outlined" onclick="hideSpouseOTPModal()">Cancel</button>
          <button type="button" class="btn primary" id="verifySpouseOTP_${index}">Verify</button>
          <button type="button" class="btn outlined" id="resendSpouseOTP_${index}">Resend OTP</button>
        </div>
      `;

      // Send OTP automatically
      sendSpouseOTP(spouse);

      // Add event listeners
      document.getElementById(`verifySpouseOTP_${index}`).addEventListener('click', () => verifySpouseOTP(index, spouse));
      document.getElementById(`resendSpouseOTP_${index}`).addEventListener('click', () => sendSpouseOTP(spouse));
    }

    async function sendSpouseOTP(spouse) {
      try {
        const response = await fetch('/api/slum-dweller/spouse-add-otp/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            mobile: spouse.mobile,
            spouseName: spouse.name,
            spouseKey: spouse.spouseKey // Pass spouse key for validation
          })
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || 'Failed to send OTP');
        }

        console.log('OTP sent to spouse:', spouse.mobile);
      } catch (error) {
        console.error('Error sending spouse OTP:', error);
        document.getElementById(`spouseOTPError_${currentSpouseIndex}`).textContent = 'Failed to send OTP: ' + error.message;
        document.getElementById(`spouseOTPError_${currentSpouseIndex}`).style.display = 'block';
      }
    }

    async function verifySpouseOTP(index, spouse) {
      const otpInput = document.getElementById(`spouseOTP_${index}`);
      const errorEl = document.getElementById(`spouseOTPError_${index}`);
      const otp = otpInput.value.trim();

      // Clear previous errors
      errorEl.style.display = 'none';

      if (!otp) {
        errorEl.textContent = 'Please enter the OTP';
        errorEl.style.display = 'block';
        return;
      }

      if (otp.length !== 6) {
        errorEl.textContent = 'OTP must be 6 digits';
        errorEl.style.display = 'block';
        return;
      }

      try {
        const response = await fetch('/api/slum-dweller/spouse-add-otp/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            mobile: spouse.mobile,
            otp: otp,
            spouseKey: spouse.spouseKey // Pass spouse key instead of spouse ID
          })
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || 'Invalid OTP');
        }

        // OTP verified successfully, move to next spouse
        currentSpouseIndex++;
        verifiedSpouses++;
        showSpouseOTPStep(currentSpouseIndex);

      } catch (error) {
        console.error('Error verifying spouse OTP:', error);
        errorEl.textContent = error.message;
        errorEl.style.display = 'block';
      }
    }

    // Show modal and start with first spouse
    otpModal.style.display = 'flex';
    showSpouseOTPStep(0);
  }

  function createSpouseOTPModal() {
    const modal = document.createElement('div');
    modal.id = 'spouseOTPModal';
    modal.className = 'modal';
    modal.style.cssText = `
      display: none;
      position: fixed;
      z-index: 9999;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      align-items: center;
      justify-content: center;
    `;

    modal.innerHTML = `
      <div class="modal-content" style="background: white; padding: 2rem; border-radius: 8px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto;">
        <div class="spouse-otp-content">
          <!-- Content will be populated dynamically -->
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideSpouseOTPModal();
      }
    });
  }

  function hideSpouseOTPModal() {
    const modal = document.getElementById('spouseOTPModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // Make function globally available
  window.hideSpouseOTPModal = hideSpouseOTPModal;
})();

// ===================
// Phone Number Change Functionality
// ===================
(function() {
  const modal = document.getElementById('phoneChangeModal');
  const changePhoneBtn = document.getElementById('changePhoneBtn');
  
  // Step elements
  const step1 = document.getElementById('phoneChangeStep1');
  const step2 = document.getElementById('phoneChangeStep2');
  const step3 = document.getElementById('phoneChangeStep3');
  const step4 = document.getElementById('phoneChangeStep4');

  // Form elements
  const currentPhoneMasked = document.getElementById('currentPhoneMasked');
  const currentPhoneOTP = document.getElementById('currentPhoneOTP');
  const newPhoneNumber = document.getElementById('newPhoneNumber');
  const newPhoneMasked = document.getElementById('newPhoneMasked');
  const newPhoneOTP = document.getElementById('newPhoneOTP');

  // Error elements
  const currentOtpError = document.getElementById('currentOtpError');
  const newPhoneError = document.getElementById('newPhoneError');
  const newOtpError = document.getElementById('newOtpError');

  // Button elements
  const phoneChangeConfirmBtn = document.getElementById('phoneChangeConfirmBtn');
  const phoneChangeCancelBtn = document.getElementById('phoneChangeCancelBtn');
  const verifyCurrentOtpBtn = document.getElementById('verifyCurrentOtpBtn');
  const sendNewPhoneOtpBtn = document.getElementById('sendNewPhoneOtpBtn');
  const verifyNewOtpBtn = document.getElementById('verifyNewOtpBtn');
  
  // Navigation buttons
  const backToStep1Btn = document.getElementById('backToStep1Btn');
  const backToStep2Btn = document.getElementById('backToStep2Btn');
  const backToStep3Btn = document.getElementById('backToStep3Btn');

  // Close buttons
  const closeButtons = [
    document.getElementById('closePhoneChangeModal'),
    document.getElementById('closePhoneChangeModal2'),
    document.getElementById('closePhoneChangeModal3'),
    document.getElementById('closePhoneChangeModal4'),
  ];

  if (!modal || !changePhoneBtn) return;

  let currentUser = null;

  // Initialize current user
  function initCurrentUser() {
    currentUser = getCurrentUser();
    if (!currentUser) {
      showError('User session not found. Please login again.');
      return false;
    }
    return true;
  }

  // Show specific step
  function showStep(stepNumber) {
    [step1, step2, step3, step4].forEach((step, index) => {
      step.style.display = (index + 1 === stepNumber) ? 'block' : 'none';
    });
  }

  // Show/hide modal
  function showModal() {
    if (!initCurrentUser()) return;
    modal.style.display = 'flex';
    showStep(1);
    clearAllErrors();
    clearAllInputs();
  }

  function hideModal() {
    modal.style.display = 'none';
    showStep(1);
    clearAllErrors();
    clearAllInputs();
  }

  // Clear all error messages
  function clearAllErrors() {
    [currentOtpError, newPhoneError, newOtpError].forEach(el => {
      if (el) {
        el.style.display = 'none';
        el.textContent = '';
      }
    });
  }

  // Clear all inputs
  function clearAllInputs() {
    if (currentPhoneOTP) currentPhoneOTP.value = '';
    if (newPhoneNumber) newPhoneNumber.value = '';
    if (newPhoneOTP) newPhoneOTP.value = '';
  }

  // Show error message
  function showError(message, errorElement) {
    if (!errorElement) {
      console.error(message);
      return;
    }
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }

  // Set button loading state
  function setButtonLoading(button, loading) {
    if (!button) return;
    if (loading) {
      button.disabled = true;
      button.classList.add('loading');
    } else {
      button.disabled = false;
      button.classList.remove('loading');
    }
  }

  // Validate phone number (11 digits)
  function validatePhoneNumber(phone) {
    const phoneRegex = /^[0-9]{11}$/;
    return phoneRegex.test(phone);
  }

  // API Base URL
  const API_BASE = 'http://localhost:5002/api';

  // Step 1: Initial confirmation
  changePhoneBtn.addEventListener('click', showModal);
  phoneChangeCancelBtn.addEventListener('click', hideModal);
  phoneChangeConfirmBtn.addEventListener('click', async () => {
    setButtonLoading(phoneChangeConfirmBtn, true);
    
    try {
      const response = await fetch(`${API_BASE}/slum-dweller/phone-change/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slumCode: currentUser.slum_code })
      });

      const data = await response.json();

      if (data.status === 'success') {
        currentPhoneMasked.textContent = data.maskedPhone;
        showStep(2);
      } else {
        showError(data.message || 'Failed to initiate phone change', currentOtpError);
      }
    } catch (error) {
      showError('Network error. Please try again.', currentOtpError);
    } finally {
      setButtonLoading(phoneChangeConfirmBtn, false);
    }
  });

  // Step 2: Verify current phone OTP
  verifyCurrentOtpBtn.addEventListener('click', async () => {
    const otp = currentPhoneOTP.value.trim();
    
    if (!otp) {
      showError('Please enter the OTP', currentOtpError);
      return;
    }

    if (otp.length !== 6) {
      showError('OTP must be 6 digits', currentOtpError);
      return;
    }

    setButtonLoading(verifyCurrentOtpBtn, true);
    clearAllErrors();

    try {
      const response = await fetch(`${API_BASE}/slum-dweller/phone-change/verify-current`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          slumCode: currentUser.slum_code,
          otp: otp
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        showStep(3);
      } else {
        showError(data.message || 'Invalid OTP', currentOtpError);
      }
    } catch (error) {
      showError('Network error. Please try again.', currentOtpError);
    } finally {
      setButtonLoading(verifyCurrentOtpBtn, false);
    }
  });

  // Step 3: Send OTP to new phone
  sendNewPhoneOtpBtn.addEventListener('click', async () => {
    const newPhone = newPhoneNumber.value.trim();
    
    if (!newPhone) {
      showError('Please enter your new phone number', newPhoneError);
      return;
    }

    if (!validatePhoneNumber(newPhone)) {
      showError('Phone number must be exactly 11 digits', newPhoneError);
      return;
    }

    setButtonLoading(sendNewPhoneOtpBtn, true);
    clearAllErrors();

    try {
      const response = await fetch(`${API_BASE}/slum-dweller/phone-change/new-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          slumCode: currentUser.slum_code,
          newPhone: newPhone
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        newPhoneMasked.textContent = data.maskedPhone;
        showStep(4);
      } else {
        showError(data.message || 'Failed to send OTP', newPhoneError);
      }
    } catch (error) {
      showError('Network error. Please try again.', newPhoneError);
    } finally {
      setButtonLoading(sendNewPhoneOtpBtn, false);
    }
  });

  // Step 4: Verify new phone and update
  verifyNewOtpBtn.addEventListener('click', async () => {
    const otp = newPhoneOTP.value.trim();
    const newPhone = newPhoneNumber.value.trim();
    
    if (!otp) {
      showError('Please enter the OTP', newOtpError);
      return;
    }

    if (otp.length !== 6) {
      showError('OTP must be 6 digits', newOtpError);
      return;
    }

    setButtonLoading(verifyNewOtpBtn, true);
    clearAllErrors();

    try {
      const response = await fetch(`${API_BASE}/slum-dweller/phone-change/verify-new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          slumCode: currentUser.slum_code,
          newPhone: newPhone,
          otp: otp
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        // Update current user's phone in localStorage
        currentUser.mobile = newPhone;
        localStorage.setItem('SLUMLINK_CURRENT_USER', JSON.stringify(currentUser));
        
        // Show success toast
        showProfileUpdateToast();
        
        // Hide modal
        hideModal();
        
        // Refresh profile data
        loadUserProfile();
      } else {
        showError(data.message || 'Failed to update phone number', newOtpError);
      }
    } catch (error) {
      showError('Network error. Please try again.', newOtpError);
    } finally {
      setButtonLoading(verifyNewOtpBtn, false);
    }
  });

  // Navigation buttons
  backToStep1Btn.addEventListener('click', () => showStep(1));
  backToStep2Btn.addEventListener('click', () => showStep(2));
  backToStep3Btn.addEventListener('click', () => showStep(3));

  // Close buttons
  closeButtons.forEach(btn => {
    if (btn) btn.addEventListener('click', hideModal);
  });

  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) hideModal();
  });

  // Enter key support for OTP inputs
  if (currentPhoneOTP) {
    currentPhoneOTP.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') verifyCurrentOtpBtn.click();
    });
  }

  if (newPhoneOTP) {
    newPhoneOTP.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') verifyNewOtpBtn.click();
    });
  }

  if (newPhoneNumber) {
    newPhoneNumber.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendNewPhoneOtpBtn.click();
    });
  }

  // Only allow digits in phone and OTP inputs
  [currentPhoneOTP, newPhoneOTP, newPhoneNumber].forEach(input => {
    if (input) {
      input.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
      });
    }
  });

})();

// ===================
// Spouse Phone Number Change Functionality
// ===================
(function() {
  const modal = document.getElementById('spousePhoneChangeModal');
  
  // Step elements
  const step1 = document.getElementById('spousePhoneChangeStep1');
  const step2 = document.getElementById('spousePhoneChangeStep2');
  const step3 = document.getElementById('spousePhoneChangeStep3');
  const step4 = document.getElementById('spousePhoneChangeStep4');

  // Form elements
  const spouseNameForChange = document.getElementById('spouseNameForChange');
  const spouseCurrentPhoneMasked = document.getElementById('spouseCurrentPhoneMasked');
  const spouseCurrentPhoneOTP = document.getElementById('spouseCurrentPhoneOTP');
  const spouseNewPhoneNumber = document.getElementById('spouseNewPhoneNumber');
  const spouseNewPhoneMasked = document.getElementById('spouseNewPhoneMasked');
  const spouseNewPhoneOTP = document.getElementById('spouseNewPhoneOTP');

  // Error elements
  const spouseCurrentOtpError = document.getElementById('spouseCurrentOtpError');
  const spouseNewPhoneError = document.getElementById('spouseNewPhoneError');
  const spouseNewOtpError = document.getElementById('spouseNewOtpError');

  // Button elements
  const spousePhoneChangeConfirmBtn = document.getElementById('spousePhoneChangeConfirmBtn');
  const spousePhoneChangeCancelBtn = document.getElementById('spousePhoneChangeCancelBtn');
  const spouseVerifyCurrentOtpBtn = document.getElementById('spouseVerifyCurrentOtpBtn');
  const spouseSendNewPhoneOtpBtn = document.getElementById('spouseSendNewPhoneOtpBtn');
  const spouseVerifyNewOtpBtn = document.getElementById('spouseVerifyNewOtpBtn');
  
  // Navigation buttons
  const spouseBackToStep1Btn = document.getElementById('spouseBackToStep1Btn');
  const spouseBackToStep2Btn = document.getElementById('spouseBackToStep2Btn');
  const spouseBackToStep3Btn = document.getElementById('spouseBackToStep3Btn');

  // Close buttons
  const closeButtons = [
    document.getElementById('closeSpousePhoneChangeModal'),
    document.getElementById('closeSpousePhoneChangeModal2'),
    document.getElementById('closeSpousePhoneChangeModal3'),
    document.getElementById('closeSpousePhoneChangeModal4'),
  ];

  if (!modal) return;

  let currentUser = null;
  let currentSpouse = { id: null, name: '' };

  // Initialize current user
  function initCurrentUser() {
    currentUser = getCurrentUser();
    if (!currentUser) {
      showSpouseError('User session not found. Please login again.');
      return false;
    }
    return true;
  }

  // Show specific step
  function showSpouseStep(stepNumber) {
    [step1, step2, step3, step4].forEach((step, index) => {
      if (step) step.style.display = (index + 1 === stepNumber) ? 'block' : 'none';
    });
  }

  // Show/hide modal
  function showSpouseModal(spouseId, spouseName) {
    if (!initCurrentUser()) return;
    currentSpouse.id = spouseId;
    currentSpouse.name = spouseName || 'Spouse';
    
    if (spouseNameForChange) spouseNameForChange.textContent = currentSpouse.name;
    
    modal.style.display = 'flex';
    showSpouseStep(1);
    clearAllSpouseErrors();
    clearAllSpouseInputs();
  }

  function hideSpouseModal() {
    modal.style.display = 'none';
    showSpouseStep(1);
    clearAllSpouseErrors();
    clearAllSpouseInputs();
    currentSpouse = { id: null, name: '' };
  }

  // Clear all error messages
  function clearAllSpouseErrors() {
    [spouseCurrentOtpError, spouseNewPhoneError, spouseNewOtpError].forEach(el => {
      if (el) {
        el.style.display = 'none';
        el.textContent = '';
      }
    });
  }

  // Clear all inputs
  function clearAllSpouseInputs() {
    if (spouseCurrentPhoneOTP) spouseCurrentPhoneOTP.value = '';
    if (spouseNewPhoneNumber) spouseNewPhoneNumber.value = '';
    if (spouseNewPhoneOTP) spouseNewPhoneOTP.value = '';
  }

  // Show error message
  function showSpouseError(message, errorElement) {
    if (!errorElement) {
      console.error(message);
      return;
    }
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }

  // Set button loading state
  function setSpouseButtonLoading(button, loading) {
    if (!button) return;
    if (loading) {
      button.disabled = true;
      button.classList.add('loading');
    } else {
      button.disabled = false;
      button.classList.remove('loading');
    }
  }

  // Validate phone number (11 digits)
  function validatePhoneNumber(phone) {
    const phoneRegex = /^[0-9]{11}$/;
    return phoneRegex.test(phone);
  }

  // API Base URL
  const API_BASE = 'http://localhost:5002/api';

  // Event delegation for change spouse phone buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('change-spouse-phone-btn')) {
      const spouseId = e.target.getAttribute('data-spouse-id');
      const spouseCard = e.target.closest('.spouse-card');
      const spouseName = spouseCard ? spouseCard.querySelector('.spouse-name')?.textContent || 'Spouse' : 'Spouse';
      
      showSpouseModal(spouseId, spouseName);
    }
  });

  // Step 1: Initial confirmation
  if (spousePhoneChangeCancelBtn) spousePhoneChangeCancelBtn.addEventListener('click', hideSpouseModal);
  if (spousePhoneChangeConfirmBtn) spousePhoneChangeConfirmBtn.addEventListener('click', async () => {
    setSpouseButtonLoading(spousePhoneChangeConfirmBtn, true);
    
    try {
      const response = await fetch(`${API_BASE}/slum-dweller/spouse-phone-change/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          slumCode: currentUser.slum_code,
          spouseId: currentSpouse.id
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        if (spouseCurrentPhoneMasked) spouseCurrentPhoneMasked.textContent = data.maskedPhone;
        showSpouseStep(2);
      } else {
        showSpouseError(data.message || 'Failed to initiate phone change', spouseCurrentOtpError);
      }
    } catch (error) {
      showSpouseError('Network error. Please try again.', spouseCurrentOtpError);
    } finally {
      setSpouseButtonLoading(spousePhoneChangeConfirmBtn, false);
    }
  });

  // Step 2: Verify current phone OTP
  if (spouseVerifyCurrentOtpBtn) spouseVerifyCurrentOtpBtn.addEventListener('click', async () => {
    const otp = spouseCurrentPhoneOTP ? spouseCurrentPhoneOTP.value.trim() : '';
    
    if (!otp) {
      showSpouseError('Please enter the OTP', spouseCurrentOtpError);
      return;
    }

    if (otp.length !== 6) {
      showSpouseError('OTP must be 6 digits', spouseCurrentOtpError);
      return;
    }

    setSpouseButtonLoading(spouseVerifyCurrentOtpBtn, true);
    clearAllSpouseErrors();

    try {
      const response = await fetch(`${API_BASE}/slum-dweller/spouse-phone-change/verify-current`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          slumCode: currentUser.slum_code,
          spouseId: currentSpouse.id,
          otp: otp
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        showSpouseStep(3);
      } else {
        showSpouseError(data.message || 'Invalid OTP', spouseCurrentOtpError);
      }
    } catch (error) {
      showSpouseError('Network error. Please try again.', spouseCurrentOtpError);
    } finally {
      setSpouseButtonLoading(spouseVerifyCurrentOtpBtn, false);
    }
  });

  // Step 3: Send OTP to new phone
  if (spouseSendNewPhoneOtpBtn) spouseSendNewPhoneOtpBtn.addEventListener('click', async () => {
    const newPhone = spouseNewPhoneNumber ? spouseNewPhoneNumber.value.trim() : '';
    
    if (!newPhone) {
      showSpouseError('Please enter the new phone number', spouseNewPhoneError);
      return;
    }

    if (!validatePhoneNumber(newPhone)) {
      showSpouseError('Phone number must be exactly 11 digits', spouseNewPhoneError);
      return;
    }

    setSpouseButtonLoading(spouseSendNewPhoneOtpBtn, true);
    clearAllSpouseErrors();

    try {
      const response = await fetch(`${API_BASE}/slum-dweller/spouse-phone-change/new-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          slumCode: currentUser.slum_code,
          spouseId: currentSpouse.id,
          newPhone: newPhone
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        if (spouseNewPhoneMasked) spouseNewPhoneMasked.textContent = data.maskedPhone;
        showSpouseStep(4);
      } else {
        showSpouseError(data.message || 'Failed to send OTP', spouseNewPhoneError);
      }
    } catch (error) {
      showSpouseError('Network error. Please try again.', spouseNewPhoneError);
    } finally {
      setSpouseButtonLoading(spouseSendNewPhoneOtpBtn, false);
    }
  });

  // Step 4: Verify new phone and update
  if (spouseVerifyNewOtpBtn) spouseVerifyNewOtpBtn.addEventListener('click', async () => {
    const otp = spouseNewPhoneOTP ? spouseNewPhoneOTP.value.trim() : '';
    const newPhone = spouseNewPhoneNumber ? spouseNewPhoneNumber.value.trim() : '';
    
    if (!otp) {
      showSpouseError('Please enter the OTP', spouseNewOtpError);
      return;
    }

    if (otp.length !== 6) {
      showSpouseError('OTP must be 6 digits', spouseNewOtpError);
      return;
    }

    setSpouseButtonLoading(spouseVerifyNewOtpBtn, true);
    clearAllSpouseErrors();

    try {
      const response = await fetch(`${API_BASE}/slum-dweller/spouse-phone-change/verify-new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          slumCode: currentUser.slum_code,
          spouseId: currentSpouse.id,
          newPhone: newPhone,
          otp: otp
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        // Show success toast
        showProfileUpdateToast();
        
        // Hide modal
        hideSpouseModal();
        
        // Refresh profile data to show updated phone number
        loadUserProfile();
      } else {
        showSpouseError(data.message || 'Failed to update phone number', spouseNewOtpError);
      }
    } catch (error) {
      showSpouseError('Network error. Please try again.', spouseNewOtpError);
    } finally {
      setSpouseButtonLoading(spouseVerifyNewOtpBtn, false);
    }
  });

  // Navigation buttons
  if (spouseBackToStep1Btn) spouseBackToStep1Btn.addEventListener('click', () => showSpouseStep(1));
  if (spouseBackToStep2Btn) spouseBackToStep2Btn.addEventListener('click', () => showSpouseStep(2));
  if (spouseBackToStep3Btn) spouseBackToStep3Btn.addEventListener('click', () => showSpouseStep(3));

  // Close buttons
  closeButtons.forEach(btn => {
    if (btn) btn.addEventListener('click', hideSpouseModal);
  });

  // Click outside to close
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideSpouseModal();
    });
  }

  // Enter key support for OTP inputs
  if (spouseCurrentPhoneOTP) {
    spouseCurrentPhoneOTP.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && spouseVerifyCurrentOtpBtn) spouseVerifyCurrentOtpBtn.click();
    });
  }

  if (spouseNewPhoneOTP) {
    spouseNewPhoneOTP.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && spouseVerifyNewOtpBtn) spouseVerifyNewOtpBtn.click();
    });
  }

  if (spouseNewPhoneNumber) {
    spouseNewPhoneNumber.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && spouseSendNewPhoneOtpBtn) spouseSendNewPhoneOtpBtn.click();
    });
  }

  // Only allow digits in phone and OTP inputs
  [spouseCurrentPhoneOTP, spouseNewPhoneOTP, spouseNewPhoneNumber].forEach(input => {
    if (input) {
      input.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
      });
    }
  });

})();
