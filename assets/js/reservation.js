(function () {
  'use strict';

  var DOW = ['Nd', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sb'];
  var MON = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  var MONFULL = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  var START_HOUR = 8, END_HOUR = 22;
  var PRICE_DAY = 70, PRICE_EVE = 90;
  var COURTS = [1, 2, 3, 4];

  var state = { date: new Date(), court: 1, slots: [], promo: false, loggedIn: false, user: null };
  state.date.setHours(0, 0, 0, 0);

  function $(s, r) { return (r || document).querySelector(s); }
  function go(sel) { var t = $(sel); if (!t) return; if (window.__lenis) window.__lenis.scrollTo(t, { offset: -68 }); else t.scrollIntoView({ behavior: 'smooth' }); }
  function dkey(d) { return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function isBusy(d, court, hour) {
    var now = new Date();
    if (dkey(d) === dkey(now) && hour <= now.getHours()) return true;
    return (hash(dkey(d) + '|' + court + '|' + hour) % 100) < 32;
  }
  function freeCount(d, court) { var n = 0; for (var h = START_HOUR; h < END_HOUR; h++) if (!isBusy(d, court, h)) n++; return n; }
  function priceFor(hour) { return hour >= 18 ? PRICE_EVE : PRICE_DAY; }
  function fmtDateFull(d) { return DOW[d.getDay()] + ', ' + d.getDate() + ' ' + MONFULL[d.getMonth()]; }
  function calcTotal() { var t = 0; state.slots.forEach(function (h) { t += priceFor(h); }); if (state.promo) t = Math.round(t * 0.9); return t; }

  function buildDates() {
    var wrap = $('#dateStrip');
    if (!wrap) return;
    wrap.innerHTML = '';
    var base = new Date(); base.setHours(0, 0, 0, 0);
    for (var i = 0; i < 14; i++) {
      var d = new Date(base); d.setDate(base.getDate() + i);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'date-pill' + (dkey(d) === dkey(state.date) ? ' is-selected' : '');
      b.innerHTML = '<span class="dow">' + (i === 0 ? 'Dziś' : DOW[d.getDay()]) + '</span><span class="dnum">' + d.getDate() + '</span><span class="dmon">' + MON[d.getMonth()] + '</span>';
      (function (dd) { b.addEventListener('click', function () { state.date = dd; state.slots = []; buildDates(); buildCourts(); buildSlots(); updateSummary(); }); })(new Date(d));
      wrap.appendChild(b);
    }
  }

  function buildCourts() {
    var wrap = $('#courtList');
    if (!wrap) return;
    wrap.innerHTML = '';
    COURTS.forEach(function (c) {
      var free = freeCount(state.date, c);
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'court-card' + (c === state.court ? ' is-selected' : '');
      card.innerHTML = '<svg class="court-svg" viewBox="0 0 64 40" aria-hidden="true"><use href="#ico-court"/></svg><strong>Boisko ' + c + '</strong><span class="av">wolne <b>' + free + '/' + (END_HOUR - START_HOUR) + '</b></span>';
      card.addEventListener('click', function () { state.court = c; state.slots = []; buildCourts(); buildSlots(); updateSummary(); });
      wrap.appendChild(card);
    });
    var hint = $('#courtHint');
    if (hint) hint.textContent = 'Boisko ' + state.court + ' wybrane';
  }

  function buildSlots() {
    var wrap = $('#slotGrid');
    if (!wrap) return;
    wrap.innerHTML = '';
    for (var h = START_HOUR; h < END_HOUR; h++) {
      (function (hour) {
        var busy = isBusy(state.date, state.court, hour);
        var sel = state.slots.indexOf(hour) !== -1;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'slot' + (busy ? ' is-busy' : '') + (sel ? ' is-selected' : '');
        b.textContent = pad(hour) + ':00';
        if (busy) { b.disabled = true; b.setAttribute('aria-disabled', 'true'); }
        else b.addEventListener('click', function () {
          var idx = state.slots.indexOf(hour);
          if (idx === -1) state.slots.push(hour); else state.slots.splice(idx, 1);
          state.slots.sort(function (a, b) { return a - b; });
          buildSlots(); updateSummary();
        });
        wrap.appendChild(b);
      })(h);
    }
  }

  function updateSummary() {
    var sumDate = $('#sumDate'), sumCourt = $('#sumCourt'), sumSlots = $('#sumSlots'), sumTotal = $('#sumTotal'), btn = $('#btnReserve'), note = $('#sumNote');
    if (sumDate) sumDate.textContent = fmtDateFull(state.date);
    if (sumCourt) sumCourt.textContent = 'Boisko ' + state.court;
    if (sumSlots) {
      if (!state.slots.length) sumSlots.innerHTML = '<span style="color:var(--ink-faint);font-weight:500">-</span>';
      else sumSlots.innerHTML = state.slots.map(function (h) { return '<span class="chip">' + pad(h) + ':00</span>'; }).join('');
    }
    if (sumTotal) sumTotal.textContent = calcTotal() + ' zł';
    if (btn) btn.disabled = state.slots.length === 0;
    if (note) note.textContent = state.promo
      ? 'Kod BEACH10 aktywny: -10%. Ceny demo: 70 zł/h, wieczorem 90 zł/h.'
      : 'Ceny demonstracyjne: 70 zł/h, wieczorem 90 zł/h.';
  }

  function setLoggedIn(name) {
    state.loggedIn = true;
    state.user = name || 'Gracz';
    var letter = state.user.trim().charAt(0).toUpperCase() || 'B';
    var authCard = $('#authCard'), welcome = $('#welcomeCard');
    if (authCard) authCard.hidden = true;
    if (welcome) welcome.hidden = false;
    var wn = $('#welcomeName'), wa = $('#welcomeAv');
    if (wn) wn.textContent = 'Cześć, ' + state.user + '!';
    if (wa) wa.textContent = letter;
    var navAuth = $('#navAuth');
    if (navAuth) {
      navAuth.innerHTML = '<span class="acct-chip"><span class="av">' + letter + '</span> ' + state.user.split(' ')[0] + ' <button type="button" id="navLogout">Wyloguj</button></span>';
      var lo = $('#navLogout');
      if (lo) lo.addEventListener('click', setLoggedOut);
    }
  }

  function setLoggedOut() {
    state.loggedIn = false;
    state.user = null;
    var authCard = $('#authCard'), welcome = $('#welcomeCard');
    if (authCard) authCard.hidden = false;
    if (welcome) welcome.hidden = true;
    var navAuth = $('#navAuth');
    if (navAuth) navAuth.innerHTML = '<a href="#konto" class="btn-nav"><svg class="ico" aria-hidden="true"><use href="#ico-user"/></svg> Zaloguj się</a>';
    go('#konto');
  }

  function initAuth() {
    var tabs = document.querySelectorAll('.auth-tab');
    var fLogin = $('#formLogin'), fReg = $('#formRegister');
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        tabs.forEach(function (x) { x.classList.remove('is-active'); });
        t.classList.add('is-active');
        var login = t.getAttribute('data-tab') === 'login';
        if (fLogin) fLogin.hidden = !login;
        if (fReg) fReg.hidden = login;
      });
    });
    if (fLogin) fLogin.addEventListener('submit', function (e) {
      e.preventDefault();
      var em = $('#li-email').value.trim();
      setLoggedIn(em ? em.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }) : 'Gracz');
    });
    if (fReg) fReg.addEventListener('submit', function (e) {
      e.preventDefault();
      setLoggedIn($('#rg-name').value.trim() || 'Gracz');
    });
    document.querySelectorAll('.btn-social').forEach(function (b) {
      b.addEventListener('click', function () { setLoggedIn(b.getAttribute('data-social') === 'google' ? 'Gracz Google' : 'Gracz FB'); });
    });
    var lo2 = $('#btnLogout');
    if (lo2) lo2.addEventListener('click', setLoggedOut);
  }

  function initPromo() {
    var btn = $('#promoBtn'), inp = $('#promo');
    if (!btn || !inp) return;
    btn.addEventListener('click', function () {
      var code = inp.value.trim().toUpperCase();
      if (code === 'BEACH10') { state.promo = true; btn.textContent = 'OK'; btn.style.background = 'var(--green)'; btn.style.color = '#fff'; }
      else { state.promo = false; btn.textContent = 'Użyj'; btn.style.background = ''; btn.style.color = ''; inp.value = ''; inp.placeholder = 'Nieprawidłowy kod'; }
      updateSummary();
    });
  }

  function initReserve() {
    var btn = $('#btnReserve'), modal = $('#confirmModal');
    if (!btn || !modal) return;
    var step1 = $('#modalStep1'), step2 = $('#modalStep2');
    function open() {
      $('#mDate').textContent = fmtDateFull(state.date);
      $('#mCourt').textContent = 'Boisko ' + state.court;
      $('#mSlots').textContent = state.slots.map(function (h) { return pad(h) + ':00'; }).join(', ');
      $('#mTotal').textContent = calcTotal() + ' zł';
      step1.hidden = false;
      step2.hidden = true;
      modal.classList.add('show');
      if (window.__lenis) window.__lenis.stop();
    }
    function close() { modal.classList.remove('show'); if (window.__lenis) window.__lenis.start(); }

    btn.addEventListener('click', function () {
      if (!state.loggedIn) {
        go('#konto');
        var card = $('#authCard');
        if (card && card.animate) card.animate([{ boxShadow: '0 0 0 0 rgba(244,178,35,0)' }, { boxShadow: '0 0 0 8px rgba(244,178,35,0.45)' }, { boxShadow: '0 0 0 0 rgba(244,178,35,0)' }], { duration: 1100 });
        return;
      }
      open();
    });
    $('#modalClose').addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('show')) close(); });
    $('#btnConfirm').addEventListener('click', function () { addReservation(); step1.hidden = true; step2.hidden = false; });
    $('#btnDone').addEventListener('click', function () { close(); state.slots = []; buildSlots(); updateSummary(); go('#moje'); });
  }

  function addReservation() {
    var list = $('#resvUpcoming');
    if (!list || !state.slots.length) return;
    var d = state.date, s = state.slots;
    var range = pad(s[0]) + ':00-' + pad(s[s.length - 1] + 1) + ':00';
    var item = document.createElement('div');
    item.className = 'resv-item';
    item.innerHTML = '<div class="when"><div class="d">' + d.getDate() + '</div><div class="m">' + MON[d.getMonth()] + '</div></div>' +
      '<div class="what"><strong>Boisko ' + state.court + ' - ' + range + '</strong><span>' + s.length + 'h - ' + calcTotal() + ' zł</span></div>' +
      '<span class="status pending">Do opłaty</span>';
    list.insertBefore(item, list.firstChild);
    if (item.animate) item.animate([{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.22,1,.36,1)' });
    document.querySelectorAll('[data-rtab]').forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-rtab') === 'upcoming'); });
    $('#resvUpcoming').hidden = false;
    $('#resvHistory').hidden = true;
  }

  function initResvTabs() {
    document.querySelectorAll('[data-rtab]').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('[data-rtab]').forEach(function (x) { x.classList.remove('is-active'); });
        b.classList.add('is-active');
        var up = b.getAttribute('data-rtab') === 'upcoming';
        $('#resvUpcoming').hidden = !up;
        $('#resvHistory').hidden = up;
      });
    });
  }

  buildDates();
  buildCourts();
  buildSlots();
  updateSummary();
  initAuth();
  initPromo();
  initReserve();
  initResvTabs();
})();
