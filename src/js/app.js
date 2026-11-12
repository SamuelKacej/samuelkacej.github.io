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
  function tile(item, isPano, onClick) {
    const d = document.createElement("div");
    d.className = "ph";
    d.setAttribute("role", "button");
    d.tabIndex = 0;
    d.setAttribute("aria-label", item.title);
    d.style.backgroundImage = `url("${item.thumb}")`;
    d.style.aspectRatio = isPano ? "16/9" : `${item.w} / ${item.h}`;
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

  // ---- load data ----
  fetch("data/gallery.json")
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => {
      photos = data.photos || [];
      photos.forEach((p, i) => $("photos").appendChild(tile(p, false, () => openLb(i))));
      (data.panos || []).forEach(p => $("panos").appendChild(tile(p, true, () => openPano(p))));
      $("photos-empty").hidden = photos.length > 0;
      $("panos-empty").hidden = (data.panos || []).length > 0;
    })
    .catch(err => {
      console.error("Could not load gallery data", err);
      $("photos-empty").textContent = "Gallery could not be loaded.";
      $("photos-empty").hidden = false;
    });
})();
