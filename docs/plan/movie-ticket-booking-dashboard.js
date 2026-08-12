(() => {
  document.documentElement.dataset.dashboard = "ready";
  const root = document.documentElement;
  const sectionIds = ["delivery", "workstreams", "backend", "frontend", "foundations", "capabilities", "coverage", "milestones", "next"];
  const sections = [...document.querySelectorAll("main section")];
  sections.forEach((section, index) => { section.id = sectionIds[index]; section.classList.add("reveal"); });
  const links = [...document.querySelectorAll(".nav a")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const updateScroll = () => {
    const max = root.scrollHeight - innerHeight;
    root.style.setProperty("--scroll", `${max > 0 ? (scrollY / max) * 100 : 0}%`);
  };
  addEventListener("scroll", updateScroll, { passive: true });
  updateScroll();
  if (reduced) document.querySelectorAll(".reveal").forEach((el) => el.classList.add("visible"));
  else {
    const reveal = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("visible"); reveal.unobserve(entry.target); }
    }), { threshold: .08, rootMargin: "0px 0px -45px" });
    document.querySelectorAll(".reveal").forEach((el) => reveal.observe(el));
  }
  const spy = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    links.forEach((link) => link.classList.toggle("active", link.hash === `#${entry.target.id}`));
  }), { rootMargin: "-20% 0px -70%", threshold: 0 });
  sections.forEach((section) => spy.observe(section));
})();
