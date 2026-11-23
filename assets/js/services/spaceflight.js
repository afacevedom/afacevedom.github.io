(() => {
  const widget = document.querySelector('[data-spaceflight-widget]');
  if (!widget) return;

  const API_URL = 'https://api.spaceflightnewsapi.net/v4/articles/?limit=4&ordering=-published_at';
  const CACHE_KEY = 'engineeringLab.spaceflight.v1';
  const CACHE_TTL = 30 * 60 * 1000;
  const list = widget.querySelector('[data-spaceflight-list]');
  const status = widget.querySelector('[data-spaceflight-status]');
  const refreshButton = widget.querySelector('[data-spaceflight-refresh]');
  const dateFormat = new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const setStatus = (message, stale = false) => {
    status.textContent = message;
    widget.classList.toggle('is-stale', stale);
  };

  const readCache = () => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      return cached && Array.isArray(cached.articles) ? cached : null;
    } catch (_) { return null; }
  };

  const saveCache = articles => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), articles })); }
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

  const render = articles => {
    const fragment = document.createDocumentFragment();
    articles.forEach((article, index) => {
      const card = makeElement('article', 'space-card');
      const imageUrl = safeHttpUrl(article.image_url);
      if (imageUrl) {
        const imageLink = makeElement('a', 'space-card-image');
        imageLink.href = safeHttpUrl(article.url) || 'https://www.spaceflightnewsapi.net/';
        imageLink.target = '_blank';
        imageLink.rel = 'noopener noreferrer';
        const image = makeElement('img');
        image.src = imageUrl;
        image.alt = article.title ? `Imagen: ${article.title}` : 'Imagen de noticia espacial';
        image.loading = 'lazy';
        image.decoding = 'async';
        imageLink.append(image);
        card.append(imageLink);
      } else {
        card.append(makeElement('div', 'space-card-image space-card-image-empty', 'SPACE / NEWS'));
      }

      const body = makeElement('div', 'space-card-body');
      const meta = makeElement('div', 'space-card-meta');
      meta.append(makeElement('span', 'space-source', article.news_site || 'SPACEFLIGHT NEWS'));
      if (article.published_at) {
        const published = new Date(article.published_at);
        if (!Number.isNaN(published.getTime())) meta.append(makeElement('time', '', dateFormat.format(published)));
      }
      const title = makeElement('a', 'space-card-title', article.title || 'Artículo sin título');
      const articleUrl = safeHttpUrl(article.url);
      if (articleUrl) {
        title.href = articleUrl;
        title.target = '_blank';
        title.rel = 'noopener noreferrer';
      } else {
        title.removeAttribute('href');
      }
      const summary = makeElement('p', 'space-card-summary', article.summary || 'Consulta la publicación original para conocer los detalles de esta noticia.');
      const link = makeElement('a', 'space-card-link', 'Leer artículo original ↗');
      if (articleUrl) {
        link.href = articleUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      } else {
        link.hidden = true;
      }
      body.append(meta, title, summary, link);
      card.append(body);
      card.style.setProperty('--space-card-index', index);
      fragment.append(card);
    });
    list.replaceChildren(fragment);
  };

  const fetchArticles = async () => {
    const response = await fetch(API_URL, {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Spaceflight News respondió HTTP ${response.status}`);
    const data = await response.json();
    if (!data || !Array.isArray(data.results)) throw new Error('La respuesta no contiene una lista de artículos');
    const articles = data.results.filter(article => article && article.title && safeHttpUrl(article.url)).slice(0, 4);
    if (!articles.length) throw new Error('No se encontraron artículos disponibles');
    return articles;
  };

  const load = async (force = false) => {
    const cached = readCache();
    if (!force && cached && Date.now() - cached.savedAt < CACHE_TTL) {
      render(cached.articles);
      const age = Math.max(1, Math.round((Date.now() - cached.savedAt) / 60000));
      setStatus(`Artículos guardados hace ${age} min · Caché de 30 minutos`);
      return;
    }

    widget.classList.add('is-loading');
    refreshButton.disabled = true;
    setStatus('Consultando las últimas noticias espaciales…');
    try {
      const articles = await fetchArticles();
      render(articles);
      saveCache(articles);
      setStatus(`Actualizado ${dateFormat.format(new Date())} · ${articles.length} artículos`);
    } catch (error) {
      if (cached) {
        render(cached.articles);
        setStatus('No fue posible actualizar. Se muestran los últimos artículos guardados.', true);
      } else {
        list.replaceChildren(makeElement('p', 'space-empty', 'No fue posible cargar las noticias espaciales. Intenta nuevamente más tarde.'));
        setStatus('Sin conexión con Spaceflight News. Puedes intentar de nuevo.', true);
      }
      console.warn('[Engineering Lab] Spaceflight News:', error);
    } finally {
      widget.classList.remove('is-loading');
      refreshButton.disabled = false;
    }
  };

  refreshButton.addEventListener('click', () => load(true));
  load();
  window.PortfolioLiveRefresh?.register('Spaceflight News', 30 * 60 * 1000, () => load(true), refreshButton, CACHE_KEY);
})();
