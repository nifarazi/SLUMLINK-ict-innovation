// Role configuration: EXACT screenshot wording
const roleConfig = {
  ngo: {
    label: "Email",
    placeholder: "e.g., org@mail.com",
    hint: "Use the official email you registered with SlumLink.",
    showSignup: true,
    signupLinkText: "Register your organization",
    signupHref: "/src/ngo/signup.html"
  },
  authority: {
    label: "Official email",
    placeholder: "e.g., officer@gov.bd",
    hint: "Use your verified government or city authority email.",
    showSignup: false
  },
  dweller: {
    label: "Slum Code",
    placeholder: "e.g., SR000123",
    hint: "Enter your assigned Slum Code.",
    showSignup: true,
    signupLinkText: "Sign up",
    signupHref: "/src/Slum_SignUp/signup.html"
  },
  admin: {
    label: "Admin ID",
    placeholder: "e.g., admin@slumlink.org",
    hint: "Reserved for verified SlumLink administrators.",
    showSignup: false
  }
};

// Local Authority credentials mapping
const localAuthorityCredentials = {
  "dhaka@gov.bd": "dhakaslum123",
  "chattogram@gov.bd": "chattogramslum123",
  "khulna@gov.bd": "khulnaslum123",
  "rajshahi@gov.bd": "rajashaislum123",
  "barishal@gov.bd": "barishalslum123",
  "sylhet@gov.bd": "sylhetslum123",
  "rangpur@gov.bd": "rangpurslum123",
  "mymensingh@gov.bd": "mymensinghslum123"
};

// For FK + correct creator tracking in DB
const localAuthorityMeta = {
  "dhaka@gov.bd":       { org_id: 1001, org_name: "Dhaka City Corporation" },
  "chattogram@gov.bd":  { org_id: 1002, org_name: "Chattogram City Corporation" },
  "khulna@gov.bd":      { org_id: 1003, org_name: "Khulna City Corporation" },
  "rajshahi@gov.bd":    { org_id: 1004, org_name: "Rajshahi City Corporation" },
  "barishal@gov.bd":    { org_id: 1005, org_name: "Barishal City Corporation" },
  "sylhet@gov.bd":      { org_id: 1006, org_name: "Sylhet City Corporation" },
  "rangpur@gov.bd":     { org_id: 1007, org_name: "Rangpur City Corporation" },
  "mymensingh@gov.bd":  { org_id: 1008, org_name: "Mymensingh City Corporation" }
};

function setSession(sessionObj){
  try { localStorage.setItem("SLUMLINK_SESSION", JSON.stringify(sessionObj)); } catch {}
}

const roleSelect = document.getElementById("roleSelect");
const identifierInput = document.getElementById("identifier");
const identifierLabel = document.getElementById("identifierLabel");
const identifierHint = document.getElementById("identifierHint");
const roleSubtitle = document.getElementById("roleSubtitle");

const signupRow = document.querySelector(".below-text");
const passwordInput = document.getElementById("password");
const togglePasswordBtn = document.querySelector(".toggle-password");

function setSignup(prefix, linkText, href) {
  if (!signupRow) return;

  let link = signupRow.querySelector("span.link-strong");
  if (!link) {
    signupRow.innerHTML = `${prefix} <span class="link-strong" style="cursor:pointer;text-decoration:underline">${linkText}</span>`;
    link = signupRow.querySelector("span.link-strong");
    if (link) {
      link.dataset.href = href;
      link.addEventListener("click", () => window.location.href = link.dataset.href);
    }
    return;
  }

  // clean prefix text
  const nodes = Array.from(signupRow.childNodes);
  const textNode = nodes.find(n => n.nodeType === Node.TEXT_NODE);
  if (textNode) textNode.textContent = prefix + " ";
  else signupRow.insertBefore(document.createTextNode(prefix + " "), link);

  link.textContent = linkText;
  link.dataset.href = href;
  // Remove old click listener and add new one
  link.replaceWith(link.cloneNode(true));
  link = signupRow.querySelector("span.link-strong");
  if (link) {
    link.addEventListener("click", () => window.location.href = link.dataset.href);
  }
}

function resetEyeClosed() {
  if (!passwordInput || !togglePasswordBtn) return;
  const icon = togglePasswordBtn.querySelector("i");

  passwordInput.type = "password";
  if (icon) {
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  }
}

function applyRole(selectedRole) {
  const config = roleConfig[selectedRole];
  if (!config) return;

  if (identifierLabel) identifierLabel.textContent = config.label;
  if (identifierInput) identifierInput.placeholder = config.placeholder;
  if (identifierHint) identifierHint.textContent = config.hint;

  // not used in screenshots
  if (roleSubtitle) roleSubtitle.textContent = "";

  // clear values
  if (identifierInput) identifierInput.value = "";
  if (passwordInput) passwordInput.value = "";

  // signup line
  if (signupRow) {
    if (config.showSignup) {
      signupRow.style.display = "block";
      setSignup("Don't have an account?", config.signupLinkText, config.signupHref);
    } else {
      signupRow.style.display = "none";
    }
  }

  // reset eye CLOSED after role change
  resetEyeClosed();
}

