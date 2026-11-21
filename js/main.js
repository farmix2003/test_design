/* URAVO front-end test – vanilla JS */
(function () {
  'use strict';

  var spQuery = window.matchMedia('(max-width: 767px)');
  var body = document.body;

  /* ---------------------------------------------------------
     1. Hamburger menu (SP)
     --------------------------------------------------------- */
  var burger = document.querySelector('.hamburger');
  var spMenu = document.getElementById('sp-menu');

  function setMenu(open) {
    body.classList.toggle('is-menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    spMenu.setAttribute('aria-hidden', String(!open));
    spMenu.inert = !open;
  }

  if (burger && spMenu) {
    setMenu(false);
    burger.addEventListener('click', function () {
      setMenu(!body.classList.contains('is-menu-open'));
    });
    spMenu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('click', function (e) {
      if (body.classList.contains('is-menu-open') && !e.target.closest('.header')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && body.classList.contains('is-menu-open')) {
        setMenu(false);
        burger.focus();
      }
    });
    spQuery.addEventListener('change', function (e) {
      if (!e.matches) setMenu(false);
    });
  }

  /* ---------------------------------------------------------
     2. Accordions (SP menu / SP footer)
     --------------------------------------------------------- */
  document.querySelectorAll('[data-acc]').forEach(function (acc, i) {
    var head = acc.querySelector('.acc__head');
    var panel = acc.querySelector('.acc__body');
    if (!head || !panel) return;
    panel.id = panel.id || 'acc-panel-' + i;
    head.setAttribute('aria-controls', panel.id);

    head.addEventListener('click', function () {
      var open = head.getAttribute('aria-expanded') !== 'true';
      head.setAttribute('aria-expanded', String(open));

      if (open) {
        panel.hidden = false;
        var h = panel.scrollHeight;
        panel.style.height = '0px';
        void panel.offsetHeight; // reflow
        panel.style.height = h + 'px';
      } else {
        panel.style.height = panel.scrollHeight + 'px';
        void panel.offsetHeight;
        panel.style.height = '0px';
      }
      panel.addEventListener('transitionend', function done(ev) {
        if (ev.propertyName !== 'height') return;
        panel.removeEventListener('transitionend', done);
        if (head.getAttribute('aria-expanded') === 'true') {
          panel.style.height = '';
        } else {
          panel.hidden = true;
          panel.style.height = '';
        }
      });
    });
  });

  /* ---------------------------------------------------------
     3. Logo slider – rotates automatically (infinite marquee)
     --------------------------------------------------------- */
  var logoTrack = document.querySelector('.logos__track');
  if (logoTrack) {
    var originals = Array.prototype.slice.call(logoTrack.children);
    var PITCH = 240;  // 179px logo + 61px gap
    var SPEED = 60;   // px per second

    var setCount = originals.length;
    var needed = Math.ceil((Math.max(window.screen.width, window.innerWidth) + PITCH * 2) / PITCH);
    // repeat the base set until it is wider than the screen
    while (setCount < needed) {
      originals.forEach(function (li) { logoTrack.appendChild(li.cloneNode(true)); });
      setCount += originals.length;
    }
    // duplicate the whole set once so the loop is seamless
    Array.prototype.slice.call(logoTrack.children).forEach(function (li) {
      var c = li.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      logoTrack.appendChild(c);
    });
    logoTrack.style.setProperty('--logos-shift', setCount * PITCH + 'px');
    logoTrack.style.setProperty('--logos-dur', (setCount * PITCH) / SPEED + 's');
  }

  /* ---------------------------------------------------------
     4. Member slider – arrows (PC) / swipe (SP), infinite loop
     --------------------------------------------------------- */
  function Slider(root) {
    this.root = root;
    this.viewport = root.querySelector('.member-slider__viewport');
    this.track = root.querySelector('.member-slider__track');
    this.items = Array.prototype.slice.call(this.track.children);
    this.count = this.items.length;
    this.index = 0;
    this.busy = false;
    this.cloneEdges();
    this.bind();
    this.update(false);
  }

  Slider.prototype.cloneEdges = function () {
    var track = this.track;
    var before = document.createDocumentFragment();
    var after = document.createDocumentFragment();
    this.items.forEach(function (item) {
      var a = item.cloneNode(true);
      var b = item.cloneNode(true);
      a.setAttribute('aria-hidden', 'true');
      b.setAttribute('aria-hidden', 'true');
      before.appendChild(a);
      after.appendChild(b);
    });
    track.insertBefore(before, track.firstChild);
    track.appendChild(after);
  };

  Slider.prototype.metrics = function () {
    var item = this.items[0];
    var w = item.getBoundingClientRect().width;
    var gap = parseFloat(getComputedStyle(this.track).columnGap) || 0;
    // SP: the active card is centred; PC: the row starts at the left edge
    var base = spQuery.matches ? (this.viewport.clientWidth - w) / 2 : 0;
    return { pitch: w + gap, base: base };
  };

  Slider.prototype.update = function (animate) {
    var m = this.metrics();
    var x = m.base - (this.index + this.count) * m.pitch;
    this.track.style.transition = animate ? '' : 'none';
    this.track.style.transform = 'translate3d(' + x + 'px,0,0)';
    if (!animate) {
      void this.track.offsetHeight;
      this.track.style.transition = '';
    }
    this.currentX = x;
  };

  Slider.prototype.go = function (step) {
    if (this.busy) return;
    this.busy = true;
    this.index += step;
    this.update(true);
  };

  Slider.prototype.normalize = function () {
    if (this.index >= this.count) { this.index -= this.count; this.update(false); }
    else if (this.index < 0) { this.index += this.count; this.update(false); }
    this.busy = false;
  };

  Slider.prototype.bind = function () {
    var self = this;
    var prev = this.root.querySelector('.member-slider__arrow--prev');
    var next = this.root.querySelector('.member-slider__arrow--next');
    if (prev) prev.addEventListener('click', function () { self.go(-1); });
    if (next) next.addEventListener('click', function () { self.go(1); });

    this.track.addEventListener('transitionend', function (e) {
      if (e.target === self.track && e.propertyName === 'transform') self.normalize();
    });

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { self.busy = false; self.update(false); }, 100);
    });

    // swipe / drag
    var startX = 0, startY = 0, dx = 0, dragging = false, locked = false;
    this.viewport.addEventListener('pointerdown', function (e) {
      if (self.busy || (e.pointerType === 'mouse' && e.button !== 0)) return;
      dragging = true; locked = false; dx = 0;
      startX = e.clientX; startY = e.clientY;
    });
    this.viewport.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!locked) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        if (Math.abs(dy) > Math.abs(dx)) { dragging = false; return; } // vertical scroll
        locked = true;
        self.viewport.setPointerCapture(e.pointerId);
      }
      self.track.style.transition = 'none';
      self.track.style.transform = 'translate3d(' + (self.currentX + dx) + 'px,0,0)';
    });
    function end() {
      if (!dragging) return;
      dragging = false;
      if (!locked) return;
      self.track.style.transition = '';
      if (dx < -40) self.go(1);
      else if (dx > 40) self.go(-1);
      else self.update(true);
    }
    this.viewport.addEventListener('pointerup', end);
    this.viewport.addEventListener('pointercancel', end);
    this.viewport.addEventListener('dragstart', function (e) { e.preventDefault(); });

    // keyboard support
    this.root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') self.go(-1);
      if (e.key === 'ArrowRight') self.go(1);
    });

    spQuery.addEventListener('change', function () { self.busy = false; self.update(false); });
  };

  document.querySelectorAll('[data-slider]').forEach(function (el) { new Slider(el); });
})();
