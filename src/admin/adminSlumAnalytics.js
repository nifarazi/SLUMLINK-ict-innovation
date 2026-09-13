// Handles the logout modal behavior and admin dropdown for admin pages
document.addEventListener('DOMContentLoaded', function () {
  var adminEls = document.querySelectorAll('.admin');
  var modal = document.getElementById('logoutModal');
  var cancelBtn = document.getElementById('cancelLogout');
  var confirmBtn = document.getElementById('confirmLogout');

  if (!modal) return; // nothing to do if modal isn't present

  function showModal() {
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    // move focus to the primary action for accessibility
    confirmBtn && confirmBtn.focus();
  }

  function hideModal() {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  }

  function closeAllDropdowns() {
    adminEls.forEach(function (el) {
      var dropdown = el.querySelector('.admin-dropdown');
      if (dropdown) {
        dropdown.classList.remove('show');
      }
    });
  }

  adminEls.forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      var dropdown = el.querySelector('.admin-dropdown');
      if (dropdown) {
        dropdown.classList.toggle('show');
      }
    });

    // Handle logout button in dropdown
    var logoutBtn = el.querySelector('.admin-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeAllDropdowns();
        showModal();
      });
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.admin')) {
      closeAllDropdowns();
    }
  });

  cancelBtn && cancelBtn.addEventListener('click', function () {
    hideModal();
  });

  confirmBtn && confirmBtn.addEventListener('click', function () {
    hideModal();
    // simple client-side redirect to homepage
    window.location.href = 'index.html';
  });

  // close modal with Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('show')) {
      hideModal();
    }
  });

  var searchInput = document.querySelector('.search');
  if (searchInput) {
    var searchBox = document.createElement('div');
    searchBox.style.position = 'absolute';
    searchBox.style.zIndex = '200';
    searchBox.style.background = '#ffffff';
    searchBox.style.border = '1px solid #e0d5c7';
    searchBox.style.borderRadius = '8px';
    searchBox.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)';
    searchBox.style.padding = '6px 0';
    searchBox.style.display = 'none';
    searchBox.style.minWidth = '220px';
    document.body.appendChild(searchBox);

    function getSidebarRoutes() {
      var links = document.querySelectorAll('.sidebar a');
      return Array.from(links).map(function (link) {
        return {
          label: (link.textContent || '').replace(/^[^A-Za-z0-9]+\s*/, '').trim(),
          href: link.getAttribute('href')
        };
      }).filter(function (route) {
        return route.label && route.href;
      });
    }

    function positionSearchBox() {
      var rect = searchInput.getBoundingClientRect();
      searchBox.style.left = rect.left + 'px';
      searchBox.style.top = (rect.bottom + window.scrollY + 6) + 'px';
      searchBox.style.width = rect.width + 'px';
    }

    function renderSuggestions(query) {
      var routes = getSidebarRoutes();
      var lower = query.toLowerCase();
      var matches = routes.filter(function (route) {
        return route.label.toLowerCase().indexOf(lower) !== -1;
      });

      searchBox.innerHTML = '';
      if (!query || matches.length === 0) {
        searchBox.style.display = 'none';
        return [];
      }

      matches.forEach(function (route) {
        var item = document.createElement('div');
        item.textContent = route.label;
        item.style.padding = '8px 12px';
        item.style.cursor = 'pointer';
        item.style.fontSize = '14px';
        item.style.color = '#6b5b4b';
        item.onmouseover = function () {
          item.style.backgroundColor = '#f5f0e8';
        };
        item.onmouseout = function () {
          item.style.backgroundColor = 'transparent';
        };
        item.onclick = function () {
          window.location.href = route.href;
        };
        searchBox.appendChild(item);
      });

      positionSearchBox();
      searchBox.style.display = 'block';
      return matches;
    }

    searchInput.addEventListener('input', function () {
      renderSuggestions(searchInput.value || '');
    });

    searchInput.addEventListener('focus', function () {
      renderSuggestions(searchInput.value || '');
    });

    searchInput.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var matches = renderSuggestions(searchInput.value || '');
      if (matches.length === 1) {
        window.location.href = matches[0].href;
      }
    });

    document.addEventListener('click', function (e) {
      if (e.target !== searchInput && !searchBox.contains(e.target)) {
        searchBox.style.display = 'none';
      }
    });

    window.addEventListener('resize', positionSearchBox);
    window.addEventListener('scroll', positionSearchBox);
  }
});

// Table pagination for .table-card tables (5 rows per page)
document.addEventListener('DOMContentLoaded', function () {
  var tableCards = document.querySelectorAll('.table-card');
  tableCards.forEach(function (card) {
    var table = card.querySelector('table');
    if (!table) return;
    var tbody = table.querySelector('tbody');
    var rows = Array.from(tbody.querySelectorAll('tr'));
    var rowsPerPage = 5;
    var currentPage = 1;
    var footerInfo = card.querySelector('.footer span');
    var paginationEl = card.querySelector('.pagination');

    function renderPage(page) {
      var start = (page - 1) * rowsPerPage;
      var end = start + rowsPerPage;
      rows.forEach(function (r, idx) {
        r.style.display = (idx >= start && idx < end) ? '' : 'none';
      });
      // update footer info
      if (footerInfo) {
        footerInfo.textContent = 'Showing data ' + (start + 1) + ' to ' + Math.min(end, rows.length) + ' of ' + rows.length + ' entries';
      }
      renderPagination();
    }

    function renderPagination() {
      if (!paginationEl) return;
      paginationEl.innerHTML = '';
      var pageCount = Math.max(1, Math.ceil(rows.length / rowsPerPage));

      var prev = document.createElement('span');
      prev.textContent = '‹';
      prev.className = 'pager-prev';
      prev.addEventListener('click', function () {
        if (currentPage > 1) { currentPage--; renderPage(currentPage); }
      });
      paginationEl.appendChild(prev);

      for (var i = 1; i <= pageCount; i++) {
        (function (i) {
          var p = document.createElement('span');
          p.textContent = i;
          if (i === currentPage) p.className = 'active-page';
          p.addEventListener('click', function () { currentPage = i; renderPage(currentPage); });
          paginationEl.appendChild(p);
        })(i);
      }

      var next = document.createElement('span');
      next.textContent = '›';
      next.className = 'pager-next';
      next.addEventListener('click', function () {
        if (currentPage < pageCount) { currentPage++; renderPage(currentPage); }
      });
      paginationEl.appendChild(next);
    }

    // initial render
    renderPage(currentPage);
  });
});

