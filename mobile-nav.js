/* RBSB Events — responsive navigation
   Adds a hamburger button to the shared site header. Visible only on
   tablet/phone widths (see responsive-final.css). Works without changes
   to any page markup other than loading this file. */
(function () {
  "use strict";

  function init() {
    var container = document.querySelector(".site-header .header-container");
    var nav = container && container.querySelector(".main-nav, .main-navigation");
    if (!container || !nav || container.querySelector(".nav-toggle")) return;

    if (!nav.id) nav.id = "primaryNav";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nav-toggle";
    btn.setAttribute("aria-label", "Open menu");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", nav.id);
    btn.innerHTML = '<span class="nav-toggle-bars" aria-hidden="true"><i></i><i></i><i></i></span>';
    container.appendChild(btn);

    var mq = window.matchMedia("(max-width: 1050px)");

    function setOpen(open) {
      document.documentElement.classList.toggle("nav-open", open);
      container.classList.toggle("nav-is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }

    btn.addEventListener("click", function () {
      setOpen(!container.classList.contains("nav-is-open"));
    });

    // Close on link tap, Escape, outside tap, or when resizing to desktop.
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".site-header")) setOpen(false);
    });
    var onChange = function () { if (!mq.matches) setOpen(false); };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
