(() => {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const status = document.getElementById('contact-form-status');
  const submitButton = form.querySelector('button[type="submit"]');
  const submitLabel = form.querySelector('[data-submit-label]');
  const config = window.ENGINEERING_EMAILJS_CONFIG || {};
  const configured = [config.publicKey, config.serviceId, config.templateId]
    .every(value => typeof value === 'string' && value.trim() && !value.startsWith('YOUR_'));

  const setStatus = (message, state = 'info') => {
    status.textContent = message;
    status.dataset.state = state;
  };

  if (!configured || !window.emailjs) {
    setStatus('El formulario no está disponible temporalmente. Intenta más tarde.', 'error');
    return;
  }

  try {
    window.emailjs.init({
      publicKey: config.publicKey,
      blockHeadless: true,
      limitRate: { id: 'engineering-lab-contact', throttle: 10000 }
    });
  } catch (error) {
    setStatus('No fue posible inicializar el servicio de contacto. Intenta más tarde.', 'error');
    return;
  }

  setStatus('Formulario disponible. Completa los campos para enviar tu mensaje.', 'ready');

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    // Honeypot: bots often fill every field. Silently stop the submission.
    if (form.elements.company.value.trim()) {
      form.reset();
      setStatus('No fue posible procesar el mensaje.', 'error');
      return;
    }

    if (!navigator.onLine) {
      setStatus('Parece que no tienes conexión. Revisa Internet e inténtalo de nuevo.', 'error');
      return;
    }

    submitButton.disabled = true;
    submitButton.classList.add('is-sending');
    submitLabel.textContent = 'Enviando...';
    setStatus('Conectando con EmailJS…', 'info');

    try {
      await window.emailjs.sendForm(config.serviceId, config.templateId, form);
      form.reset();
      setStatus('Mensaje enviado correctamente. Gracias por escribir; responderé tan pronto como sea posible.', 'success');
    } catch (error) {
      console.error('EmailJS contact submission failed:', error);
      const message = error && error.status === 429
        ? 'Has enviado un mensaje hace muy poco. Espera unos segundos antes de intentarlo de nuevo.'
        : 'No se pudo enviar el mensaje. Inténtalo nuevamente más tarde o utiliza otro canal de contacto.';
      setStatus(message, 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.classList.remove('is-sending');
      submitLabel.textContent = 'Enviar mensaje';
    }
  });
})();
