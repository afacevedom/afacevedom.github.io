/* Cloudflare Web Analytics loader for static GitHub Pages sites. */
(() => {
  'use strict';

  const config = window.ENGINEERING_CLOUDFLARE_ANALYTICS || {};
  const token = typeof config.token === 'string' ? config.token.trim() : '';
  const placeholder = 'PEGA_AQUI_TU_TOKEN_DE_CLOUDFLARE';

  // Do not load the beacon until a real site token has been configured.
  if (!token || token === placeholder) return;

  // Prevent duplicate beacons if this loader is accidentally included twice.
  if (document.querySelector('script[data-cf-beacon]')) return;

  const beacon = document.createElement('script');
  beacon.type = 'module';
  beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  beacon.setAttribute('data-cf-beacon', JSON.stringify({ token }));
  beacon.async = true;
  document.head.appendChild(beacon);
})();
