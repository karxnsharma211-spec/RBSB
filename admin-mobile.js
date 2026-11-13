/* RBSB Admin — mobile drawer helpers: backdrop, close button, Esc, scroll lock. */
(function () {
  "use strict";
  function init() {
    var sidebar = document.getElementById("sidebar");
    if (!sidebar) return;

    var backdrop = document.createElement("div");
    backdrop.className = "sidebar-backdrop";
    document.body.appendChild(backdrop);

    var close = document.createElement("button");
    close.type = "button";
    close.className = "sidebar-close";
    close.setAttribute("aria-label", "Close menu");
    close.textContent = "✕";
    sidebar.insertBefore(close, sidebar.firstChild);

    function sync() {
      var open = sidebar.classList.contains("open");
      document.body.classList.toggle("sidebar-open", open);
      if (open) sidebar.scrollTop = 0;          // always show Overview / Events at the top
    }
    function shut() { sidebar.classList.remove("open"); }

    new MutationObserver(sync).observe(sidebar, { attributes: true, attributeFilter: ["class"] });
    // Choosing a tab: admin.js switches the page and closes the drawer;
    // we also bring the new page to the top so the change is visible.
    sidebar.addEventListener("click", function (e) {
      if (e.target.closest(".nav-item")) {
        window.scrollTo(0, 0);
        var main = document.querySelector(".main-content"); if (main) main.scrollTop = 0;
      }
    });
    backdrop.addEventListener("click", shut);
    close.addEventListener("click", shut);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") shut(); });
    window.addEventListener("resize", function () { if (window.innerWidth > 760) shut(); });
    sync();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
