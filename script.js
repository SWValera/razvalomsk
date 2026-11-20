/* 3D Развал-Схождение — интерактивы без сторонних библиотек */
document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const header = document.querySelector(".site-header");
  const menuButton = document.querySelector(".menu-btn");
  const nav = document.querySelector(".nav");

  /* =======================================================
     Цели Яндекс.Метрики

     phone_click — клик по любому номеру телефона.
     route_click — клик по любой кнопке маршрута.

     Вместе с целью передаётся филиал, номер или адрес.
     ======================================================= */
  const sendMetrikaGoal = (goalName, parameters) => {
    const counterId = Number(window.YM_COUNTER_ID);
    if (!Number.isInteger(counterId) || counterId <= 0) return;
    if (typeof window.ym !== "function") return;
    window.ym(counterId, "reachGoal", goalName, parameters);
  };

  const routeBranches = {
    severnaya: { lat: 55.023407, lon: 73.396498, oid: "128984221106",
      address: "Омск, 24-я Северная, 157", goal: "routeNorth24" },
    zavertyaeva: { lat: 55.034664, lon: 73.425852, oid: "35882979019",
      address: "Омск, Завертяева, 4/1", goal: "routeZavertyaeva" }
  };
  const routeModal = document.querySelector("#route-modal");
  const routeAddress = document.querySelector("#route-address");
  const routeStatus = document.querySelector("#route-status");
  const routeChoices = document.querySelectorAll("[data-route-provider]");
  let selectedBranch = null;
  let cancelRoute = null;

  // Both providers receive coordinates, not an ambiguous address search.
  const routeUrl = (branch, provider, position) => {
    const point = routeBranches[branch];
    const lat = position?.coords?.latitude;
    const lon = position?.coords?.longitude;
    const located = Number.isFinite(lat) && Number.isFinite(lon) &&
      Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
    if (provider === "2gis") {
      const origin = located ? `${lon},${lat}` : "";
      return `https://2gis.ru/omsk/directions/tab/car/points/${origin}|${point.lon},${point.lat}`;
    }
    const url = new URL("https://yandex.ru/maps/");
    url.searchParams.set("mode", "routes");
    url.searchParams.set("rtext", `${located ? `${lat},${lon}` : ""}~${point.lat},${point.lon}`);
    url.searchParams.set("rtt", "auto");
    url.searchParams.set("ruri", `~ymapsbm1://org?oid=${point.oid}`);
    return url.href;
  };

  const trackRoute = (branch, provider) => {
    sendMetrikaGoal(routeBranches[branch].goal);
    sendMetrikaGoal("route_click", {
      branch, address: routeBranches[branch].address,
      button_text: "Построить маршрут", map_provider: provider
    });
  };

  const openRoute = (branch, provider) => {
    if (cancelRoute) return;
    trackRoute(branch, provider);
    if (!navigator.geolocation) {
      routeModal?.close();
      window.location.assign(routeUrl(branch, provider));
      return;
    }

    let finished = false;
    let timeout;
    const reset = () => {
      finished = true;
      clearTimeout(timeout);
      cancelRoute = null;
      routeChoices.forEach(choice => choice.removeAttribute("aria-disabled"));
      if (routeStatus) routeStatus.textContent = "";
    };
    cancelRoute = reset;
    routeChoices.forEach(choice => choice.setAttribute("aria-disabled", "true"));
    if (routeStatus) routeStatus.textContent = "Определяем ваше местоположение…";
    const finish = position => {
      if (finished) return;
      reset();
      routeModal?.close();
      // The visitor's location goes only to their selected map, not to analytics.
      window.location.assign(routeUrl(branch, provider, position));
    };
    timeout = setTimeout(() => finish(), 8000);
    try {
      navigator.geolocation.getCurrentPosition(finish, () => finish(), {
        enableHighAccuracy: true, timeout: 6000, maximumAge: 60000
      });
    } catch {
      finish();
    }
  };

  routeModal?.querySelector(".modal-close")?.addEventListener("click", () => routeModal.close());
  routeModal?.addEventListener("close", () => { cancelRoute?.(); });
  routeModal?.addEventListener("click", event => {
    if (event.target === routeModal) routeModal.close();
  });
  window.addEventListener("pagehide", () => {
    cancelRoute?.();
    if (routeModal?.open) routeModal.close();
  });

  document.addEventListener("click", event => {
    const link = event.target.closest("a");
    if (!link) return;
    const rawHref = link.getAttribute("href") || "";
    if (rawHref.startsWith("tel:")) {
      const phone = rawHref.slice(4);
      const branch = phone === "+79963963746" ? "severnaya" :
        phone === "+79237673855" ? "zavertyaeva" : "unknown";
      sendMetrikaGoal("phone_click", { branch, phone, button_text: link.textContent.trim() });
      return;
    }

    const normalClick = event.button === 0 && !event.ctrlKey && !event.metaKey &&
      !event.shiftKey && !event.altKey && !event.defaultPrevented;
    if (link.dataset.routeProvider && selectedBranch) {
      if (normalClick) {
        event.preventDefault();
        openRoute(selectedBranch, link.dataset.routeProvider);
      } else {
        trackRoute(selectedBranch, link.dataset.routeProvider);
      }
      return;
    }
    const branch = link.dataset.routeBranch;
    if (!routeBranches[branch]) return;
    if (normalClick && typeof routeModal?.showModal === "function") {
      event.preventDefault();
      selectedBranch = branch;
      routeAddress.textContent = routeBranches[branch].address;
      routeChoices.forEach(choice => {
        choice.href = routeUrl(branch, choice.dataset.routeProvider);
      });
      routeModal.showModal();
    } else {
      // Native links still work without dialog support or in a new tab.
      trackRoute(branch, "yandex");
    }
  });

  // Компактная шапка после начала прокрутки.
  const updateHeader = () => header?.classList.toggle("scrolled", scrollY > 24);
  updateHeader();
  addEventListener("scroll", updateHeader, { passive: true });

  // Мобильное меню.
  menuButton?.addEventListener("click", () => {
    const open = menuButton.getAttribute("aria-expanded") !== "true";
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    nav?.classList.toggle("open", open);
  });
  nav?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
    menuButton?.setAttribute("aria-expanded", "false");
    nav.classList.remove("open");
  }));

  // Появление элементов при прокрутке.
  const revealItems = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach(item => item.classList.add("visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: "0px 0px -45px" });
    revealItems.forEach(item => revealObserver.observe(item));
  }

  // Доступный аккордеон FAQ: открыт только один ответ.
  const faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach(item => {
    const button = item.querySelector("button");
    button?.addEventListener("click", () => {
      const willOpen = !item.classList.contains("open");
      faqItems.forEach(other => {
        other.classList.remove("open");
        other.querySelector("button")?.setAttribute("aria-expanded", "false");
      });
      if (willOpen) {
        item.classList.add("open");
        button.setAttribute("aria-expanded", "true");
      }
    });
  });

  // Интерактивная схема колёс.
  const wheelTitle = document.querySelector("#wheel-title");
  document.querySelectorAll(".wheel").forEach(wheel => {
    const selectWheel = () => {
      document.querySelectorAll(".wheel").forEach(item => item.classList.remove("active"));
      wheel.classList.add("active");
      if (wheelTitle) wheelTitle.textContent = wheel.dataset.wheel;
    };
    wheel.addEventListener("click", selectWheel);
    wheel.addEventListener("mouseenter", selectWheel);
    wheel.addEventListener("focus", selectWheel);
  });
  document.querySelectorAll(".parameter button").forEach(button => {
    button.addEventListener("click", () => {
      const current = button.closest(".parameter");
      document.querySelectorAll(".parameter").forEach(param => param.classList.remove("active"));
      current?.classList.add("active");
    });
  });

  // Политика конфиденциальности в нативном dialog.
  const modal = document.querySelector("#privacy-modal");
  document.querySelector("[data-modal-open]")?.addEventListener("click", () => modal?.showModal());
  modal?.querySelector(".modal-close")?.addEventListener("click", () => modal.close());
  modal?.addEventListener("click", event => {
    if (event.target === modal) modal.close();
  });

  const year = document.querySelector("#year");
  if (year) year.textContent = new Date().getFullYear();
});
