(function () {
  'use strict';
  var docEl = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = !!window.gsap;
  var animate = hasGSAP && !reduce && docEl.classList.contains('js-anim');
  if (!animate) docEl.classList.remove('js-anim');

  var lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ duration: 1.05, lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
    window.__lenis = lenis;
    if (hasGSAP && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      requestAnimationFrame(function raf(t) { lenis.raf(t); requestAnimationFrame(raf); });
    }
  }

  function scrollToTarget(target) {
    if (lenis) lenis.scrollTo(target, { offset: -68 });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }

  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  if (animate) {
    var heroBits = ['.hero .eyebrow', '.hero h1', '.hero .lead', '.hero-actions', '.trust-strip'];
    gsap.set(heroBits, { opacity: 0, y: 30 });
    gsap.to(heroBits, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12, delay: 0.15 });

    gsap.utils.toArray('.reveal').forEach(function (el) {
      gsap.to(el, {
        opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' }
      });
    });
    gsap.utils.toArray('.reveal-stagger').forEach(function (group) {
      gsap.to(group.children, {
        opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08,
        scrollTrigger: { trigger: group, start: 'top 86%' }
      });
    });
    gsap.utils.toArray('[data-parallax]').forEach(function (el) {
      var sp = parseFloat(el.getAttribute('data-pspeed')) || 0.1;
      gsap.to(el, {
        yPercent: sp * 60, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    });
  }

  document.querySelectorAll('[data-count]').forEach(function (el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    if (!animate || !window.ScrollTrigger) { el.textContent = target + suffix; return; }
    var o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 92%', once: true,
      onEnter: function () {
        gsap.to(o, { v: target, duration: 1.2, ease: 'power2.out', onUpdate: function () { el.textContent = Math.round(o.v) + suffix; } });
      }
    });
  });

  var btn = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (btn && nav) {
    var backdrop = document.createElement('div');
    backdrop.className = 'nav-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);
    var setOpen = function (open) {
      nav.classList.toggle('open', open);
      backdrop.classList.toggle('show', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('nav-open', open);
      if (lenis) { open ? lenis.stop() : lenis.start(); }
    };
    btn.addEventListener('click', function () { setOpen(!nav.classList.contains('open')); });
    backdrop.addEventListener('click', function () { setOpen(false); });
    nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { if (nav.classList.contains('open')) setOpen(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) setOpen(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 920 && nav.classList.contains('open')) setOpen(false); });
  }

  var header = document.querySelector('.nav');
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 12); };
    window.addEventListener('scroll', onScroll, { passive: true });
    if (lenis) lenis.on('scroll', onScroll);
    onScroll();
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href.length < 2) return;
    a.addEventListener('click', function (e) {
      var target = document.getElementById(href.slice(1));
      if (target) { e.preventDefault(); scrollToTarget(target); }
    });
  });

  var cta = document.querySelector('.sticky-cta');
  if (cta) {
    var hero = document.querySelector('.hero');
    var updateCta = function () {
      var heroBottom = hero ? hero.offsetTop + hero.offsetHeight : 600;
      var scrolled = window.scrollY > heroBottom - 80;
      var nearFooter = window.scrollY + window.innerHeight > document.body.offsetHeight - 260;
      cta.classList.toggle('show', scrolled && !nearFooter);
    };
    window.addEventListener('scroll', updateCta, { passive: true });
    if (lenis) lenis.on('scroll', updateCta);
    window.addEventListener('resize', updateCta, { passive: true });
    updateCta();
  }

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