if (roleSelect) {
  // Pick up role from URL, e.g., /src/signin.html?role=dweller
  const params = new URLSearchParams(window.location.search);
  const urlRole = params.get("role");
  if (urlRole && roleConfig[urlRole]) {
    roleSelect.value = urlRole;
  }

  roleSelect.addEventListener("change", () => applyRole(roleSelect.value));
  applyRole(roleSelect.value);

  // Show one-time alert if redirected after signup with submitted flag
  const submitted = params.get("submitted");
  if (submitted === "1") {
    // Show success toast (for application submitted)
    try {
      const toast = document.createElement('div');
      toast.className = 'signin-toast';
      toast.innerHTML = [
        '<span class="icon" aria-hidden="true">',
          '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
            '<path d="M9 16.17 5.83 13l-1.42 1.41L9 19 20.59 7.41 19.17 6z"/>',
          '</svg>',
        '</span>',
        '<div class="toast-content">',
          '<strong>Success</strong>',
          '<div class="subtitle">Your application has been submitted successfully</div>',
        '</div>'
      ].join('');
      document.body.appendChild(toast);
      // Auto-dismiss after 2.5s
      setTimeout(() => {
        toast.classList.add('toast-hide');
        setTimeout(() => { try { toast.remove(); } catch {} }, 350);
      }, 2500);
    } catch (err) {}
    // Clean the URL to avoid repeat alerts on refresh
    params.delete("submitted");
    const qs = params.toString();
    const newUrl = window.location.pathname + (qs ? ("?" + qs) : "");
    window.history.replaceState(null, '', newUrl);
  }
}

// eye toggle (closed -> open)
togglePasswordBtn?.addEventListener("click", () => {
  if (!passwordInput) return;
  const icon = togglePasswordBtn.querySelector("i");
  if (!icon) return;

  const hidden = passwordInput.type === "password";
  passwordInput.type = hidden ? "text" : "password";

  if (hidden) {
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  } else {
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  }
});

