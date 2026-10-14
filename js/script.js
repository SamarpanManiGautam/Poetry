// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Gentle fade-in for each poem as it scrolls into view
(function () {
  var poems = document.querySelectorAll('.poem');
  if (!('IntersectionObserver' in window)) {
    poems.forEach(function (p) { p.classList.add('is-visible'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  poems.forEach(function (p) { io.observe(p); });
})();
