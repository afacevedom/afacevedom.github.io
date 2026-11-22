(() => {
  const widget = document.querySelector('[data-hn-widget]');
  if (!widget) return;

  const API = 'https://hacker-news.firebaseio.com/v0';
  const CACHE_KEY = 'engineeringLab.hackernews.v1';
  const CACHE_TTL = 10 * 60 * 1000;
  const STORY_COUNT = 6;
  const list = widget.querySelector('[data-hn-list]');
  const status = widget.querySelector('[data-hn-status]');
  const refreshButton = widget.querySelector('[data-hn-refresh]');
  const dateFormat = new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });

  const setStatus = (message, stale = false) => {
    status.textContent = message;
    widget.classList.toggle('is-stale', stale);
  };

  const readCache = () => {
    try {
      const value = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      return value && Array.isArray(value.stories) ? value : null;
    } catch (_) { return null; }
  };

  const saveCache = stories => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), stories })); }
    catch (_) { /* La API sigue disponible si el navegador bloquea el almacenamiento. */ }
  };

  const makeElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  const render = stories => {
    const fragment = document.createDocumentFragment();
    stories.forEach((story, index) => {
      const card = makeElement('article', 'news-card');
      const top = makeElement('div', 'news-card-top');
      top.append(makeElement('span', 'news-index', String(index + 1).padStart(2, '0')));
      top.append(makeElement('span', 'news-source', 'HACKER NEWS'));
      const titleLink = makeElement('a', 'news-title', story.title || 'Historia sin título');
      titleLink.href = story.url || `https://news.ycombinator.com/item?id=${story.id}`;
      titleLink.target = '_blank';
      titleLink.rel = 'noopener noreferrer';
      const meta = makeElement('div', 'news-meta');
      meta.append(makeElement('span', '', `▲ ${story.score || 0} puntos`));
      meta.append(makeElement('span', '', `◌ ${story.descendants || 0} comentarios`));
      if (story.time) meta.append(makeElement('span', '', dateFormat.format(new Date(story.time * 1000))));
      const discussion = makeElement('a', 'news-discussion', 'Ver discusión ↗');
      discussion.href = `https://news.ycombinator.com/item?id=${story.id}`;
      discussion.target = '_blank';
      discussion.rel = 'noopener noreferrer';
      card.append(top, titleLink, meta, discussion);
      fragment.append(card);
    });
    list.replaceChildren(fragment);
  };

  const getJSON = async url => {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Hacker News respondió HTTP ${response.status}`);
    return response.json();
  };

  const fetchStories = async () => {
    const ids = await getJSON(`${API}/topstories.json`);
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('No se recibieron historias');
    // Consultamos un pequeño grupo de historias para mantener la carga ligera.
    const candidates = await Promise.all(ids.slice(0, 12).map(id =>
      getJSON(`${API}/item/${id}.json`).catch(() => null)
    ));
    const stories = candidates
      .filter(item => item && item.type === 'story' && !item.deleted && !item.dead && item.title)
      .slice(0, STORY_COUNT);
    if (!stories.length) throw new Error('No hay historias disponibles');
    return stories;
  };

  const load = async (force = false) => {
    const cached = readCache();
    if (!force && cached && Date.now() - cached.savedAt < CACHE_TTL) {
      render(cached.stories);
      const minutes = Math.max(1, Math.round((Date.now() - cached.savedAt) / 60000));
      setStatus(`Historias guardadas hace ${minutes} min · Caché de 10 minutos`);
      return;
    }

    widget.classList.add('is-loading');
    refreshButton.disabled = true;
    setStatus('Buscando historias destacadas…');
    try {
      const stories = await fetchStories();
      render(stories);
      saveCache(stories);
      setStatus(`Actualizado ${dateFormat.format(new Date())} · ${stories.length} historias`);
    } catch (error) {
      if (cached) {
        render(cached.stories);
        setStatus('No fue posible actualizar. Se muestran las últimas historias guardadas.', true);
      } else {
        list.replaceChildren(makeElement('p', 'news-empty', 'No fue posible cargar las noticias. Intenta nuevamente en unos minutos.'));
        setStatus('Sin conexión con Hacker News. Puedes intentar de nuevo.', true);
      }
      console.warn('[Engineering Lab] Hacker News:', error);
    } finally {
      widget.classList.remove('is-loading');
      refreshButton.disabled = false;
    }
  };

  refreshButton.addEventListener('click', () => load(true));
  load();
})();
