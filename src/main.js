document.addEventListener("DOMContentLoaded", () => {
  // ================= MOBILE MENU =================
  let menuToggle = document.querySelector(".menu-toggle");
  if (!menuToggle) {
    menuToggle = document.createElement("button");
    menuToggle.className = "menu-toggle";
    menuToggle.innerHTML = "☰";
    menuToggle.setAttribute("aria-label", "Toggle menu");
  }

  const nav = document.querySelector(".nav");
  const header = document.querySelector(".header");
  const signinBtn = document.querySelector(".signin-btn");

  const setupMobileMenu = () => {
    if (!header || !nav || !signinBtn) return;

    if (window.innerWidth <= 768) {
      if (!header.contains(menuToggle)) header.insertBefore(menuToggle, signinBtn);

      // avoid double binding
      if (!menuToggle.dataset.bound) {
        menuToggle.dataset.bound = "1";

        menuToggle.addEventListener("click", () => {
          nav.classList.toggle("active");
          menuToggle.innerHTML = nav.classList.contains("active") ? "✕" : "☰";
        });

        document.addEventListener("click", (e) => {
          if (!header.contains(e.target) && nav.classList.contains("active")) {
            nav.classList.remove("active");
            menuToggle.innerHTML = "☰";
          }
        });
      }
    } else {
      // desktop: cleanup
      nav.classList.remove("active");
      if (header.contains(menuToggle)) header.removeChild(menuToggle);
      menuToggle.innerHTML = "☰";
    }
  };

  setupMobileMenu();
  window.addEventListener("resize", setupMobileMenu);

  // ================= HERO CTA SCROLL (✅ no href, no hover link preview) =================
  document.querySelectorAll(".js-scroll").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.target;
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // ================= SCROLL REVEAL (NO FLICKER) =================
  const allTargets = Array.from(document.querySelectorAll(".section, .card, .stat"));

  // ✅ never hide anything inside the hero (prevents your "jump")
  const targets = allTargets.filter((el) => !el.closest(".hero"));

  // ✅ only hide elements that are BELOW the fold at load
  const hideIfBelowFold = (el) => {
    const r = el.getBoundingClientRect();
    const belowFold = r.top > window.innerHeight * 0.92;
    if (belowFold) el.classList.add("will-animate");
  };

  targets.forEach(hideIfBelowFold);

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.remove("will-animate");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -80px 0px" }
    );

    targets.forEach((el) => io.observe(el));
  } else {
    // fallback: show everything
    targets.forEach((el) => el.classList.remove("will-animate"));
  }

  // ================= HERO FULL-SCREEN IMAGE SLIDER =================
  const SLIDES = [
    { src: "/src/images/slumimagefinal.jpeg", alt: "Community support and outreach" },
    { src: "/src/images/slumtwo.png", alt: "A neighborhood view" },
    { src: "/src/images/slumpeopleseven.png", alt: "People in the community" },
    { src: "/src/images/jaago.jpg", alt: "Community support initiative" },
    { src: "/src/images/slumpeoplesix.png", alt: "Household and community scene" },
    { src: "/src/images/slumpeoplefour.png", alt: "Support distribution and outreach" },
    { src: "/src/images/mastul.jpeg", alt: "Volunteer/organizer profile" },
    { src: "/src/images/slumpeoplefive.png", alt: "Campaign activity and beneficiary support" },
  ];

  function buildHeroCarousel(trackEl, slides) {
    trackEl.innerHTML = "";

    // slides + clone first (loop)
    const full = slides.concat([slides[0]]);

    full.forEach((s, idx) => {
      const slide = document.createElement("div");
      slide.className = "carousel-slide";

      const img = document.createElement("img");
      img.src = s.src;
      img.alt = idx === full.length - 1 ? "" : s.alt;
      img.loading = idx === 0 ? "eager" : "lazy";

      slide.appendChild(img);
      trackEl.appendChild(slide);
    });
  }

  function initHeroCarousel() {
    const carouselEl = document.querySelector('[data-carousel="hero"]');
    if (!carouselEl) return;

    const track = carouselEl.querySelector(".carousel-track");
    if (!track) return;

    buildHeroCarousel(track, SLIDES);

    let index = 0;
    let timer = null;

    const totalSlides = SLIDES.length;
    const lastIndex = totalSlides; // clone index

    const slideToIndex = (nextIndex) => {
      index = nextIndex;
      track.classList.remove("no-anim");
      track.style.transform = `translateX(-${index * 100}%)`;
    };

    const stopAutoSlide = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    const startAutoSlide = () => {
      stopAutoSlide();
      timer = setInterval(() => {
        slideToIndex(index + 1);
      }, 4000);
    };

    track.addEventListener("transitionend", () => {
      if (index === lastIndex) {
        track.classList.add("no-anim");
        index = 0;
        track.style.transform = "translateX(0%)";
        requestAnimationFrame(() => track.classList.remove("no-anim"));
      }
    });

    carouselEl.addEventListener("mouseenter", stopAutoSlide);
    carouselEl.addEventListener("mouseleave", startAutoSlide);
    carouselEl.addEventListener("touchstart", stopAutoSlide, { passive: true });
    carouselEl.addEventListener("touchend", startAutoSlide);

    startAutoSlide();
  }

  initHeroCarousel();
});
