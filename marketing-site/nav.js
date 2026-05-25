// Mobile nav toggle. Wires the .nav-toggle button to .topbar nav, sets
// aria-expanded + data-mobile-open so the CSS drawer can slide in. Closes
// on Escape, on link click, and on viewport resize beyond the breakpoint.
(function () {
  function init() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = toggle && document.getElementById(toggle.getAttribute('aria-controls') || 'primary-nav');
    if (!toggle || !nav) return;

    function close() {
      toggle.setAttribute('aria-expanded', 'false');
      nav.removeAttribute('data-mobile-open');
      document.body.style.overflow = '';
    }

    function open() {
      toggle.setAttribute('aria-expanded', 'true');
      nav.setAttribute('data-mobile-open', '');
      // Prevent background scroll while drawer is open
      document.body.style.overflow = 'hidden';
    }

    toggle.addEventListener('click', function () {
      var expanded = toggle.getAttribute('aria-expanded') === 'true';
      if (expanded) close(); else open();
    });

    // Close drawer when a nav link is activated (real click, not synthesized)
    var links = nav.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function () {
        if (toggle.getAttribute('aria-expanded') === 'true') close();
      });
    }

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        close();
        toggle.focus();
      }
    });

    // Close when viewport crosses the breakpoint (drawer styles only apply <768)
    var mq = window.matchMedia('(min-width: 768px)');
    function onChange() {
      if (mq.matches && toggle.getAttribute('aria-expanded') === 'true') close();
    }
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
