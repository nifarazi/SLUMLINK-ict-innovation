(() => {
  const STORAGE_KEY = 'SLUMLINK_CHILDREN';
  const SESSION_FLAG = 'SLUMLINK_SESSION_INIT';
  function initSession(){
    if (!sessionStorage.getItem(SESSION_FLAG)){
      ['SLUMLINK_SIGNUP','SLUMLINK_MARITAL','SLUMLINK_CHILDREN'].forEach(k => sessionStorage.removeItem(k));
      sessionStorage.setItem(SESSION_FLAG, '1');
    }
  }
  const form = document.getElementById('childrenForm');
  const countInput = document.getElementById('childrenCount');
  const segments = document.getElementById('childrenSegments');
  const MARITAL_STORAGE_KEY = 'SLUMLINK_MARITAL';

  function safeJsonParse(raw, fallback){ try { return JSON.parse(raw); } catch { return fallback; } }
  function clearSegments(){ segments.innerHTML = ''; }

  // Show error toast notification
  function showErrorToast(message) {
    // Remove any existing toast
    const existing = document.querySelector('.error-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.innerHTML = `<strong>Error</strong><div class="subtitle">${message}</div>`;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      max-width: 400px;
      font-family: inherit;
    `;
    document.body.appendChild(toast);

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      toast.classList.add('toast-hide');
      setTimeout(() => { try { toast.remove(); } catch {} }, 350);
    }, 4000);
  }

  function makeChildSegment(index){
    const wrap = document.createElement('div');
    wrap.className = 'child-segment';
    wrap.innerHTML = `
      <h3 class="segment-title">Children Information ${index}</h3>
      <div class="fields">
        <label class="field span-2">
          <span>Full Name</span>
          <input type="text" name="child_${index}_name" placeholder="e.g., Karim" />
        </label>
        <label class="field">
          <span>Date of Birth</span>
          <input type="date" name="child_${index}_dob" />
        </label>
        <label class="field">
          <span>Gender</span>
          <select name="child_${index}_gender">
            <option value="" disabled selected>Select gender</option>
            <option>Male</option>
            <option>Female</option>
            <option>Others</option>
          </select>
        </label>
        <label class="field">
          <span>Education</span>
          <select name="child_${index}_education">
            <option value="" disabled selected>Select education</option>
            <option value="None">None</option>
            <option value="Primary">Primary</option>
            <option value="Secondary">Secondary</option>
            <option value="HSC">HSC</option>
            <option value="Diploma">Diploma</option>
            <option value="Graduate">Graduate</option>
          </select>
        </label>
        <label class="field">
          <span>Job</span>
          <input type="text" name="child_${index}_job" placeholder="e.g., Apprentice" />
        </label>
        <label class="field">
          <span>Skill 1</span>
          <select name="child_${index}_skills_1" class="child-skill-1">
            <option value="" disabled selected>Select skill</option>
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
        </label>
        <label class="field">
          <span>Skill 2</span>
          <select name="child_${index}_skills_2" class="child-skill-2">
            <option value="" disabled selected>Select skill</option>
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
        </label>
        <label class="field span-2">
          <span>Income Range</span>
          <select name="child_${index}_income">
            <option value="" disabled selected>Select range</option>
            <option value="No Income">No Income</option>
            <option value="Less than &#2547;3,000">Less than &#2547;3,000</option>
            <option value="&#2547;3,000 &ndash; &#2547;5,000">&#2547;3,000 &ndash; &#2547;5,000</option>
            <option value="&#2547;5,001 &ndash; &#2547;9,999">&#2547;5,001 &ndash; &#2547;9,999</option>
            <option value="&#2547;10,000 and above">&#2547;10,000 and above</option>
          </select>
        </label>
        <label class="field span-2">
          <span>Preferred Job</span>
          <input type="text" name="child_${index}_preferred_job" placeholder="e.g., Electrician" />
        </label>
        <label class="field span-2">
          <span>Birth Certificate Number</span>
          <input type="text" name="child_${index}_birth_certificate_number" inputmode="numeric" placeholder="Enter 17-digit birth certificate number" maxlength="17" />
          <span class="field-error" id="birthCertError_${index}" style="display: none;"></span>
        </label>
        <label class="field span-2">
          <span>Birth Certificate (Upload)</span>
          <input type="file" name="child_${index}_birth_certificate" accept=".pdf,image/*" />
        </label>
      </div>
    `;
    return wrap;
  }

  function renderSegments(n){
    clearSegments();
    const count = Math.max(0, Math.min(Number(n) || 0, 10));
    for(let i=1;i<=count;i++) segments.appendChild(makeChildSegment(i));
    // Setup skill validation for newly created skill fields
    setupSkillValidation();
    // Setup birth certificate number constraints
    setupBirthCertificateConstraints();
  }

  function setupSkillValidation() {
    const skillSegments = segments.querySelectorAll('.child-segment');
    skillSegments.forEach(segment => {
      const skill1 = segment.querySelector('.child-skill-1');
      const skill2 = segment.querySelector('.child-skill-2');
      
      if (skill1 && skill2) {
        const validateSkills = () => {
          const val1 = skill1.value;
          const val2 = skill2.value;
          if (val1 && val2 && val1 === val2 && val1 !== 'None') {
            skill2.setCustomValidity('Skill 1 and Skill 2 cannot be the same');
          } else {
            skill1.setCustomValidity('');
            skill2.setCustomValidity('');
          }
        };
        
        skill1.addEventListener('change', validateSkills);
        skill2.addEventListener('change', validateSkills);
      }
    });
  }

  function handleBirthCertificateInput(e) {
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
        checkBirthCertificateDuplicate(value, e.target);
      }, 500); // Wait 500ms after user stops typing
    } else {
      e.target.setCustomValidity('');
    }
  }

  function handleBirthCertificateKeypress(e) {
    // Prevent non-numeric input
    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
  }

  function handleBirthCertificateBlur(e) {
    const digits = e.target.value.replace(/\D/g, '');
    if (digits.length > 0 && digits.length !== 17) {
      e.target.setCustomValidity(`Birth certificate number must be exactly 17 digits (currently ${digits.length})`);
      e.target.reportValidity();
    } else if (digits.length === 17) {
      // Final check on blur
      checkBirthCertificateDuplicate(digits, e.target);
    }
  }

  async function checkBirthCertificateDuplicate(certNumber, certEl) {
    if (!certEl || !certNumber) {
      clearBirthCertError(certEl);
      return;
    }

    // Check against other birth certificate numbers on the same page
    const allBirthCertNumbers = getAllBirthCertNumbers();
    const currentFieldName = certEl.name;
    
    for (const [fieldName, certNum] of Object.entries(allBirthCertNumbers)) {
      if (fieldName !== currentFieldName && certNum === certNumber) {
        showBirthCertError(certEl, 'Duplicate birth certificate number found among children');
        certEl.setCustomValidity('Duplicate birth certificate number found among children');
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
        clearBirthCertError(certEl);
        return; // Gracefully handle API unavailability
      }

      const result = await response.json();

      if (result.status === 'success') {
        if (result.isDuplicate) {
          showBirthCertError(certEl, 'This birth certificate number already exists in the system');
          certEl.setCustomValidity('Duplicate birth certificate number - This number already exists in the system');
        } else {
          showBirthCertSuccess(certEl);
          // Clear any duplicate error, but preserve other validation errors
          const currentError = certEl.validationMessage;
          if (currentError.includes('Duplicate birth certificate number')) {
            certEl.setCustomValidity('');
          }
        }
      }
    } catch (error) {
      console.log('Birth certificate check service unavailable, proceeding without duplicate check');
      clearBirthCertError(certEl);
      // Clear any existing duplicate validation errors when service is unavailable
      const currentError = certEl.validationMessage;
      if (currentError && currentError.includes('Duplicate birth certificate number')) {
        certEl.setCustomValidity('');
      }
    }
  }

  function getAllBirthCertNumbers() {
    const certNumbers = {};
    const certInputs = segments.querySelectorAll('input[name*="_birth_certificate_number"]');
    certInputs.forEach(input => {
      const certNum = input.value.replace(/\D/g, '');
      if (certNum && certNum.length === 17) {
        certNumbers[input.name] = certNum;
      }
    });
    return certNumbers;
  }

  function showBirthCertError(certEl, message) {
    const certField = certEl?.closest('.field');
    const fieldName = certEl.name;
    const index = fieldName.match(/child_(\d+)_birth_certificate_number/)?.[1];
    const errorEl = index ? document.getElementById(`birthCertError_${index}`) : null;
    
    if (certField) {
      certField.classList.add('has-error');
      certField.classList.remove('has-success');
    }
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  function showBirthCertSuccess(certEl) {
    const certField = certEl?.closest('.field');
    const fieldName = certEl.name;
    const index = fieldName.match(/child_(\d+)_birth_certificate_number/)?.[1];
    const errorEl = index ? document.getElementById(`birthCertError_${index}`) : null;
    
    if (certField) {
      certField.classList.remove('has-error');
      certField.classList.add('has-success');
    }
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  }

  function clearBirthCertError(certEl) {
    const certField = certEl?.closest('.field');
    const fieldName = certEl?.name;
    const index = fieldName?.match(/child_(\d+)_birth_certificate_number/)?.[1];
    const errorEl = index ? document.getElementById(`birthCertError_${index}`) : null;
    
    if (certField) {
      certField.classList.remove('has-error', 'has-success');
    }
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  }


  function setupBirthCertificateConstraints() {
    const birthCertInputs = segments.querySelectorAll('input[name*="_birth_certificate_number"]');
    birthCertInputs.forEach(certEl => {
      // Remove existing listeners to avoid duplicates
      certEl.removeEventListener('input', handleBirthCertificateInput);
      certEl.removeEventListener('keypress', handleBirthCertificateKeypress);
      certEl.removeEventListener('blur', handleBirthCertificateBlur);
      
      // Add new listeners
      certEl.addEventListener('input', handleBirthCertificateInput);
      certEl.addEventListener('keypress', handleBirthCertificateKeypress);
      certEl.addEventListener('blur', handleBirthCertificateBlur);
    });
  }

  function collectFormData(frm){
    const data = {};
    frm.querySelectorAll('input, select, textarea').forEach(el => {
      if (!el.name) return;
      if (el.type === 'checkbox') {
        data[el.name] = el.checked;
      } else if (el.type === 'file') {
        const file = el.files && el.files[0];
        const stored = el.dataset.dataUrl || '';
        if (file && el.dataset.dataUrl) {
          data[el.name] = stored; // Data URL
          data[el.name + '_filename'] = file.name;
        } else if (stored) {
          data[el.name] = stored; // previously saved
        } else {
          data[el.name] = '';
        }
      } else {
        data[el.name] = el.value;
      }
    });
    return data;
  }
  function fillForm(frm, data){
    if (!data) return;
    // Render segments first based on stored count
    if (typeof data.childrenCount !== 'undefined') {
      countInput.value = data.childrenCount;
      renderSegments(countInput.value);
    } else {
      renderSegments(0);
    }
    // Fill fields
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
      if (el.disabled || el.offsetParent === null) return; // skip hidden
      const val = (el.type === 'checkbox') ? (el.checked ? 'on' : '') : String(el.value || '').trim();
      // For children segments, optional fields are acceptable; only account info required
      const requiredNames = ['account_password','account_confirm'];
      const isRequired = requiredNames.includes(el.name) || el.closest('.child-segment') === null; // count input required?
      if (isRequired && !val) {
        if (!firstInvalid) firstInvalid = el;
        el.setCustomValidity('Please fill out this field');
      } else {
        el.setCustomValidity('');
      }
    });
    // Password length check
    const pwd = frm.querySelector('[name="account_password"]');
    const cfm = frm.querySelector('[name="account_confirm"]');
    if (pwd && pwd.value && pwd.value.length < 8) {
      pwd.setCustomValidity('Password length need to minimum 8');
      if (!firstInvalid) firstInvalid = pwd;
    }
    // Password match check
    if (pwd && cfm && pwd.value && cfm.value && pwd.value !== cfm.value) {
      cfm.setCustomValidity('Passwords do not match');
      if (!firstInvalid) firstInvalid = cfm;
    }
    if (firstInvalid) { firstInvalid.reportValidity(); firstInvalid.focus(); return false; }
    return true;
  }

  // First-visit per tab clears stored data
  initSession();
  // Initial load
  if (form) fillForm(form, load());

  // Apply rule: if marital status is 'unmarried', force children count to 0 and disable editing
  function applyMaritalChildrenRule(){
    const raw = sessionStorage.getItem(MARITAL_STORAGE_KEY);
    const marital = raw ? safeJsonParse(raw, {}) : {};
    const status = (marital?.maritalStatus || '').toLowerCase();
    if (status === 'unmarried'){
      if (countInput){
        countInput.value = '0';
        countInput.disabled = true;
        renderSegments(0);
      }
      // Persist the enforced 0
      save();
    } else {
      if (countInput){
        countInput.disabled = false;
      }
    }
  }
  applyMaritalChildrenRule();

  // Events
  countInput?.addEventListener('input', () => { renderSegments(countInput.value); save(); });
  form?.addEventListener('input', save);
  // Read file inputs as Data URLs on change
  form?.addEventListener('change', (ev) => {
    const el = ev.target;
    if (!(el instanceof HTMLElement)) { save(); return; }
    if (el.tagName.toLowerCase() === 'input' && (el.getAttribute('type') || '').toLowerCase() === 'file') {
      const input = el;
      const files = input.files;
      if (files && files[0]) {
        const file = files[0];
        const reader = new FileReader();
        reader.onload = () => {
          input.dataset.dataUrl = String(reader.result || '');
          save();
        };
        reader.readAsDataURL(file);
      } else {
        input.dataset.dataUrl = '';
        save();
      }
    } else {
      save();
    }
  });

  // Toggle password visibility
  function wirePwdToggles(){
    form?.querySelectorAll('.toggle-pwd').forEach(btn => {
      const targetName = btn.getAttribute('data-target');
      const input = form?.querySelector(`[name="${CSS.escape(targetName || '')}"]`);
      if (!input) return;
      const img = btn.querySelector('img');
      // Set initial icon based on current input type
      if (img) img.src = (input.type === 'password') ? 'images/hide.png' : 'images/view.png';
      btn.addEventListener('click', () => {
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        if (img) img.src = showing ? 'images/hide.png' : 'images/view.png';
        btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      });
    });
  }
  wirePwdToggles();

  // Navigation
  document.querySelector('.nav-btn.left')?.addEventListener('click', () => {
    save();
    window.location.href = './marital.html';
  });
  document.querySelector('.nav-btn.right')?.addEventListener('click', async (ev) => {
    if (!form) return;
    if (!validateAllVisible(form)) return;
    save();

    // Gather mobile numbers from personal and spouse data
    const personal = safeJsonParse(sessionStorage.getItem('SLUMLINK_SIGNUP'), {});
    const marital = safeJsonParse(sessionStorage.getItem('SLUMLINK_MARITAL'), {});

    function normalizeNumber(raw){
      if (!raw) return '';
      let s = String(raw).trim();
      // Remove spaces and non-digits except leading +
      s = s.replace(/[^+0-9]/g,'');
      if (s.startsWith('+')) s = s.slice(1);
      if (s.startsWith('0')) s = '880' + s.slice(1);
      if (s.startsWith('880')) return s;
      // assume local without leading zero
      if (/^1[0-9]{9}$/.test(s)) return '88' + s; // less likely
      return s;
    }

    const numbers = [];
    const addIf = (n) => { const norm = normalizeNumber(n); if (norm && !numbers.includes(norm)) numbers.push(norm); };
    addIf(personal.mobile);
    const spouseCount = Number(marital.spouseCount || 0) || 0;
    for (let i=1;i<=spouseCount;i++) addIf(marital[`spouse_${i}_mobile`]);

    if (!numbers.length){
      alert('No mobile numbers found to send OTPs.');
      return;
    }

    // Generate OTPs and store in sessionStorage key SLUMLINK_OTP_MAP
    function genOtp(){ return String(Math.floor(100000 + Math.random()*900000)); }
    const otpMap = {};
    numbers.forEach(n => otpMap[n] = genOtp());
    sessionStorage.setItem('SLUMLINK_OTP_MAP', JSON.stringify(otpMap));

    // Helper to ask backend to send OTP SMS using env-based BulkSMS credentials
    async function sendOtpBatch(map){
      try {
        const resp = await fetch('/api/slum-dweller/signup-otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otpMap: map })
        });
        if (!resp.ok) {
          console.warn('Signup OTP SMS API responded with non-OK status');
          return false;
        }
        const result = await resp.json().catch(() => ({}));
        if (result.status !== 'success') {
          console.warn('Signup OTP SMS API error:', result.message || result);
          return false;
        }
        return true;
      } catch (err) {
        console.warn('Signup OTP SMS API call failed', err);
        return false;
      }
    }

    // Ask backend to send OTPs (do not block UI heavily)
    sendOtpBatch(otpMap).then(ok => {
      if (!ok) console.warn('OTP SMS sending might have failed');
    });

    // Populate modal inputs and open
    function makeInputsForNumbers(list){
      const container = document.getElementById('otpInputs');
      container.innerHTML = '';
      container.dataset.count = list.length;
      list.forEach((num, idx) => {
        const wrap = document.createElement('div'); wrap.className = 'otp-item';
        const label = document.createElement('label'); label.className='otp-label'; label.textContent = num;
        const row = document.createElement('div'); row.className='otp-row';
        const input = document.createElement('input'); input.className='otp-box'; input.setAttribute('inputmode','numeric'); input.maxLength = 6; input.setAttribute('aria-label', `OTP for ${num}`);
        row.appendChild(input);
        wrap.appendChild(label);
        wrap.appendChild(row);
        container.appendChild(wrap);
      });
      // wire inputs
      const boxes = container.querySelectorAll('.otp-box');
      boxes.forEach((el, i) => {
        el.addEventListener('input', ()=>{ el.value = el.value.replace(/[^0-9]/g,''); if (el.value.length>=6 && i<boxes.length-1) boxes[i+1].focus(); });
      });
      const first = container.querySelector('.otp-box'); if (first) first.focus();
    }

    // Open modal
    const modal = document.getElementById('otpModal');
    function openModal(){ modal.setAttribute('aria-hidden','false'); modal.classList.add('open'); }
    function closeModal(){ modal.setAttribute('aria-hidden','true'); modal.classList.remove('open'); }

    makeInputsForNumbers(numbers);
    openModal();

    // Wire verify/cancel/resend actions (idempotent)
    document.getElementById('cancelOtpBtn').onclick = () => { closeModal(); };
    document.getElementById('verifyOtpBtn').onclick = async () => {
      const map = safeJsonParse(sessionStorage.getItem('SLUMLINK_OTP_MAP'), {});
      const boxes = Array.from(document.querySelectorAll('#otpInputs .otp-box'));
      const entered = boxes.map((b, i) => ({ num: numbers[i], code: (b.value||'').trim() }));
      const allOk = entered.every(e => map[e.num] && map[e.num] === e.code);
      if (!allOk){
        showErrorToast('OTP does not match');
        return;
      }
      // OTP verified: send data to backend
      try{
        const childrenData = safeJsonParse(sessionStorage.getItem('SLUMLINK_CHILDREN'), {});
        const personalData = safeJsonParse(sessionStorage.getItem('SLUMLINK_SIGNUP'), {});
        const maritalData = safeJsonParse(sessionStorage.getItem('SLUMLINK_MARITAL'), {});
        
        // Prepare personal information (only fields from signup form)
        const personal = {
          name: personalData.fullName || '',
          mobile: personalData.mobile || '',
          dob: personalData.dob || null,
          gender: personalData.gender || null,
          education: personalData.education || null,
          occupation: personalData.occupation || null,
          income: personalData.income || null,
          area: personalData.area || null,
          district: personalData.district || null,
          division: personalData.division || null,
          nid: personalData.nidNumber || null,
          members: personalData.members || null,
          password: childrenData.account_password || '',
          skills_1: personalData.skills_1 || null,
          skills_2: personalData.skills_2 || null
        };

        // Prepare spouse information (only fields from marital form)
        const spouseCount = Number(maritalData.spouseCount || 0) || 0;
        const spouses = [];
        for (let i=1; i<=spouseCount; i++) {
          spouses.push({
            name: maritalData[`spouse_${i}_name`] || '',
            dob: maritalData[`spouse_${i}_dob`] || null,
            gender: maritalData[`spouse_${i}_gender`] || null,
            nid: maritalData[`spouse_${i}_nid`] || null,
            education: maritalData[`spouse_${i}_education`] || null,
            occupation: maritalData[`spouse_${i}_job`] || null,
            income: maritalData[`spouse_${i}_income`] || null,
            mobile: maritalData[`spouse_${i}_mobile`] || null,
            marriageCertificate: maritalData[`spouse_${i}_marriage_certificate`] || null,
            skills_1: maritalData[`spouse_${i}_skills_1`] || null,
            skills_2: maritalData[`spouse_${i}_skills_2`] || null
          });
        }

        // Prepare children information (only fields from children form)
        const childCount = Number(childrenData.childrenCount || 0) || 0;
        const children = [];
        for (let i=1; i<=childCount; i++) {
          children.push({
            name: childrenData[`child_${i}_name`] || '',
            dob: childrenData[`child_${i}_dob`] || null,
            gender: childrenData[`child_${i}_gender`] || null,
            education: childrenData[`child_${i}_education`] || null,
            job: childrenData[`child_${i}_job`] || null,
            income: childrenData[`child_${i}_income`] || null,
            preferredJob: childrenData[`child_${i}_preferred_job`] || null,
            birthCertificate: childrenData[`child_${i}_birth_certificate`] || null,
            birthCertificateNumber: childrenData[`child_${i}_birth_certificate_number`] || null,
            skills_1: childrenData[`child_${i}_skills_1`] || null,
            skills_2: childrenData[`child_${i}_skills_2`] || null
          });
        }

        // Send to backend
        const response = await fetch('/api/slum-dweller/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personal, spouses, children })
        });

        const result = await response.json();
        
        console.log('Registration response:', result);
        
        if (result.status === 'success') {
          // Store slum_code in session for reference
          try{ sessionStorage.setItem('slumId', result.slum_code); }catch{}
          // clear form data
          ['SLUMLINK_SIGNUP','SLUMLINK_MARITAL','SLUMLINK_CHILDREN'].forEach(k=>sessionStorage.removeItem(k));
          sessionStorage.removeItem(SESSION_FLAG);
        } else {
          throw new Error(result.message || 'Registration failed');
        }
      }catch(e){ 
        console.error('Failed to submit registration', e); 
        closeModal();
        alert('Registration failed: ' + e.message);
        return;
      }

      // success toast
      try{
        const toast = document.createElement('div'); toast.className='profile-toast'; toast.innerHTML = '<strong>Success</strong><div class="subtitle">Your application has been submitted successfully</div>'; document.body.appendChild(toast);
        setTimeout(()=>{ toast.classList.add('toast-hide'); setTimeout(()=>{ try{ toast.remove(); }catch{} },350); },2500);
      }catch(_){}
      closeModal();
      setTimeout(()=>{ window.location.href = '/src/signin.html?role=dweller&submitted=1'; }, 1200);
    };

    document.getElementById('resendOtpLink').onclick = (e) => {
      e.preventDefault();
      // regenerate OTPs and ask backend to resend
      const newMap = {};
      numbers.forEach(n => newMap[n] = genOtp());
      sessionStorage.setItem('SLUMLINK_OTP_MAP', JSON.stringify(newMap));
      sendOtpBatch(newMap).then(ok => {
        if (!ok) {
          alert('Failed to resend OTPs. Please try again.');
        } else {
          alert('New OTPs sent');
        }
      });
    };
  });
})();
