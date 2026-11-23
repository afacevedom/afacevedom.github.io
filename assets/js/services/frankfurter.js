(() => {
  const widget = document.querySelector('[data-market-widget]');
  if (!widget) return;

  const API_BASE = 'https://api.frankfurter.dev/v2/rate';
  const CACHE_KEY = 'engineeringLab.frankfurter.v1';
  const CACHE_TTL = 6 * 60 * 60 * 1000;
  const pairs = [
    { code: 'USD', quote: 'COP', label: 'Dólar estadounidense' },
    { code: 'EUR', quote: 'COP', label: 'Euro' }
  ];

  const refreshButton = widget.querySelector('[data-market-refresh]');
  const status = widget.querySelector('[data-market-status]');
  const formatCOP = new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 2
  });
  const formatDate = new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Bogota'
  });

  const setStatus = (message, stale = false) => {
    status.textContent = message;
    widget.classList.toggle('is-stale', stale);
  };

  const renderRate = (item) => {
    const card = widget.querySelector(`[data-currency="${item.base}"]`);
    if (!card) return;
    card.querySelector('[data-rate-value]').textContent = formatCOP.format(item.rate);
    card.querySelector('[data-rate-date]').textContent = `Dato efectivo: ${formatDate.format(new Date(`${item.date}T12:00:00`))}`;
  };

  const readCache = () => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      return cached && Array.isArray(cached.rates) ? cached : null;
    } catch (_) {
      return null;
    }
  };

  const saveCache = (rates) => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), rates })); }
    catch (_) { /* El widget sigue funcionando aunque el almacenamiento esté bloqueado. */ }
  };

  const fetchRates = async () => {
    const results = await Promise.all(pairs.map(async ({ code, quote }) => {
      const response = await fetch(`${API_BASE}/${code.toLowerCase()}/${quote.toLowerCase()}`, {
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`Frankfurter respondió HTTP ${response.status}`);
      const data = await response.json();
      if (typeof data.rate !== 'number' || !data.date) throw new Error('Respuesta de tasa incompleta');
      return data;
    }));
    return results;
  };

  const load = async (force = false) => {
    const cached = readCache();
    if (!force && cached && Date.now() - cached.savedAt < CACHE_TTL) {
      cached.rates.forEach(renderRate);
      const ageMinutes = Math.max(1, Math.round((Date.now() - cached.savedAt) / 60000));
      setStatus(`Datos guardados hace ${ageMinutes} min · Caché de 6 horas`);
      return;
    }

    widget.classList.add('is-loading');
    refreshButton.disabled = true;
    setStatus('Consultando tipos de referencia…');
    try {
      const rates = await fetchRates();
      rates.forEach(renderRate);
      saveCache(rates);
      const latestDate = rates.map(item => item.date).sort().at(-1);
      setStatus(`Datos actualizados · Fecha de referencia: ${formatDate.format(new Date(`${latestDate}T12:00:00`))}`);
    } catch (error) {
      if (cached) {
        cached.rates.forEach(renderRate);
        setStatus('No fue posible actualizar. Se muestran los últimos datos guardados.', true);
      } else {
        widget.querySelectorAll('[data-rate-value]').forEach(el => { el.textContent = 'No disponible'; });
        widget.querySelectorAll('[data-rate-date]').forEach(el => { el.textContent = 'Intenta nuevamente más tarde'; });
        setStatus('No se pudo conectar con Frankfurter. Puedes intentar de nuevo.', true);
      }
      console.warn('[Engineering Lab] Frankfurter:', error);
    } finally {
      widget.classList.remove('is-loading');
      refreshButton.disabled = false;
    }
  };

  refreshButton.addEventListener('click', () => load(true));
  load();
  window.PortfolioLiveRefresh?.register('Frankfurter', 6 * 60 * 60 * 1000, () => load(true), refreshButton, CACHE_KEY);
})();
