(function () {
  // Sidebar navigation for Aids and Services page
  const nav = document.querySelector('.nav');
  if (!nav) return;
  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-btn');
    if (!btn) return;
    const target = btn.getAttribute('data-target');
    if (target === '#dashboard') {
      window.location.href = './dashboard.html';
      return;
    }
    if (target === '#profile') {
      window.location.href = './profile.html';
      return;
    }
    if (target === '#submit-complaint') {
      window.location.href = './create-complaint.html';
      return;
    }
    if (target === '#complaint-status') {
      window.location.href = './complaint-status.html';
      return;
    }
    if (target === '#aid-services') {
      // Already on Aids and Services
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
  });

  // Modal functionality
  const modal = document.getElementById('campaignModal');
  const modalClose = document.getElementById('modalClose');
  
  // Close modal when clicking outside or on close button
  modal?.addEventListener('click', (e) => {
    if (e.target === modal || e.target === modalClose) {
      closeModal();
    }
  });
  
  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('show')) {
      closeModal();
    }
  });

  function closeModal() {
    modal?.classList.remove('show');
  }

  // Load aid services data
  loadAidServicesData();

  async function loadAidServicesData() {
    const aidGrid = document.getElementById('aidGrid');
    const loadingMessage = document.getElementById('loadingMessage');
    
    try {
      // Get current user's slum_code from localStorage
      const currentUserRaw = localStorage.getItem('SLUMLINK_CURRENT_USER');
      if (!currentUserRaw) {
        throw new Error('Please log in to view your aid history.');
      }
      
      const currentUser = JSON.parse(currentUserRaw);
      if (!currentUser.slum_code) {
        throw new Error('Slum code not found. Please contact support.');
      }

      // Fetch aid history from API
      const response = await fetch(`/api/distribution/families/${currentUser.slum_code}/snapshot`);
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to load aid history.');
      }

      // Remove loading message
      if (loadingMessage) {
        loadingMessage.remove();
      }

      // Display aid history
      const aidHistory = result.data.allHistory || [];
      
      if (aidHistory.length === 0) {
        aidGrid.innerHTML = '<div class="no-data-message">You have not received any aid services yet. Check back after participating in community programs.</div>';
        return;
      }

      // Create aid cards
      aidGrid.innerHTML = '';
      aidHistory.forEach(aidItem => {
        const aidCard = createAidCard(aidItem);
        aidGrid.appendChild(aidCard);
      });

    } catch (error) {
      console.error('Error loading aid services:', error);
      if (loadingMessage) {
        loadingMessage.remove();
      }
      aidGrid.innerHTML = `<div class="error-message">Error loading aid history: ${error.message}</div>`;
    }
  }

  function createAidCard(aidItem) {
    const card = document.createElement('div');
    card.className = 'aid-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    
    // Format the date/time
    const dateStr = formatDateTime(aidItem.date);
    
    // Build card content
    let cardHTML = `
      <div class="aid-name">${escapeHtml(aidItem.campaignTitle)}</div>
      <div class="aid-org">${escapeHtml(aidItem.orgName)}</div>
      <div class="aid-type">${escapeHtml(aidItem.aidType)}</div>
    `;
    
    // Add quantity if available
    if (aidItem.quantity && aidItem.quantity > 0) {
      cardHTML += `<div class="aid-quantity">Quantity: ${aidItem.quantity}</div>`;
    }
    
    cardHTML += `<div class="aid-date">${dateStr}</div>`;
    
    card.innerHTML = cardHTML;
    
    // Add click handler to show campaign details
    card.addEventListener('click', () => showCampaignDetails(aidItem.campaignId, aidItem.orgName));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showCampaignDetails(aidItem.campaignId, aidItem.orgName);
      }
    });
    
    return card;
  }

  async function showCampaignDetails(campaignId, orgName) {
    if (!campaignId) return;
    
    const modal = document.getElementById('campaignModal');
    const modalLoading = document.getElementById('modalLoading');
    const modalDetails = document.getElementById('modalDetails');
    const modalError = document.getElementById('modalError');
    
    // Show modal and loading state
    modal?.classList.add('show');
    modalLoading.style.display = 'block';
    modalDetails.style.display = 'none';
    modalError.style.display = 'none';
    
    try {
      // Fetch campaign details
      const campaignResponse = await fetch(`/api/campaigns/${campaignId}`);
      if (!campaignResponse.ok) {
        throw new Error(`Failed to load campaign details: ${campaignResponse.statusText}`);
      }
      
      const campaignResult = await campaignResponse.json();
      if (!campaignResult.success) {
        throw new Error(campaignResult.message || 'Failed to load campaign details.');
      }
      
      const campaign = campaignResult.data;
      
      // Populate modal with campaign details
      document.getElementById('detailTitle').textContent = campaign.title || 'N/A';
      document.getElementById('detailOrganization').textContent = orgName || 'Unknown Organization';
      document.getElementById('detailCategory').textContent = formatCategory(campaign.category) || 'N/A';
      document.getElementById('detailGender').textContent = campaign.target_gender || 'All';
      document.getElementById('detailAgeGroup').textContent = campaign.age_group || 'All ages';
      
      // Show/hide education and skills based on whether they have values
      const educationItem = document.getElementById('detailEducationItem');
      const skillsItem = document.getElementById('detailSkillsItem');
      
      if (campaign.education_required && campaign.education_required.trim() && campaign.education_required.toLowerCase() !== 'none') {
        document.getElementById('detailEducation').textContent = campaign.education_required;
        educationItem.style.display = 'grid';
      } else {
        educationItem.style.display = 'none';
      }
      
      if (campaign.skills_required && campaign.skills_required.trim() && campaign.skills_required.toLowerCase() !== 'none') {
        document.getElementById('detailSkills').textContent = campaign.skills_required;
        skillsItem.style.display = 'grid';
      } else {
        skillsItem.style.display = 'none';
      }
      
      document.getElementById('detailStartDate').textContent = formatDate(campaign.start_date);
      document.getElementById('detailEndDate').textContent = formatDate(campaign.end_date);
      document.getElementById('detailStartTime').textContent = formatTime(campaign.start_time);
      document.getElementById('detailDescription').textContent = campaign.description || 'No description available.';
      
      // Hide loading, show details
      modalLoading.style.display = 'none';
      modalDetails.style.display = 'block';
      
    } catch (error) {
      console.error('Error loading campaign details:', error);
      modalLoading.style.display = 'none';
      modalError.textContent = `Error: ${error.message}`;
      modalError.style.display = 'block';
    }
  }

  function formatCategory(category) {
    if (!category) return '';
    
    // Remove underscores and split into words
    const words = category.replace(/_/g, ' ').split(' ');
    
    // Capitalize first letter of each word
    return words.map(word => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
  }

  function formatDateTime(dateString) {
    try {
      const date = new Date(dateString);
      const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      return dateString; // fallback to original string
    }
  }
  
  function formatDate(dateString) {
    try {
      const date = new Date(dateString);
      const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      return dateString || 'N/A';
    }
  }
  
  function formatTime(timeString) {
    if (!timeString) return 'N/A';
    try {
      // timeString is in HH:MM:SS format, extract HH:MM
      const timeParts = timeString.split(':');
      if (timeParts.length >= 2) {
        return `${timeParts[0]}:${timeParts[1]}`;
      }
      return timeString;
    } catch (error) {
      return timeString;
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();
