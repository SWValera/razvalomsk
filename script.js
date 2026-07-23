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

  document.addEventListener("click", event => {
    const link = event.target.closest("a");
    if (!link) return;

    const rawHref = link.getAttribute("href") || "";

    if (rawHref.startsWith("tel:")) {
      const phone = rawHref.slice(4);
      const branch = phone === "+79963963746" ? "severnaya" :
        phone === "+79237673855" ? "zavertyaeva" : "unknown";

      sendMetrikaGoal("phone_click", {
        branch,
        phone,
        button_text: link.textContent.trim()
      });
      return;
    }

    if (rawHref.includes("yandex.ru/maps")) {
      const decodedHref = decodeURIComponent(rawHref);
      const branch = decodedHref.includes("Завертяева") ? "zavertyaeva" :
        decodedHref.includes("24-я Северная") ? "severnaya" : "unknown";
      const address = branch === "severnaya" ? "Омск, 24-я Северная, 157" :
        branch === "zavertyaeva" ? "Омск, Завертяева, 4" : "Омск";

      sendMetrikaGoal("route_click", {
        branch,
        address,
        button_text: link.textContent.trim()
      });
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

  // Анимированные счётчики запускаются только один раз.
  const counters = document.querySelectorAll("[data-count]");
  const animateCounter = element => {
    const target = Number(element.dataset.count);
    const decimals = Number(element.dataset.decimals || 0);
    const suffix = element.dataset.suffix || "";
    if (reduceMotion) {
      element.textContent = target.toFixed(decimals) + suffix;
      return;
    }
    const start = performance.now();
    const duration = 1500;
    const frame = now => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = target * eased;
      element.textContent = current.toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
  if ("IntersectionObserver" in window) {
    const counterObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: .6 });
    counters.forEach(counter => counterObserver.observe(counter));
  } else counters.forEach(animateCounter);

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
