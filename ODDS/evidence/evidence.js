(() => {
  const toggle = document.querySelector(".toc-toggle");
  const toc = document.querySelector(".publication-toc");
  const tocLinks = Array.from(document.querySelectorAll(".publication-toc a"));

  const setOpen = (open) => {
    if (!toggle || !toc) return;
    toggle.setAttribute("aria-expanded", String(open));
    toc.classList.toggle("is-open", open);
  };

  toggle?.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  tocLinks.forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });

  const linksById = new Map(
    tocLinks.map((link) => [decodeURIComponent(link.hash.slice(1)), link])
  );
  const headings = Array.from(document.querySelectorAll(".publication-article h1[id], .publication-article h2[id]"));

  if ("IntersectionObserver" in window && headings.length) {
    let activeId = null;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (!visible.length) return;
        const nextId = visible[0].target.id;
        if (nextId === activeId) return;
        activeId = nextId;
        tocLinks.forEach((link) => link.removeAttribute("aria-current"));
        linksById.get(nextId)?.setAttribute("aria-current", "location");
      },
      { rootMargin: "-20% 0px -72% 0px", threshold: [0, 1] }
    );
    headings.forEach((heading) => observer.observe(heading));
  }
})();
