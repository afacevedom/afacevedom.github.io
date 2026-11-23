/**
 * Coordinador de actualización automática con cuenta regresiva por fuente.
 * El vencimiento se guarda como timestamp absoluto: el tiempo sigue pasando
 * aunque la pestaña esté oculta o el navegador suspenda sus temporizadores.
 */
(() => {
  const services = new Map();
  let ticker = null;
  let started = false;

  const storageKey = name => `portfolio.refresh.${name}.nextAt`;

  const readStoredNextAt = name => {
    try {
      const value = Number(localStorage.getItem(storageKey(name)));
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch (_) {
      return null;
    }
  };

  const persistNextAt = service => {
    try { localStorage.setItem(storageKey(service.name), String(service.nextAt)); }
    catch (_) { /* El contador sigue funcionando en memoria. */ }
  };

  const initialNextAt = (name, ttl, cacheKey) => {
    const saved = readStoredNextAt(name);
    if (saved) return saved;

    if (cacheKey) {
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
        if (Number.isFinite(cached?.savedAt)) return cached.savedAt + ttl;
      } catch (_) { /* Se usa un ciclo nuevo si la caché no se puede leer. */ }
    }
    return Date.now() + ttl;
  };

  const formatRemaining = milliseconds => {
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = value => String(value).padStart(2, '0');
    return hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;
  };

  const renderCountdown = service => {
    const remaining = service.nextAt - Date.now();
    if (service.inFlight || remaining <= 0) {
      service.element.textContent = 'ACTUALIZANDO…';
      service.element.setAttribute('aria-label', `Actualizando ${service.name}`);
      service.element.classList.add('is-refreshing');
      return;
    }
    service.element.textContent = `PRÓXIMA EN ${formatRemaining(remaining)}`;
    service.element.setAttribute(
      'aria-label',
      `Próxima actualización de ${service.name} en ${formatRemaining(remaining)}`
    );
    service.element.classList.remove('is-refreshing');
  };

  const updateCountdowns = () => {
    services.forEach(renderCountdown);
  };

  const startTicker = () => {
    if (ticker || document.visibilityState !== 'visible') return;
    updateCountdowns();
    ticker = window.setInterval(updateCountdowns, 1000);
  };

  const stopTicker = () => {
    if (ticker) window.clearInterval(ticker);
    ticker = null;
  };

  const schedule = (service, delay = service.ttl) => {
    window.clearTimeout(service.timer);
    service.nextAt = Date.now() + Math.max(0, delay);
    persistNextAt(service);
    renderCountdown(service);

    if (document.visibilityState !== 'visible') return;
    service.timer = window.setTimeout(() => refresh(service), Math.max(0, delay));
  };

  const refresh = async service => {
    if (document.visibilityState !== 'visible') return;
    if (service.inFlight) return service.inFlight;

    service.inFlight = Promise.resolve()
      .then(() => {
        renderCountdown(service);
        return service.refresh();
      })
      .catch(error => console.warn(`[Portfolio] Auto-refresh ${service.name}:`, error))
      .finally(() => {
        service.inFlight = null;
        schedule(service, service.ttl);
      });

    renderCountdown(service);
    return service.inFlight;
  };

  const start = () => {
    if (started) return;
    started = true;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') {
        services.forEach(service => window.clearTimeout(service.timer));
        stopTicker();
        return;
      }

      startTicker();
      services.forEach(service => {
        const remaining = service.nextAt - Date.now();
        if (remaining <= 0) refresh(service);
        else schedule(service, remaining);
      });
      updateCountdowns();
    });

    window.addEventListener('online', () => {
      if (document.visibilityState !== 'visible') return;
      services.forEach(service => {
        if (Date.now() >= service.nextAt) refresh(service);
      });
    });

    startTicker();
  };

  window.PortfolioLiveRefresh = {
    register(name, ttl, refreshCallback, manualButton, cacheKey) {
      if (services.has(name)) return;

      const element = document.querySelector(`[data-refresh-countdown="${name}"]`);
      if (!element) return;

      const service = {
        name,
        ttl,
        refresh: refreshCallback,
        element,
        timer: null,
        nextAt: initialNextAt(name, ttl, cacheKey),
        inFlight: null
      };

      services.set(name, service);
      persistNextAt(service);
      start();
      renderCountdown(service);

      const remaining = service.nextAt - Date.now();
      // Cada servicio ya inició su carga inicial antes de registrarse.
      // Si el vencimiento anterior pasó, el siguiente ciclo comienza ahora.
      schedule(service, remaining > 0 ? remaining : ttl);

      // La actualización manual inicia un nuevo ciclo desde el momento del clic.
      manualButton?.addEventListener('click', () => schedule(service, ttl));
    }
  };
})();
