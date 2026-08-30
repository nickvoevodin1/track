// Scout — article interactivity. Vanilla JS replacement for the
// design-system's article-enhance.js. Reads the same data-* contract
// described in the spec, so markup never needs to change.
(function () {
  "use strict";

  /* ---- 9.1 scroll-spy ----
     Раньше список наблюдаемых секций строился ИЗ ссылок в содержании
     (TOC href → getElementById). Если хоть один id в реальной статье не
     совпадал с href, элемент тихо выпадал из списка — и на длинных
     статьях (20+ секций) подсветка переставала обновляться почти до
     самого конца, потому что наблюдался только последний совпавший
     элемент. Теперь берём РЕАЛЬНЫЕ секции статьи напрямую и следим за
     прокруткой, а не за пересечением тонкой полосы — это надёжно
     работает при любом числе секций и не зависит от точного совпадения
     каждого id. */
  var navs = document.querySelectorAll("[data-spy-nav]");
  if (navs.length) {
    var links = [];
    navs.forEach(function (nav) {
      nav.querySelectorAll("a[href^='#']").forEach(function (a) { links.push(a); });
    });

    var sections = Array.prototype.slice.call(
      document.querySelectorAll("article section[id]")
    );

    function setActive(id) {
      links.forEach(function (a) {
        var on = a.getAttribute("href") === "#" + id;
        a.classList.toggle("is-active", on);
        if (on) scrollChipIntoView(a);
      });
    }

    /* На мобильном содержание — горизонтальная лента. Активный пункт
       подъезжает в видимую зону сам, КУДА БЫ пользователь её ни пролистал.
       Прокручиваем только саму ленту (не страницу) и только по горизонтали,
       поэтому scrollIntoView здесь не подходит — он дёргает всю страницу. */
    function scrollChipIntoView(a) {
      var strip = a.parentElement;
      if (!strip || strip.scrollWidth <= strip.clientWidth) return; // лента не листается — десктоп
      var target = a.offsetLeft - (strip.clientWidth - a.offsetWidth) / 2;
      var max = strip.scrollWidth - strip.clientWidth;
      strip.scrollTo({
        left: Math.max(0, Math.min(target, max)),
        behavior: "smooth"
      });
    }

    var ticking = false;
    var progressBar = document.getElementById("read-progress-bar");
    var articleEl = document.querySelector("article");

    function updateProgress() {
      if (!progressBar) return;
      // считаем прогресс по самой статье, а не по всей странице:
      // иначе футер и шапка «съедают» проценты и полоса врёт
      var start = 0, total = document.documentElement.scrollHeight - window.innerHeight;
      if (articleEl) {
        start = articleEl.offsetTop;
        total = articleEl.offsetHeight - (window.innerHeight - 120);
      }
      var passed = window.scrollY - start;
      var pct = total > 0 ? (passed / total) * 100 : 0;
      progressBar.style.width = Math.max(0, Math.min(100, pct)) + "%";
    }

    function updateActiveSection() {
      ticking = false;
      updateProgress();
      if (!sections.length) return;
      var line = 140; // отступ под липкую шапку + запас
      var current = sections[0];
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].getBoundingClientRect().top - line <= 0) {
          current = sections[i];
        } else {
          break;
        }
      }
      setActive(current.id);
    }
    function onScrollOrResize() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateActiveSection);
      }
    }
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    updateActiveSection();
  }

  /* ---- 9.2 step selector ("путь клиента") ---- */
  document.querySelectorAll("[data-steps]").forEach(function (container) {
    var chips = container.querySelectorAll("[data-step-chip]");
    var panels = container.querySelectorAll("[data-step-panel]");
    function activate(n) {
      chips.forEach(function (c) { c.classList.toggle("is-active", c.getAttribute("data-step-chip") === n); });
      panels.forEach(function (p) { p.classList.toggle("is-active", p.getAttribute("data-step-panel") === n); });
    }
    chips.forEach(function (c) {
      c.addEventListener("click", function () { activate(c.getAttribute("data-step-chip")); });
    });
    if (chips[0]) activate(chips[0].getAttribute("data-step-chip"));
  });

  /* ---- 9.3 tabs ("США / Россия") ---- */
  document.querySelectorAll("[data-tabs]").forEach(function (container) {
    var btns = container.querySelectorAll("[data-tab-btn]");
    var panels = container.querySelectorAll("[data-tab-panel]");
    function activate(n) {
      btns.forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-tab-btn") === n); });
      panels.forEach(function (p) { p.classList.toggle("is-active", p.getAttribute("data-tab-panel") === n); });
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () { activate(b.getAttribute("data-tab-btn")); });
    });
    if (btns[0]) activate(btns[0].getAttribute("data-tab-btn"));
  });

  /* ---- 9.4 economics calculator ---- */
  document.querySelectorAll("[data-calc]").forEach(function (container) {
    var inputs = {};
    container.querySelectorAll("[data-in]").forEach(function (el) {
      inputs[el.getAttribute("data-in")] = el;
      el.value = el.getAttribute("data-init") || el.value;
    });
    var outs = {};
    container.querySelectorAll("[data-out]").forEach(function (el) { outs[el.getAttribute("data-out")] = el; });
    var vals = {};
    container.querySelectorAll("[data-val]").forEach(function (el) { vals[el.getAttribute("data-val")] = el; });

    function fmt(n) { return Math.round(n).toLocaleString("ru-RU"); }

    function recalc() {
      var avg = parseFloat(inputs.avg ? inputs.avg.value : 0) || 0;
      var orders = parseFloat(inputs.orders ? inputs.orders.value : 0) || 0;
      var margin = parseFloat(inputs.margin ? inputs.margin.value : 0) || 0;
      var agg = parseFloat(inputs.agg ? inputs.agg.value : 0) || 0;

      var mult = parseFloat(container.getAttribute("data-calc-mult")) || 30;
      var revenue = avg * orders * mult;
      var netShare = (margin - agg) / 100;
      var perOrder = avg * netShare;
      var aggFee = revenue * (agg / 100);
      var profit = revenue * netShare;

      if (vals.avg) vals.avg.textContent = fmt(avg) + " ₽";
      if (vals.orders) vals.orders.textContent = fmt(orders);
      if (vals.margin) vals.margin.textContent = margin + "%";
      if (vals.agg) vals.agg.textContent = agg + "%";

      if (outs.rev) outs.rev.textContent = fmt(revenue) + " ₽";
      if (outs.aggfee) outs.aggfee.textContent = "−" + fmt(aggFee) + " ₽";
      if (outs.perorder) outs.perorder.textContent = fmt(perOrder) + " ₽";
      if (outs.profit) outs.profit.textContent = fmt(profit) + " ₽";
    }

    Object.keys(inputs).forEach(function (k) { inputs[k].addEventListener("input", recalc); });
    recalc();
  });
})();