// ==================== Notification Badge Update Function ====================
// This function is called by all admin pages to update the notification badge
// with the correct count, accounting for dismissed notifications

function makeNotificationKey(type, message, link) {
  return [type, message, link].join('|');
}

function getDismissedNotifications() {
  try {
    var raw = localStorage.getItem('slumlink_dismissed_notifications');
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('Failed to load dismissed notifications:', error);
    return [];
  }
}

function updateNotificationBadge() {
  var badgeElement = document.getElementById('notificationBadge');
  if (!badgeElement) return;

  var dismissedNotifications = getDismissedNotifications();
  var totalCount = 0;
  var countsFetched = 0;
  var totalRequests = 4;

  function checkAllFetched() {
    if (countsFetched === totalRequests) {
      badgeElement.textContent = totalCount;
      badgeElement.style.display = totalCount > 0 ? 'flex' : 'none';
    }
  }

  // Fetch active residents with updates
  fetch('/api/slum-dweller/active')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var updates = (data.data || [])
        .filter(function(account) {
          var updateCount = Number(account.spouse_updates || 0) + Number(account.child_updates || 0);
          return updateCount > 0;
        })
        .map(function(account) {
          return {
            type: 'Active Resident',
            message: 'Resident "' + (account.full_name || 'Unknown') + '" from "' + (account.area || '-') + '" has submitted family member updates for review.',
            link: 'SlumResidentsInfo.html?id=' + account.id
          };
        });

      var activeUpdates = updates.filter(function(notif) {
        return dismissedNotifications.indexOf(makeNotificationKey(notif.type, notif.message, notif.link)) === -1;
      });
      totalCount += activeUpdates.length;
      countsFetched++;
      checkAllFetched();
    })
    .catch(function() { countsFetched++; checkAllFetched(); });

  // Fetch pending NGOs
  fetch('/api/ngo/pending')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var ngos = (data.data || []).map(function(ngo) {
        return {
          type: 'NGO Signup',
          message: 'New NGO "' + (ngo.org_name || 'Unknown') + '" has signed up and is awaiting verification.',
          link: 'adminVerifyNgo.html'
        };
      });
      
      var activeNgos = ngos.filter(function(notif) {
        return dismissedNotifications.indexOf(makeNotificationKey(notif.type, notif.message, notif.link)) === -1;
      });
      totalCount += activeNgos.length;
      countsFetched++;
      checkAllFetched();
    })
    .catch(function() { countsFetched++; checkAllFetched(); });

  // Fetch pending slum dwellers
  fetch('/api/slum-dweller/pending')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var dwellers = (data.data || []).map(function(account) {
        return {
          type: 'Slum Resident',
          message: 'New pending account "' + (account.full_name || 'Unknown') + '" from slum "' + (account.area || '-') + '" awaiting verification.',
          link: 'SlumPendingAccounts.html?slum=' + encodeURIComponent(account.area || '')
        };
      });
      
      var activeDwellers = dwellers.filter(function(notif) {
        return dismissedNotifications.indexOf(makeNotificationKey(notif.type, notif.message, notif.link)) === -1;
      });
      totalCount += activeDwellers.length;
      countsFetched++;
      checkAllFetched();
    })
    .catch(function() { countsFetched++; checkAllFetched(); });

  // Fetch recent campaigns
  fetch('/api/campaigns')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var campaigns = (data.data || []).slice(0, 10).map(function(campaign) {
        var isLocal = String(campaign.org_type || '').toLowerCase() === 'localauthority';
        var typeLabel = isLocal ? 'Local Authority Campaign' : 'NGO Campaign';
        var orgName = campaign.org_name || 'Organization';
        var link = isLocal
          ? 'adminlocalcampaigninfo.html?org=' + encodeURIComponent(orgName)
          : 'adminactivengoinfo.html?ngo=' + encodeURIComponent(orgName);

        return {
          type: typeLabel,
          message: 'New campaign "' + (campaign.title || 'Untitled') + '" created by ' + orgName + ' in "' + (campaign.slum_area || '-') + '".',
          link: link
        };
      });

      var activeCampaigns = campaigns.filter(function(notif) {
        return dismissedNotifications.indexOf(makeNotificationKey(notif.type, notif.message, notif.link)) === -1;
      });
      totalCount += activeCampaigns.length;
      countsFetched++;
      checkAllFetched();
    })
    .catch(function() { countsFetched++; checkAllFetched(); });
}

// Update badge on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateNotificationBadge);
} else {
  updateNotificationBadge();
}

