// Reveal on scroll
const revealEls = document.querySelectorAll(".reveal");
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    });
  },
  { threshold: 0.15 },
);
revealEls.forEach((el) => io.observe(el));

// Scroll rail: mouse-wheel icon travels the dashed line with scroll progress
const plane = document.getElementById("planeSvg");
const progress = document.getElementById("railProgress");
const rail = document.querySelector(".scroll-rail");
let lastScrollY = window.scrollY;
function updateRail() {
  const doc = document.documentElement;
  const scrolled = doc.scrollTop;
  const max = doc.scrollHeight - doc.clientHeight;
  const pct = max > 0 ? Math.min(scrolled / max, 1) : 0;

  if (progress) {
    progress.style.strokeDashoffset = String(100 - pct * 100);
  }

  if (plane && rail) {
    const h = rail.clientHeight - 30;
    plane.style.top = 4 + pct * h + "px";
  }

  const goingDown = scrolled >= lastScrollY;
  lastScrollY = scrolled;
  const inner = document.getElementById("mouseInner");
  if (inner) {
    inner.setAttribute(
      "transform",
      goingDown ? "" : "translate(0,30) scale(1,-1)",
    );
  }
}
document.addEventListener("scroll", updateRail, { passive: true });
updateRail();

// Live local time in hero
function tick() {
  const el = document.getElementById("clockline");
  if (!el) return;
  const now = new Date();
  const h = now.getHours() % 12 || 12;
  const m = String(now.getMinutes()).padStart(2, "0");
  const ampm = now.getHours() >= 12 ? "PM" : "AM";
  el.textContent = `Lagos, Nigeria · ${h}:${m} ${ampm}`;
}
tick();
setInterval(tick, 30000);

// ---------------------------------------------------------------
// Work lightbox: expands a clicked project into a gallery modal
// supporting multiple images via data-img comma-separated lists.
// ---------------------------------------------------------------
(function () {
  const cards = document.querySelectorAll(".work-card");
  const lightbox = document.getElementById("lightbox");
  if (!lightbox || !cards.length) return;

  const frame = document.getElementById("lightboxFrame");
  const backdrop = document.getElementById("lightboxBackdrop");
  const closeBtn = document.getElementById("lightboxClose");
  const tagEl = document.getElementById("lightboxTag");
  const nameEl = document.getElementById("lightboxName");
  let lastFocused = null;

  // Track gallery state
  let currentImages = [];
  let currentIndex = 0;

  // Create Nav controls inside lightbox figure
  const figure = lightbox.querySelector(".lightbox-figure");

  const navContainer = document.createElement("div");
  navContainer.className = "lightbox-nav";
  navContainer.innerHTML = `
    <button class="lightbox-btn prev-btn" id="lightboxPrev" aria-label="Previous image">‹</button>
    <span class="lightbox-counter" id="lightboxCounter">1 / 1</span>
    <button class="lightbox-btn next-btn" id="lightboxNext" aria-label="Next image">›</button>
  `;
  figure.appendChild(navContainer);

  const prevBtn = document.getElementById("lightboxPrev");
  const nextBtn = document.getElementById("lightboxNext");
  const counterEl = document.getElementById("lightboxCounter");

  function renderImage(index) {
    if (!currentImages.length) return;

    // Loop navigation boundaries
    if (index < 0) index = currentImages.length - 1;
    if (index >= currentImages.length) index = 0;
    currentIndex = index;

    const existingImg = frame.querySelector("img");

    // Create the new image
    const nextImg = document.createElement("img");
    nextImg.src = currentImages[currentIndex];
    nextImg.alt = `${nameEl.textContent} - Image ${currentIndex + 1}`;

    if (existingImg) {
      // Fade out old image first for a smooth cross-fade transition
      existingImg.classList.remove("loaded");

      setTimeout(() => {
        frame.innerHTML = "";
        frame.appendChild(nextImg);
        // Trigger reflow to start fade-in
        void nextImg.offsetWidth;
        nextImg.classList.add("loaded");
      }, 150);
    } else {
      // First image load inside lightbox
      frame.appendChild(nextImg);
      requestAnimationFrame(() => {
        nextImg.classList.add("loaded");
      });
    }

    // Update nav counter visibility
    if (currentImages.length > 1) {
      navContainer.style.display = "flex";
      counterEl.textContent = `${currentIndex + 1} / ${currentImages.length}`;
    } else {
      navContainer.style.display = "none";
    }
  }

  function openLightbox(card) {
    lastFocused = document.activeElement;

    const rawImgSrc = card.getAttribute("data-img");
    const tag = card.querySelector(".work-tag")?.textContent || "";
    const name = card.querySelector(".work-name")?.textContent || "";
    const thumbBg = card.querySelector(".work-thumb")?.style.background || "";

    tagEl.textContent = tag;
    nameEl.textContent = name;

    frame.innerHTML = "";
    frame.classList.remove("lightbox-frame--fallback");

    if (rawImgSrc) {
      // Parse all comma-separated image paths
      currentImages = rawImgSrc
        .split(",")
        .map((path) => path.trim())
        .filter(Boolean);
      renderImage(0);
    } else {
      currentImages = [];
      navContainer.style.display = "none";
      frame.classList.add("lightbox-frame--fallback");
      frame.style.background = thumbBg;
    }

    lightbox.classList.add("active");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    closeBtn.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove("active");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    frame.style.background = "";
    if (lastFocused && typeof lastFocused.focus === "function")
      lastFocused.focus();
  }

  cards.forEach((card) => {
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    const name = card.querySelector(".work-name")?.textContent || "project";
    card.setAttribute("aria-label", "View " + name + " full screen");

    card.addEventListener("click", () => openLightbox(card));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLightbox(card);
      }
    });
  });

  // Navigation handlers
  prevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    renderImage(currentIndex - 1);
  });
  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    renderImage(currentIndex + 1);
  });

  closeBtn.addEventListener("click", closeLightbox);
  backdrop.addEventListener("click", closeLightbox);

  // Keypress listener (Left / Right arrows for navigation, Escape to close)
  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("active")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") renderImage(currentIndex - 1);
    if (e.key === "ArrowRight") renderImage(currentIndex + 1);
  });
})();

