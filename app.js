/* ===========================================================
   Lions Club of Kathmandu — Wonder Women
   Interactions: nav, scroll-reveal, password-gated gallery
   =========================================================== */
(function () {
  "use strict";

  /* ---- CONFIG ----------------------------------------------------
     Change the gallery password here. Keep it simple to share with
     your committee. (It is stored in this file only.)            */
  const GALLERY_PASSWORD = "lck2026";
  const STORAGE_KEY = "lck_gallery_photos_v1";
  const UNLOCK_KEY  = "lck_gallery_unlocked";
  /* --------------------------------------------------------------- */

  /* ---------- Mobile nav ---------- */
  const toggle = document.getElementById("navToggle");
  const links  = document.getElementById("navLinks");
  if (toggle && links) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => links.classList.remove("open"))
    );
  }

  /* ---------- Scroll reveal ---------- */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
  // Failsafe: never leave content hidden if the observer doesn't fire.
  window.addEventListener("load", () =>
    setTimeout(
      () => document.querySelectorAll(".reveal:not(.in)").forEach((el) => el.classList.add("in")),
      1500
    )
  );

  /* ---------- Toast ---------- */
  const toast = document.getElementById("toast");
  let toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  /* =========================================================
     GALLERY
     ========================================================= */
  const grid = document.getElementById("galleryGrid");
  const fileInput = document.getElementById("galleryFile");
  const addTile = document.getElementById("galleryAdd");

  // Starter captions removed — real club photos are used (see DEFAULT_PHOTOS).

  // Built-in club photos — always shown. Members can ADD more on top.
  const DEFAULT_PHOTOS = [
    { src: "assets/photos/charter-handover.png",   cap: "Charter Handover Program" },
    { src: "assets/photos/charter-celebration.png", cap: "Charter Celebration" },
    { src: "assets/photos/cultural-group.png",      cap: "Cultural Program" },
    { src: "assets/photos/cleanup-program.png",     cap: "Cleanup & Sanitation Drive" },
    { src: "assets/photos/book-distribution.png",   cap: "Stationery Distribution" },
    { src: "assets/photos/blood-donation.png",      cap: "Blood Donation Camp" },
    { src: "assets/photos/temple-visit.png",        cap: "Heritage Walk" },
    { src: "assets/photos/model-club.png",          cap: "Model Club Recognition" },
  ];

  function loadPhotos() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }
  function savePhotos(arr) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch (e) {
      showToast("Storage full — try fewer / smaller photos.");
    }
  }
  function isUnlocked() {
    return sessionStorage.getItem(UNLOCK_KEY) === "1";
  }
  function setUnlocked() {
    sessionStorage.setItem(UNLOCK_KEY, "1");
  }

  function renderGallery() {
    if (!grid) return;
    const userPhotos = loadPhotos();
    // remove existing tiles (keep the add tile)
    grid.querySelectorAll(".g-item:not(.g-add)").forEach((n) => n.remove());

    const frag = document.createDocumentFragment();

    // 1) Built-in club photos (always shown, not deletable)
    DEFAULT_PHOTOS.forEach((p) => {
      const div = document.createElement("div");
      div.className = "g-item";
      div.innerHTML =
        '<img src="' + p.src + '" alt="' + esc(p.cap) + '" loading="lazy">' +
        '<div class="g-cap">' + esc(p.cap) + "</div>";
      frag.appendChild(div);
    });

    // 2) Member-added photos (deletable when unlocked)
    userPhotos.forEach((p, idx) => {
      const div = document.createElement("div");
      div.className = "g-item";
      div.innerHTML =
        '<img src="' + p.src + '" alt="' + esc(p.cap || "Club photo") + '">' +
        (p.cap ? '<div class="g-cap">' + esc(p.cap) + "</div>" : "") +
        '<button class="g-del" title="Remove photo" data-idx="' + idx + '">' +
        svg("trash") + "</button>";
      frag.appendChild(div);
    });

    grid.insertBefore(frag, addTile);

    // wire delete buttons
    grid.querySelectorAll(".g-del").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!ensureUnlocked()) return;
        const i = parseInt(btn.getAttribute("data-idx"), 10);
        const arr = loadPhotos();
        arr.splice(i, 1);
        savePhotos(arr);
        renderGallery();
        showToast("Photo removed.");
      });
    });
  }

  /* ---------- Password modal ---------- */
  const modalBg = document.getElementById("pwModal");
  const pwInput = document.getElementById("pwInput");
  const pwErr   = document.getElementById("pwErr");
  const pwOk    = document.getElementById("pwOk");
  const pwCancel = document.getElementById("pwCancel");
  let pendingAction = null;

  function openModal() {
    if (!modalBg) return;
    pwInput.value = "";
    pwErr.textContent = "";
    modalBg.classList.add("open");
    setTimeout(() => pwInput.focus(), 50);
  }
  function closeModal() {
    modalBg && modalBg.classList.remove("open");
    pendingAction = null;
  }
  function tryPassword() {
    if (pwInput.value === GALLERY_PASSWORD) {
      setUnlocked();
      closeModal();
      showToast("Unlocked — you can now add photos.");
      const act = pendingAction;
      pendingAction = null;
      if (typeof act === "function") act();
    } else {
      pwErr.textContent = "Incorrect password. Try again.";
      pwInput.select();
    }
  }
  // ensureUnlocked: if locked, opens modal and stores the action to run after unlock
  function ensureUnlocked(action) {
    if (isUnlocked()) {
      if (typeof action === "function") action();
      return true;
    }
    pendingAction = action || null;
    openModal();
    return false;
  }

  if (pwOk) pwOk.addEventListener("click", tryPassword);
  if (pwCancel) pwCancel.addEventListener("click", closeModal);
  if (pwInput)
    pwInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") tryPassword();
      if (e.key === "Escape") closeModal();
    });
  if (modalBg)
    modalBg.addEventListener("click", (e) => {
      if (e.target === modalBg) closeModal();
    });

  /* ---------- Add photos flow ---------- */
  function pickFiles() {
    fileInput && fileInput.click();
  }
  if (addTile) {
    addTile.addEventListener("click", () => {
      ensureUnlocked(pickFiles);
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      let remaining = files.length;
      const arr = loadPhotos();
      files.forEach((file) => {
        if (!file.type.startsWith("image/")) {
          remaining--;
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          downscale(ev.target.result, 1280, (dataUrl) => {
            arr.push({ src: dataUrl, cap: cleanName(file.name) });
            remaining--;
            if (remaining <= 0) {
              savePhotos(arr);
              renderGallery();
              showToast(files.length + " photo" + (files.length > 1 ? "s" : "") + " added.");
            }
          });
        };
        reader.readAsDataURL(file);
      });
      fileInput.value = "";
    });
  }

  /* downscale large images so localStorage doesn't overflow */
  function downscale(dataUrl, maxW, cb) {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxW) {
        height = Math.round((height * maxW) / width);
        width = maxW;
      }
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      c.getContext("2d").drawImage(img, 0, 0, width, height);
      try {
        cb(c.toDataURL("image/jpeg", 0.82));
      } catch (e) {
        cb(dataUrl);
      }
    };
    img.onerror = () => cb(dataUrl);
    img.src = dataUrl;
  }

  function cleanName(name) {
    return name
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase())
      .slice(0, 40);
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m])
    );
  }

  /* small inline icon set */
  function svg(name) {
    const I = {
      image:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-4.5-4.5L7 20"/></svg>',
      trash:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/></svg>',
    };
    return I[name] || "";
  }

  renderGallery();
})();
