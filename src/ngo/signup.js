const form = document.getElementById("orgForm");

const modal = document.getElementById("successModal");
const goHomeBtn = document.getElementById("goHomeBtn");
const modalOverlay = document.getElementById("modalOverlay");

const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");

let submitAttempted = false;

const fieldIds = [
  "orgName",
  "email",
  "phone",
  "license",
  "orgAge",
  "password",
  "confirmPassword",
];

function getInput(id) {
  return document.getElementById(id);
}
function getErrorBox(id) {
  return document.getElementById(`err-${id}`);
}

function setFieldError(input, message) {
  const wrap = input.closest(".field");
  const box = getErrorBox(input.id);
  if (!box) return;

  if (!submitAttempted) {
    box.textContent = "";
    wrap?.classList.remove("is-error");
    input.removeAttribute("aria-invalid");
    return;
  }

  if (message) {
    box.textContent = message;
    wrap?.classList.add("is-error");
    input.setAttribute("aria-invalid", "true");
  } else {
    box.textContent = "";
    wrap?.classList.remove("is-error");
    input.removeAttribute("aria-invalid");
  }
}

/* ✅ Regex validation */
function normalizePhone(v) {
  return String(v || "").trim().replace(/[\s-]/g, "");
}
function isValidBDPhone(v) {
  const s = normalizePhone(v);
  return /^(?:\+?88)?01[3-9][0-9]{8}$/.test(s);
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || "").trim());
}

function isValidPassword(v) {
  // 8+ chars, must include at least 1 letter + 1 number
  return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(String(v || ""));
}

function messageFor(input) {
  const v = (input.value || "").trim();

  // ✅ File check
  if (input.type === "file") {
    if (!input.files || input.files.length === 0) return "";
    const f = input.files[0];

    const allowed = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowed.includes(f.type)) {
      return "Upload PDF / JPG / PNG / DOC / DOCX only.";
    }
    return "";
  }

  // ✅ Phone
  if (input.id === "phone") {
    if (!v) return "";
    if (!isValidBDPhone(v))
      return "Enter a valid BD number (01XXXXXXXXX / 8801XXXXXXXXX / +8801XXXXXXXXX)";
    return "";
  }

  // ✅ Email
  if (input.id === "email") {
    if (!v) return "";
    if (!isValidEmail(v)) return "Enter a valid email address.";
    return "";
  }

  // ✅ Password
  if (input.id === "password") {
    if (!v) return "";
    if (!isValidPassword(v))
      return "Use 8+ characters. Mix letters & numbers.";
    return "";
  }

  // ✅ Confirm password
  if (input.id === "confirmPassword") {
    if (!v) return "";
    if (!isValidPassword(v))
      return "Use 8+ characters. Mix letters & numbers.";
    if (password.value !== confirmPassword.value) return "Passwords do not match.";
    return "";
  }

  // ✅ number constraints
  if (input.type === "number" && v) {
    const num = Number(v);
    if (Number.isNaN(num)) return "";
    if (input.min !== "" && num < Number(input.min)) return `Value must be ${input.min} or more.`;
    if (input.max !== "" && num > Number(input.max)) return `Value must be ${input.max} or less.`;
  }

  return "";
}

function validateField(input) {
  const msg = messageFor(input);
  setFieldError(input, msg);
  return !msg;
}

function validateAll() {
  let ok = true;
  let firstBad = null;

  for (const id of fieldIds) {
    const input = getInput(id);
    if (!input) continue;

    const valid = validateField(input);
    if (!valid) {
      ok = false;
      if (!firstBad) firstBad = input;
    }
  }

  if (!ok && firstBad) {
    firstBad.focus({ preventScroll: true });
    firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return ok;
}

/* Modal */
function openModal() {
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  goHomeBtn.focus();
}
function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = "";
}
function goHome() {
  window.location.href = "../../index.html";
}

goHomeBtn.addEventListener("click", () => {
  closeModal();
  goHome();
});
modalOverlay.addEventListener("click", () => {
  closeModal();
  goHome();
});
document.addEventListener("keydown", (e) => {
  if (!modal.hidden && e.key === "Escape") {
    closeModal();
    goHome();
  }
});

/* Validate on input after submit attempt */
form.addEventListener("input", (e) => {
  if (!submitAttempted) return;
  const t = e.target;
  if (!(t instanceof HTMLInputElement)) return;

  validateField(t);

  if (t.id === "password" || t.id === "confirmPassword") {
    validateField(confirmPassword);
  }
});

form.addEventListener("change", (e) => {
  if (!submitAttempted) return;
  const t = e.target;
  if (!(t instanceof HTMLInputElement)) return;

  validateField(t);
});

/* ✅ Submit => send to backend */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  submitAttempted = true;
  const ok = validateAll();

  if (!form.reportValidity()) return;
  if (!ok) return;

  try {
    const btn = form.querySelector("button[type='submit']");
    btn.disabled = true;
    btn.textContent = "Registering...";

    const fd = new FormData(form);

    const res = await fetch("/api/ngo/register", {
      method: "POST",
      body: fd,
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Registration failed.");
      btn.disabled = false;
      btn.textContent = "Register Account";
      return;
    }

    // ✅ success
    openModal();
  } catch (err) {
    console.error(err);
    alert("Server error. Please try again.");
  } finally {
    const btn = form.querySelector("button[type='submit']");
    btn.disabled = false;
    btn.textContent = "Register Account";
  }
});

/* Eye toggle */
document.querySelectorAll(".pw-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.getAttribute("data-target");
    const input = document.getElementById(targetId);
    if (!input) return;

    const toShow = input.type === "password";
    input.type = toShow ? "text" : "password";

    const icon = btn.querySelector("i");
    if (icon) {
      icon.className = toShow ? "fa-regular fa-eye" : "fa-regular fa-eye-slash";
    }

    btn.setAttribute("aria-pressed", toShow ? "true" : "false");
  });
});
