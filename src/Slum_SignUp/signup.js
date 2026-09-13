(() => {
  const STORAGE_KEY = 'SLUMLINK_SIGNUP';
  const SESSION_FLAG = 'SLUMLINK_SESSION_INIT';
  
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

  function initSession(){
    if (!sessionStorage.getItem(SESSION_FLAG)){
      ['SLUMLINK_SIGNUP','SLUMLINK_MARITAL','SLUMLINK_CHILDREN'].forEach(k => sessionStorage.removeItem(k));
      sessionStorage.setItem(SESSION_FLAG, '1');
    }
  }
  const form = document.getElementById('signupForm');
  const leftBtn = document.querySelector('.nav-btn.left');
  const rightBtn = document.querySelector('.nav-btn.right');

  // Progress (visual only on this page)
  const bars = Array.from(document.querySelectorAll('.progress .bar'));
  function setStepActive(idx) { bars.forEach((b, i) => b.classList.toggle('is-active', i <= idx)); }
  setStepActive(0);

  function safeJsonParse(raw, fallback){ try { return JSON.parse(raw); } catch { return fallback; } }
  function collectFormData(frm){
    const data = {};
    frm.querySelectorAll('input, select, textarea').forEach(el => {
      if (!el.name) return;
      let value = el.value;
      
      // Special handling for NID number - remove spaces before storing
      if (el.name === 'nidNumber') {
        value = value.replace(/\s+/g, '');
      }
      
      if (el.type === 'checkbox') data[el.name] = el.checked; 
      else data[el.name] = value;
    });
    return data;
  }
  function fillForm(frm, data){
    if (!data) return;
    Object.entries(data).forEach(([k, v]) => {
      const el = frm.querySelector(`[name="${CSS.escape(k)}"]`);
      if (!el) return;
      // Skip file inputs as they cannot have their value set programmatically
      if (el.type === 'file') return;
      if (el.type === 'checkbox') el.checked = !!v; else el.value = v;
    });
  }
  function save(){ if (!form) return; sessionStorage.setItem(STORAGE_KEY, JSON.stringify(collectFormData(form))); }
  function load(){ const raw = sessionStorage.getItem(STORAGE_KEY); return raw ? safeJsonParse(raw, {}) : {}; }

  function validateAllVisible(frm){
    let firstInvalid = null;
    const fields = frm.querySelectorAll('input, select, textarea');
    fields.forEach(el => {
      if (el.disabled || el.offsetParent === null) return; // skip hidden and disabled
      
      // Skip validation for disabled dropdown fields
      if (el.hasAttribute('disabled')) return;
      
      const val = (el.type === 'checkbox') ? (el.checked ? 'on' : '') : String(el.value || '').trim();
      const isRequired = el.hasAttribute('required');
      
      if (isRequired && !val) {
        if (!firstInvalid) firstInvalid = el;
        el.setCustomValidity('Please fill out this field');
        console.log('Validation failed for field:', el.name, 'Value:', val);
      } else {
        el.setCustomValidity('');
      }
    });
    if (firstInvalid) { 
      console.log('First invalid field:', firstInvalid.name);
      firstInvalid.reportValidity(); 
      firstInvalid.focus(); 
      return false; 
    }
    console.log('Form validation passed');
    return true;
  }

  // Utility functions for dropdowns
  function fillSelect(selectEl, items, placeholder = "Select") {
    selectEl.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.disabled = true;
    opt0.selected = true;
    opt0.textContent = placeholder;
    selectEl.appendChild(opt0);

    items.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item;
      opt.textContent = item;
      selectEl.appendChild(opt);
    });
  }

  function initDropdowns() {
    const divisionEl = document.getElementById('division');
    const districtEl = document.getElementById('district');
    const slumAreaEl = document.getElementById('slumArea');

    if (!divisionEl || !districtEl || !slumAreaEl) return;

    // Initialize divisions
    const divisions = Object.keys(AREA_DATA);
    fillSelect(divisionEl, divisions, "Select division");

    // Division change handler
    divisionEl.addEventListener('change', () => {
      const division = divisionEl.value;
      if (!division) {
        districtEl.disabled = true;
        slumAreaEl.disabled = true;
        fillSelect(districtEl, [], "Select district");
        fillSelect(slumAreaEl, [], "Select area");
        return;
      }

      const districts = Object.keys(AREA_DATA[division] || {});
      fillSelect(districtEl, districts, "Select district");
      districtEl.disabled = false;

      slumAreaEl.disabled = true;
      fillSelect(slumAreaEl, [], "Select area");
    });

    // District change handler
    districtEl.addEventListener('change', () => {
      const division = divisionEl.value;
      const district = districtEl.value;

      if (!division || !district) {
        slumAreaEl.disabled = true;
        fillSelect(slumAreaEl, [], "Select area");
        return;
      }

      const slums = (AREA_DATA[division]?.[district] || []);
      fillSelect(slumAreaEl, slums, "Select area");
      slumAreaEl.disabled = false;
    });
  }

  function setupMobileInputConstraints() {
    const mobileEl = document.querySelector('[name="mobile"]');
    if (mobileEl) {
      mobileEl.addEventListener('input', (e) => {
        // Remove any non-digit characters
        let value = e.target.value.replace(/\D/g, '');
        // Limit to 11 digits
        if (value.length > 11) {
          value = value.substring(0, 11);
        }
        e.target.value = value;
      });

      // Prevent non-numeric input
      mobileEl.addEventListener('keypress', (e) => {
        if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
        }
      });
    }
  }

  function setupNidConstraints() {
    const nidEl = document.querySelector('[name="nidNumber"]');
    if (nidEl) {
      let debounceTimer;
      
      nidEl.addEventListener('input', (e) => {
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
        clearTimeout(debounceTimer);
        
        // Debounce API call for duplicate check (only if valid length)
        if (digitCount >= 10 && digitCount <= 17) {
          debounceTimer = setTimeout(() => {
            checkNidDuplicate(value);
          }, 500); // Wait 500ms after user stops typing
        }
      });

      // Prevent non-numeric input
      nidEl.addEventListener('keypress', (e) => {
        if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
          e.preventDefault();
        }
      });

      // Validate on blur
      nidEl.addEventListener('blur', (e) => {
        const digits = e.target.value.replace(/\D/g, '');
        if (digits.length > 0 && digits.length < 10) {
          e.target.setCustomValidity(`NID number must be at least 10 digits (currently ${digits.length})`);
          e.target.reportValidity();
        } else if (digits.length >= 10 && digits.length <= 17) {
          // Final check on blur
          checkNidDuplicate(digits);
        }
      });
    }
  }

  async function checkNidDuplicate(nidDigits) {
    const nidEl = document.querySelector('[name="nidNumber"]');
    const nidField = nidEl?.closest('.field');
    const errorEl = document.getElementById('nidError');
    
    if (!nidEl || !nidDigits) {
      clearNidError(nidField, errorEl);
      return;
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
        clearNidError(nidField, errorEl);
        return; // Gracefully handle API unavailability
      }

      const result = await response.json();

      if (result.status === 'success') {
        if (result.isDuplicate) {
          showNidError(nidField, errorEl, 'This NID number already exists in the system');
          nidEl.setCustomValidity('Duplicate NID - This NID number already exists in the system');
        } else {
          showNidSuccess(nidField, errorEl);
          // Clear any duplicate error, but preserve other validation errors
          const currentError = nidEl.validationMessage;
          if (currentError.includes('Duplicate NID')) {
            nidEl.setCustomValidity('');
          }
        }
      }
    } catch (error) {
      console.log('NID check service unavailable, proceeding without duplicate check');
      clearNidError(nidField, errorEl);
      // Clear any existing duplicate validation errors when service is unavailable
      const currentError = nidEl.validationMessage;
      if (currentError && currentError.includes('Duplicate NID')) {
        nidEl.setCustomValidity('');
      }
    }
  }

  function showNidError(nidField, errorEl, message) {
    if (nidField) {
      nidField.classList.add('has-error');
      nidField.classList.remove('has-success');
    }
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  function showNidSuccess(nidField, errorEl) {
    if (nidField) {
      nidField.classList.remove('has-error');
      nidField.classList.add('has-success');
    }
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  }

  function clearNidError(nidField, errorEl) {
    if (nidField) {
      nidField.classList.remove('has-error', 'has-success');
    }
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  }

  function restoreDropdownState() {
    const savedData = load();
    const divisionEl = document.getElementById('division');
    const districtEl = document.getElementById('district');
    const slumAreaEl = document.getElementById('slumArea');

    if (!savedData || !divisionEl || !districtEl || !slumAreaEl) return;

    // Restore division and populate districts if needed
    if (savedData.division) {
      divisionEl.value = savedData.division;
      const districts = Object.keys(AREA_DATA[savedData.division] || {});
      fillSelect(districtEl, districts, "Select district");
      districtEl.disabled = false;

      // Restore district and populate areas if needed
      if (savedData.district) {
        districtEl.value = savedData.district;
        const slums = (AREA_DATA[savedData.division]?.[savedData.district] || []);
        fillSelect(slumAreaEl, slums, "Select area");
        slumAreaEl.disabled = false;

        // Restore area
        if (savedData.area) {
          slumAreaEl.value = savedData.area;
        }
      }
    }
  }

  function setupSkillValidation() {
    const skill1El = document.querySelector('[name="skills_1"]');
    const skill2El = document.querySelector('[name="skills_2"]');
    
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
  }

  // First-visit per tab clears stored data
  initSession();
  // Initialize dropdowns
  initDropdowns();
  // Setup mobile input constraints
  setupMobileInputConstraints();
  // Setup NID constraints
  setupNidConstraints();
  // Setup skill validation
  setupSkillValidation();
  // Load saved data on entry
  if (form) fillForm(form, load());
  // Restore dropdown state after loading form data
  restoreDropdownState();

  // Autosave on change
  form?.addEventListener('input', save);
  form?.addEventListener('change', save);

  leftBtn?.addEventListener('click', () => {
    save();
    const ref = document.referrer || '';
    let cameFromIndex = false;
    try {
      const refUrl = new URL(ref, window.location.href);
      const p = refUrl.pathname || '';
      // Treat "/" or any path ending with "/index.html" as coming from index
      cameFromIndex = p === '/' || /(^|\/)index\.html(\?|#|$)/.test(p);
    } catch {
      cameFromIndex = ref.includes('index.html');
    }

    if (cameFromIndex) {
      window.location.href = '/index.html';
    } else {
      // Ensure signin preselects Slum Dweller
      window.location.href = '/src/signin.html?role=dweller';
    }
  });

  rightBtn?.addEventListener('click', () => {
    console.log('Right button clicked - attempting navigation to marital.html');
    
    if (!form) { 
      console.log('No form found, navigating directly');
      window.location.href = './marital.html'; 
      return; 
    }
    
    // Validate mobile number: must be exactly 11 digits
    const mobileEl = form.querySelector('[name="mobile"]');
    if (mobileEl) {
      const mobileVal = String(mobileEl.value || '').trim();
      const isValid = /^\d{11}$/.test(mobileVal);
      if (!isValid) {
        console.log('Mobile validation failed:', mobileVal);
        mobileEl.setCustomValidity('Invalid Mobile Number');
        mobileEl.reportValidity();
        mobileEl.focus();
        return;
      } else {
        mobileEl.setCustomValidity('');
      }
      // Clear the custom validity when user edits
      mobileEl.addEventListener('input', () => mobileEl.setCustomValidity(''), { once: true });
    }

    // Check NID validation (but don't let server unavailability block navigation)
    const nidEl = form.querySelector('[name="nidNumber"]');
    if (nidEl) {
      const nidVal = String(nidEl.value || '').replace(/\D/g, '');
      if (nidVal.length >= 10 && nidVal.length <= 17) {
        // Only check for duplicate error if the validation message is set
        const currentError = nidEl.validationMessage;
        if (currentError && currentError.includes('Duplicate NID')) {
          console.log('NID duplicate validation failed');
          nidEl.reportValidity();
          nidEl.focus();
          return;
        }
      }
    }

    // Validate skills are different
    const skill1El = form.querySelector('[name="skills_1"]');
    const skill2El = form.querySelector('[name="skills_2"]');
    if (skill1El && skill2El) {
      const skill1 = skill1El.value;
      const skill2 = skill2El.value;
      if (skill1 && skill2 && skill1 === skill2 && skill1 !== 'None') {
        skill2El.setCustomValidity('Skill 1 and Skill 2 cannot be the same');
        skill2El.reportValidity();
        skill2El.focus();
        return;
      } else {
        skill1El.setCustomValidity('');
        skill2El.setCustomValidity('');
      }
    }

    console.log('Running form validation...');
    if (!validateAllVisible(form)) {
      console.log('Form validation failed, navigation blocked');
      return;
    }
    
    console.log('All validations passed, saving and navigating...');
    save();
    window.location.href = './marital.html';
  });
})();