// Function to show error notification
function showErrorNotification(message) {
  // Remove any existing error notification
  const existing = document.querySelector(".error-notification");
  if (existing) existing.remove();

  // Create error notification
  const notification = document.createElement("div");
  notification.className = "error-notification";
  notification.textContent = message;
  document.body.appendChild(notification);

  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    notification.style.animation = "slideIn 0.3s ease-out reverse";
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// Handle sign-in submit: redirect to appropriate dashboard
const signinForm = document.querySelector(".signin-form");
signinForm?.addEventListener("submit", (e) => {
  e.preventDefault();

  const role = roleSelect?.value;
  const identifier = identifierInput?.value?.trim();
  const password = passwordInput?.value?.trim();

  // Clear previous error states
  identifierInput?.classList.remove("has-error");
  passwordInput?.classList.remove("has-error");

  // Basic validation
  if (!identifier || !password) {
    if (!identifier) {
      identifierInput?.classList.add("has-error");
    }
    if (!password) {
      passwordInput?.classList.add("has-error");
    }
    showErrorNotification("Please fill all fields");
    return;
  }

  // Route based on role
  if (role === "ngo") {
    // ✅ NGO sign-in via backend (only accepted can proceed)
    fetch("/api/ngo/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: identifier, password }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => null);

        if (!r.ok) {
          const msg = data?.message || "Unable to sign in. Please try again.";
          showErrorNotification(msg);

          // mark fields as error for better UX
          identifierInput?.classList.add("has-error");
          passwordInput?.classList.add("has-error");
          return;
        }

        // success
        try {
          // store NGO info for later use (optional)
          localStorage.setItem("SLUMLINK_NGO_SESSION", JSON.stringify(data.data));
        } catch {}

        setSession({
          role: "ngo",
          org_id: data?.data?.org_id,
          org_type: "ngo",
          org_name: data?.data?.org_name,
          email: data?.data?.email
        });

        // show success toast
        try {
          const toast = document.createElement("div");
          toast.className = "signin-toast";
          toast.innerHTML = [
            '<span class="icon" aria-hidden="true">',
            '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
            '<path d="M9 16.17 5.83 13l-1.42 1.41L9 19 20.59 7.41 19.17 6z"/>',
            "</svg>",
            "</span>",
            '<div class="toast-content">',
            "<strong>Success</strong>",
            '<div class="subtitle">You are signed in successfully</div>',
            "</div>",
          ].join("");
          document.body.appendChild(toast);
        } catch {}

        setTimeout(() => {
          window.location.href = "/src/ngo/ngo-dashboard.html";
        }, 1200);
      })
      .catch(() => {
        showErrorNotification("Network error. Please try again.");
      });

    return; // ✅ prevent falling into other role branches
  } else if (role === "admin") {
    // Local admin authentication (static credentials)
    // Only allow access when Email == admin@slumlink.org and password == admin123
    const loginError = document.getElementById("loginError");

    // Clear previous inline error
    if (loginError) {
      loginError.style.display = "none";
      loginError.textContent = "";
    }

    if (identifier === "admin@slumlink.org" && password === "admin123") {
      setSession({ role: "admin" });

      // success toast then redirect to Admin Dashboard
      try {
        const toast = document.createElement('div');
        toast.className = 'signin-toast';
        toast.innerHTML = [
          '<span class="icon" aria-hidden="true">',
            '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
              '<path d="M9 16.17 5.83 13l-1.42 1.41L9 19 20.59 7.41 19.17 6z"/>',
            '</svg>',
          '</span>',
          '<div class="toast-content">',
            '<strong>Success</strong>',
            '<div class="subtitle">You are signed in successfully</div>',
          '</div>'
        ].join('');
        document.body.appendChild(toast);
      } catch (err) {}

      setTimeout(() => {
        window.location.href = "/src/admin/adminSlumAnalytics.html";
      }, 1500);
    } else {
      // Invalid admin credentials
      identifierInput?.classList.add("has-error");
      passwordInput?.classList.add("has-error");
      showErrorNotification("Incorrect Email or  Password has been entered");

      if (loginError) {
        loginError.textContent = "Incorrect Email or  Password has been entered";
        loginError.style.display = "block";
      }
    }

  } else if (role === "authority") {
    // Local Authority authentication with specific email-password pairs
    const loginError = document.getElementById("loginError");

    // Clear previous inline error
    if (loginError) {
      loginError.style.display = "none";
      loginError.textContent = "";
    }

    // Check if email exists in the credentials map and password matches
    const isValidAuthority = localAuthorityCredentials[identifier] === password;

    if (isValidAuthority) {
      const meta = localAuthorityMeta[identifier];
      if (!meta) {
        showErrorNotification("Authority account is not mapped to an org_id.");
        return;
      }

      setSession({
        role: "localauthority",
        org_id: meta.org_id,
        org_type: "localauthority",
        org_name: meta.org_name,
        email: identifier
      });

      // Success toast then redirect to Local Authority Dashboard
      try {
        const toast = document.createElement('div');
        toast.className = 'signin-toast';
        toast.innerHTML = [
          '<span class="icon" aria-hidden="true">',
            '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
              '<path d="M9 16.17 5.83 13l-1.42 1.41L9 19 20.59 7.41 19.17 6z"/>',
            '</svg>',
          '</span>',
          '<div class="toast-content">',
            '<strong>Success</strong>',
            '<div class="subtitle">You are signed in successfully</div>',
          '</div>'
        ].join('');
        document.body.appendChild(toast);
      } catch (err) {}

      setTimeout(() => {
        window.location.href = "/src/localauthority/local-dashboard.html";
      }, 1500);
    } else {
      // Invalid credentials
      identifierInput?.classList.add("has-error");
      passwordInput?.classList.add("has-error");
      showErrorNotification("Incorrect Email or  Password has been entered");

      if (loginError) {
        loginError.textContent = "Incorrect Email or  Password has been entered";
        loginError.style.display = "block";
      }
    }
  } else if (role === "dweller") {
    // Authenticate Slum Dweller using slum_code and password via backend
    const loginError = document.getElementById("loginError");
    
    // Clear previous error state
    if (loginError) {
      loginError.style.display = "none";
      loginError.textContent = "";
    }

    fetch("/api/slum-dweller/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slum_code: identifier, password }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => null);

        if (!r.ok) {
          // Show error toast notification like admin and local authority
          const msg = data?.message || "Invalid slum code or password";
          showErrorNotification("Incorrect Slum Code or Password has been entered");

          // Mark fields as error for better UX
          identifierInput?.classList.add("has-error");
          passwordInput?.classList.add("has-error");

          // Also show inline error message for consistency
          if (loginError) {
            loginError.textContent = "Incorrect Slum Code or Password has been entered";
            loginError.style.display = "block";
          }
          return;
        }

        // Success - store user info
        try {
          localStorage.setItem('SLUMLINK_CURRENT_USER', JSON.stringify({
            id: data.data.id,
            slum_code: data.data.slum_code,
            name: data.data.full_name,
            mobile: data.data.mobile
          }));
        } catch {}

        setSession({
          role: "dweller",
          slum_code: data?.data?.slum_code,
          id: data?.data?.id
        });

        // Show success toast
        try {
          const toast = document.createElement("div");
          toast.className = "signin-toast";
          toast.innerHTML = [
            '<span class="icon" aria-hidden="true">',
            '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
            '<path d="M9 16.17 5.83 13l-1.42 1.41L9 19 20.59 7.41 19.17 6z"/>',
            "</svg>",
            "</span>",
            '<div class="toast-content">',
            "<strong>Success</strong>",
            '<div class="subtitle">You are signed in successfully</div>',
            "</div>",
          ].join("");
          document.body.appendChild(toast);
        } catch {}

        setTimeout(() => {
          window.location.href = "/src/Slum_Dwellers/dashboard.html";
        }, 1200);
      })
      .catch(() => {
        // Show network error toast and inline message
        showErrorNotification("Network error. Please try again.");
        
        if (loginError) {
          loginError.textContent = "Network error. Please try again.";
          loginError.style.display = "block";
        }
      });

    return; // Prevent falling into other role branches
  }
});
