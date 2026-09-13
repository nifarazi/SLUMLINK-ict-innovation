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
