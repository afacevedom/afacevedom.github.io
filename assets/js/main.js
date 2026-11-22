const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? '✕' : '☰';
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = '☰';
    });
  });
}

const theme = document.querySelector('.theme-toggle');
if (theme) {
  theme.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    theme.textContent = document.body.classList.contains('light-mode') ? '☀' : '◐';
  });
}

const currentYear = String(new Date().getFullYear());
document.querySelectorAll('[data-current-year]').forEach(element => {
  element.textContent = currentYear;
});
