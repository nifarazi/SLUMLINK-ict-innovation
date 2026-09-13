(function () {
  // Sidebar routing: enable navigation to Complaint Status and Dashboard
  const nav = document.querySelector('.nav');
  if (nav) {
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
    });
  }

  const form = document.getElementById('complaintForm');
  const modal = document.getElementById('confirmModal');
  const confirmBtn = document.getElementById('confirmSubmitBtn');
  const cancelBtn = document.getElementById('cancelSubmitBtn');
  if (!form || !modal || !confirmBtn || !cancelBtn) return;

  let pendingSubmission = null;
  let pendingFile = null;

  const openModal = () => { modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); };
  const closeModal = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); };

  // Helpers for field-level error rendering
  const REQUIRED_MSG = 'This field is required to be filled';
  const fieldContainers = {
    title: document.getElementById('complaintTitle'),
    category: document.getElementById('complaintCategory'),
    description: document.getElementById('complaintDescription'),
    evidence: document.getElementById('complaintEvidence')
  };

  function ensureErrorNode(inputEl) {
    if (!inputEl) return null;
    const wrapper = inputEl.closest('.form-field');
    if (!wrapper) return null;
    let err = wrapper.querySelector('.error-text');
    if (!err) {
      err = document.createElement('div');
      err.className = 'error-text';
      wrapper.appendChild(err);
    }
    return err;
  }

  function showError(inputEl, message) {
    const err = ensureErrorNode(inputEl);
    if (err) err.textContent = message || REQUIRED_MSG;
  }

  function clearError(inputEl) {
    const wrapper = inputEl?.closest?.('.form-field');
    if (!wrapper) return;
    const err = wrapper.querySelector('.error-text');
    if (err) err.textContent = '';
  }

  // Clear errors as user types/selects
  ['title','category','description'].forEach((name) => {
    const el = fieldContainers[name];
    if (!el) return;
    const evt = name === 'category' ? 'change' : 'input';
    el.addEventListener(evt, () => clearError(el));
  });
  if (fieldContainers.evidence) {
    fieldContainers.evidence.addEventListener('change', () => clearError(fieldContainers.evidence));
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = (form.title.value || '').trim();
    const category = (form.category.value || '').trim();
    const description = (form.description.value || '').trim();
    const evidenceFile = form.evidence && form.evidence.files ? form.evidence.files[0] : null;

    // Reset previous errors
    Object.values(fieldContainers).forEach((el) => el && clearError(el));

    // Validate required fields including attachment
    let hasError = false;
    if (!title) { showError(fieldContainers.title, REQUIRED_MSG); hasError = true; }
    if (!category) { showError(fieldContainers.category, REQUIRED_MSG); hasError = true; }
    if (!description) { showError(fieldContainers.description, REQUIRED_MSG); hasError = true; }
    if (!evidenceFile) { showError(fieldContainers.evidence, REQUIRED_MSG); hasError = true; }

    if (hasError) {
      // Focus the first invalid field
      const firstInvalid = [fieldContainers.title, fieldContainers.category, fieldContainers.description, fieldContainers.evidence]
        .find((el, idx) => [title, category, description, evidenceFile][idx] ? false : true);
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // Cache submission for confirm
    pendingSubmission = {
      title,
      category,
      area: '',
      status: 'Pending',
      description,
      attachmentName: evidenceFile ? (evidenceFile.name || 'evidence') : ''
    };
    pendingFile = evidenceFile || null;
    openModal();
  });

  // Clear errors on form reset
  form.addEventListener('reset', () => {
    setTimeout(() => {
      Object.values(fieldContainers).forEach((el) => el && clearError(el));
    }, 0);
  });

  confirmBtn.addEventListener('click', () => {
    if (!pendingSubmission) { closeModal(); return; }

    const persistAndNavigate = async (submission) => {
      try {
        // Get current user info
        const currentRaw = localStorage.getItem('SLUMLINK_CURRENT_USER');
        const current = currentRaw ? JSON.parse(currentRaw) : null;
        
        if (!current || !current.slum_code) {
          alert('User session not found. Please sign in again.');
          window.location.href = '/src/signin.html?role=dweller';
          return;
        }

        // Prepare complaint data for backend
        const complaintData = {
          slum_id: current.slum_code,
          title: submission.title,
          category: submission.category,
          description: submission.description,
          attachment: submission.attachmentDataUrl
        };

        // Submit to backend API
        const response = await fetch('/api/complaint', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(complaintData)
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Failed to submit complaint');
        }

        // Also store in sessionStorage for immediate display (legacy support)
        try {
          const rawArr = sessionStorage.getItem('submittedComplaints');
          let arr = [];
          try {
            arr = rawArr ? JSON.parse(rawArr) || [] : [];
          } catch (_) {
            arr = [];
          }

          const entry = {
            title: submission.title || 'Complaint',
            category: submission.category || 'General',
            status: 'Pending',
            description: submission.description || '—',
            attachment: submission.attachmentDataUrl || '',
            attachmentName: submission.attachmentName || '',
            createdAt: new Date().toISOString()
          };
          
          arr.unshift(entry);
          try {
            sessionStorage.setItem('submittedComplaints', JSON.stringify(arr));
          } catch (e) {
            if (arr[0]) arr[0].attachment = '';
            sessionStorage.setItem('submittedComplaints', JSON.stringify(arr));
          }

          // Store complaint under the signed-in user as well
          const userId = current.id ? String(current.id) : '';
          if (userId) {
            const byUserRaw = sessionStorage.getItem('submittedComplaintsByUser');
            const map = byUserRaw ? JSON.parse(byUserRaw) : {};
            const list = Array.isArray(map[userId]) ? map[userId] : [];
            list.unshift(entry);
            map[userId] = list;
            try {
              sessionStorage.setItem('submittedComplaintsByUser', JSON.stringify(map));
            } catch (e2) {
              if (list[0]) list[0].attachment = '';
              map[userId] = list;
              sessionStorage.setItem('submittedComplaintsByUser', JSON.stringify(map));
            }
          }
        } catch (e) {
          console.warn('Failed to store in sessionStorage:', e);
        }

        // Show success popup
        try {
          const toast = document.createElement('div');
          toast.className = 'complaint-toast';
          toast.innerHTML = [
            '<span class="icon" aria-hidden="true">',
              '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
                '<path d="M9 16.17 5.83 13l-1.42 1.41L9 19 20.59 7.41 19.17 6z"/>',
              '</svg>',
            '</span>',
            '<div class="toast-content">',
              '<strong>Success</strong>',
              '<div class="subtitle">Complaint is submitted Successfully</div>',
            '</div>'
          ].join('');
          document.body.appendChild(toast);
        } catch (_) {}

        form.reset();
        closeModal();
        setTimeout(() => { window.location.href = './dashboard.html'; }, 1500);
      } catch (err) {
        console.error('Failed to submit complaint:', err);
        alert('Failed to submit complaint: ' + err.message);
        closeModal();
      }
    };

    // If there is an evidence file, read it as a Data URL for backend and display
    if (pendingFile) {
      const reader = new FileReader();
      reader.onload = () => {
        pendingSubmission.attachmentDataUrl = reader.result;
        persistAndNavigate(pendingSubmission);
      };
      reader.onerror = () => {
        console.warn('Failed to read attachment');
        alert('Failed to read attachment file. Please try again.');
        closeModal();
      };
      reader.readAsDataURL(pendingFile);
    } else {
      // No file attached (shouldn't happen due to validation)
      alert('Please attach an evidence file.');
      closeModal();
    }
  });

  cancelBtn.addEventListener('click', () => {
    closeModal();
  });

  // Close when clicking outside content
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
})();
