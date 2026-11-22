(() => {
  const widget = document.querySelector('[data-wikimedia-widget]');
  if (!widget) return;

  const API_URL = 'https://commons.wikimedia.org/w/api.php';
  const CACHE_KEY = 'engineeringLab.wikimedia.v1';
  const CACHE_TTL = 24 * 60 * 60 * 1000;
  const list = widget.querySelector('[data-wikimedia-list]');
  const status = widget.querySelector('[data-wikimedia-status]');
  const refreshButton = widget.querySelector('[data-wikimedia-refresh]');
  const topics = [
    { label: 'DATA & INFRASTRUCTURE', query: 'data center server rack' },
    { label: 'SOFTWARE & COMPUTING', query: 'computer programming workstation' },
    { label: 'SCIENCE & TECHNOLOGY', query: 'scientific research technology laboratory' },
    { label: 'SPACE & OBSERVATION', query: 'space telescope observatory' }
  ];
  const date = new Date();
  const topic = topics[Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000) % topics.length];

  const setStatus = (message, stale = false) => {
    status.textContent = message;
    widget.classList.toggle('is-stale', stale);
  };

  const readCache = () => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      return cached && Array.isArray(cached.images) ? cached : null;
    } catch (_) { return null; }
  };

  const saveCache = images => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), topic: topic.label, images })); }
    catch (_) { /* El widget funciona aunque el almacenamiento local esté bloqueado. */ }
  };

  const makeElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  const safeHttpUrl = value => {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch (_) { return ''; }
  };

  const plainText = value => {
    if (!value) return '';
    const parser = new DOMParser();
    return (parser.parseFromString(String(value), 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim();
  };

  const render = images => {
    const fragment = document.createDocumentFragment();
    images.forEach((item, index) => {
      const card = makeElement('article', 'commons-card');
      const fileUrl = safeHttpUrl(item.fileUrl);
      const imageUrl = safeHttpUrl(item.imageUrl);
      if (!fileUrl || !imageUrl) return;

      const imageLink = makeElement('a', 'commons-image-link');
      imageLink.href = fileUrl;
      imageLink.target = '_blank';
      imageLink.rel = 'noopener noreferrer';
      imageLink.setAttribute('aria-label', `Ver archivo original: ${item.title}`);
      const image = makeElement('img');
      image.src = imageUrl;
      image.alt = item.title || 'Imagen de Wikimedia Commons';
      image.loading = 'lazy';
      image.decoding = 'async';
      imageLink.append(image);

      const body = makeElement('div', 'commons-card-body');
      body.append(makeElement('span', 'commons-card-index', `VISUAL / 0${index + 1}`));
      const title = makeElement('a', 'commons-card-title', item.title || 'Imagen sin título');
      title.href = fileUrl;
      title.target = '_blank';
      title.rel = 'noopener noreferrer';
      const attribution = makeElement('p', 'commons-attribution', item.artist ? `Autoría: ${item.artist}` : 'Autoría: consultar ficha del archivo');
      const license = makeElement('a', 'commons-license', item.license || 'Consultar licencia y condiciones ↗');
      license.href = safeHttpUrl(item.licenseUrl) || fileUrl;
      license.target = '_blank';
      license.rel = 'noopener noreferrer';
      body.append(title, attribution, license);
      card.append(imageLink, body);
      card.style.setProperty('--commons-card-index', index);
      fragment.append(card);
    });
    const renderedCount = fragment.childNodes.length;
    list.replaceChildren(fragment);
    if (!renderedCount) throw new Error('No se encontraron imágenes con metadatos utilizables.');
  };

  const fetchImages = async () => {
    const params = new URLSearchParams({
      action: 'query', format: 'json', formatversion: '2', origin: '*',
      generator: 'search', gsrsearch: `filetype:bitmap ${topic.query}`,
      gsrnamespace: '6', gsrlimit: '8',
      prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '900',
      iiextmetadatalanguage: 'en',
      iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|Attribution'
    });
    const response = await fetch(`${API_URL}?${params.toString()}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Wikimedia respondió ${response.status}.`);
    const data = await response.json();
    if (data.error) throw new Error(data.error.info || 'Error en Wikimedia Commons.');

    const pages = Array.isArray(data.query?.pages) ? data.query.pages : [];
    const images = pages.map(page => {
      const info = page.imageinfo?.[0];
      const metadata = info?.extmetadata || {};
      const artist = plainText(metadata.Artist?.value || metadata.Attribution?.value || '');
      return {
        title: String(page.title || '').replace(/^File:/, '').replace(/_/g, ' '),
        imageUrl: info?.thumburl || info?.url || '',
        fileUrl: info?.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || '')}`,
        artist: artist.slice(0, 180),
        license: plainText(metadata.LicenseShortName?.value || ''),
        licenseUrl: plainText(metadata.LicenseUrl?.value || '')
      };
    }).filter(item => safeHttpUrl(item.imageUrl) && safeHttpUrl(item.fileUrl));

    if (!images.length) throw new Error('No se encontraron imágenes disponibles para esta temática.');
    return images.slice(0, 3);
  };

  const load = async (force = false) => {
    const cached = readCache();
    if (!force && cached && cached.topic === topic.label && Date.now() - cached.savedAt < CACHE_TTL) {
      render(cached.images);
      setStatus(`Selección diaria · ${topic.label} · Caché local`);
      return;
    }

    widget.classList.add('is-loading');
    if (!list.children.length) setStatus('Buscando imágenes y licencias en Wikimedia Commons…');
    try {
      const images = await fetchImages();
      render(images);
      saveCache(images);
      setStatus(`Selección diaria · ${topic.label} · ${new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date())}`);
    } catch (error) {
      if (cached?.images?.length) {
        render(cached.images);
        setStatus('No fue posible actualizar. Se muestra la última selección guardada.', true);
      } else {
        list.replaceChildren(makeElement('p', 'commons-empty', 'No fue posible cargar la galería en este momento. Puedes consultar imágenes directamente en Wikimedia Commons.'));
        setStatus('Servicio temporalmente no disponible.', true);
      }
      console.warn('[Wikimedia Commons]', error);
    } finally {
      widget.classList.remove('is-loading');
    }
  };

  refreshButton?.addEventListener('click', () => load(true));
  load();
})();
