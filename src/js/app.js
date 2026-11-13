(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  $("year").textContent = new Date().getFullYear();

  // ---- image protection (deterrent only: blocks right-click / drag / long-press save) ----
  document.addEventListener("contextmenu", e => {
    if (e.target.closest(".ph, .lightbox, .panoviewer")) e.preventDefault();
  });
  document.addEventListener("dragstart", e => {
    if (e.target.closest(".ph, .lightbox, .panoviewer")) e.preventDefault();
  });

  // ---- mobile menu ----
  const burger = $("burger"), nav = $("nav");
  burger.onclick = () => {
    const open = nav.classList.toggle("open");
    burger.setAttribute("aria-expanded", open);
  };
  nav.addEventListener("click", e => {
    if (e.target.tagName === "A") { nav.classList.remove("open"); burger.setAttribute("aria-expanded", false); }
  });

  // ---- reveal on scroll ----
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver(es => es.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      }), { rootMargin: "0px 0px -8% 0px" })
    : null;
  const reveal = el => io ? io.observe(el) : el.classList.add("in");

  // ---- build tiles (background-image + transparent shield => no <img> to "Save as") ----
  function tile(item, isPano, onClick, uniform) {
    const d = document.createElement("div");
    d.className = "ph";
    d.setAttribute("role", "button");
    d.tabIndex = 0;
    d.setAttribute("aria-label", item.title);
    d.style.backgroundImage = `url("${item.thumb}")`;
    d.style.aspectRatio = (isPano || uniform) ? (isPano ? "16/9" : "4/3") : `${item.w} / ${item.h}`;
    d.innerHTML = (isPano ? '<span class="badge">360°</span>' : "") +
      '<span class="shield"></span><span class="cap">' + esc(item.title) + "</span>";
    d.onclick = onClick;
    d.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } };
    reveal(d);
    return d;
  }

  // ---- lightbox ----
  const lb = $("lightbox");
  let photos = [], cur = 0;
  function showPhoto(i) {
    cur = (i + photos.length) % photos.length;
    $("lb-img").style.backgroundImage = `url("${photos[cur].full}")`;
    $("lb-caption").textContent = photos[cur].title;
  }
  function openLb(i) { lb.hidden = false; document.body.style.overflow = "hidden"; showPhoto(i); }
  function closeLb() { lb.hidden = true; document.body.style.overflow = ""; }
  $("lb-close").onclick = closeLb;
  $("lb-prev").onclick = () => showPhoto(cur - 1);
  $("lb-next").onclick = () => showPhoto(cur + 1);
  let x0 = null;
  lb.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) showPhoto(cur + (dx < 0 ? 1 : -1));
    x0 = null;
  });

  // ---- panorama viewer ----
  const pv = $("panoviewer");
  let viewer = null;
  function openPano(item) {
    pv.hidden = false; document.body.style.overflow = "hidden";
    viewer = pannellum.viewer("pano", {
      type: "equirectangular", panorama: item.full, autoLoad: true, title: item.title,
      showControls: true, mouseZoom: true, compass: false
    });
  }
  function closePano() {
    pv.hidden = true; document.body.style.overflow = "";
    if (viewer) { viewer.destroy(); viewer = null; }
  }
  $("pano-close").onclick = closePano;

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { closeLb(); closePano(); }
    if (!lb.hidden && e.key === "ArrowLeft") showPhoto(cur - 1);
    if (!lb.hidden && e.key === "ArrowRight") showPhoto(cur + 1);
  });

  // ---- home-page previews: show ~1.5 rows, fade out, "See gallery" button ----
  const previews = [];
  function fitPreview(wrap) {
    const grid = wrap.firstElementChild, first = grid.firstElementChild;
    if (!first) return;
    const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
    const gap = parseFloat(getComputedStyle(grid).rowGap) || 0;
    const clipped = grid.children.length > cols;
    wrap.classList.toggle("clipped", clipped);
    wrap.style.height = clipped ? Math.round(first.offsetHeight * 1.5 + gap) + "px" : "";
  }
  function fillPreview(gridId, items, isPano, onClick, uniform) {
    const grid = $(gridId), wrap = grid.parentElement;
    const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
    items.slice(0, cols * 2).forEach((p, i) => grid.appendChild(tile(p, isPano, () => onClick(p, i), uniform)));
    previews.push(wrap);
    fitPreview(wrap);
  }
  window.addEventListener("resize", () => previews.forEach(fitPreview));

  // ---- load data ----
  const home = !!document.querySelector(".preview");
  fetch("data/gallery.json")
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => {
      photos = data.photos || [];
      const panos = data.panos || [];
      if (home) {
        if (photos.length) fillPreview("photos", photos, false, (p, i) => openLb(i), true);
        if (panos.length) fillPreview("panos", panos, true, p => openPano(p));
        $("photos-preview").hidden = !photos.length;
        $("panos-preview").hidden = !panos.length;
      } else {
        if ($("photos")) photos.forEach((p, i) => $("photos").appendChild(tile(p, false, () => openLb(i))));
        if ($("panos")) panos.forEach(p => $("panos").appendChild(tile(p, true, () => openPano(p))));
      }
      if ($("photos-empty")) $("photos-empty").hidden = photos.length > 0;
      if ($("panos-empty")) $("panos-empty").hidden = panos.length > 0;
    })
    .catch(err => {
      console.error("Could not load gallery data", err);
      const e = $("photos-empty") || $("panos-empty");
      if (e) { e.textContent = "Gallery could not be loaded."; e.hidden = false; }
    });
})();