const contactForm = document.getElementById("contactForm");
const formNote = document.getElementById("formNote");
const submitBtn = document.getElementById("submitBtn");

if (contactForm) {
  contactForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Disable button & show loading state
    submitBtn.disabled = true;
    formNote.style.color = "var(--gray)";
    formNote.textContent = "Sending message...";

    const formData = new FormData(contactForm);

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        // Success message after submission
        formNote.style.color = "var(--lime)";
        formNote.textContent =
          "✓ Message sent successfully! I will get back to you shortly.";
        contactForm.reset();
      } else {
        // Error handling
        formNote.style.color = "#ff6b6b";
        formNote.textContent =
          result.message || "Something went wrong. Please try again.";
      }
    } catch (error) {
      formNote.style.color = "#ff6b6b";
      formNote.textContent = "Network error. Please check your connection.";
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// ---------------------------------------------------------------
// Mobile Menu: full-screen overlay, toggled by one button that
// always stays above it (no separate backdrop to fight with).
// ---------------------------------------------------------------
(function () {
  const toggle = document.getElementById("mobileToggle");
  const nav = document.getElementById("navLinks");
  if (!toggle || !nav) return;

  function setOpen(open) {
    nav.classList.toggle("active", open);
    toggle.classList.toggle("active", open);
    toggle.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  }

  toggle.addEventListener("click", () => {
    setOpen(!nav.classList.contains("active"));
  });

  // Tapping a link closes the menu
  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });

  // Escape closes it
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("active")) setOpen(false);
  });
})();

// ---------------------------------------------------------------
// Theme Toggle Switcher (White default -> Green theme)
// Works with every .theme-toggle button (header + mobile menu)
// ---------------------------------------------------------------
(function () {
  const toggleBtns = document.querySelectorAll('.theme-toggle');
  const toggleImgs = document.querySelectorAll('.theme-toggle-img');
  if (!toggleBtns.length) return;

  const OFF_IMG = 'off-button.png';
  const ON_IMG = 'on-button.png';

  function applyTheme(isGreen) {
    document.body.classList.toggle('theme-green', isGreen);
    toggleImgs.forEach((img) => {
      img.src = isGreen ? ON_IMG : OFF_IMG;
    });
  }

  // Check saved theme preference
  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem('site-theme');
  } catch (e) {}
  if (savedTheme === 'green') applyTheme(true);

  toggleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const isGreen = !document.body.classList.contains('theme-green');
      applyTheme(isGreen);
      try {
        localStorage.setItem('site-theme', isGreen ? 'green' : 'white');
      } catch (e) {}
    });
  });
})();
