// Embeddable Form Script
// Usage: configure via window.FormEmbedConfig = { domain: 'https://app.example.com', formId: '123' }

(function () {
  // Default configuration (do NOT default domain to the host page origin)
  const defaultConfig = {
    formId: null, // REQUIRED
    buttonText: 'Contact Us',
    buttonColor: '#007bff',
    buttonPosition: 'bottom-right', // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    buttonSize: 'medium', // 'small' | 'medium' | 'large'
    modalWidth: '90%',
    modalHeight: '80%',
    domain: null // REQUIRED: full origin of your form host (e.g. "https://app.example.com")
  };

  const config = { ...defaultConfig, ...(window.FormEmbedConfig || {}) };

  // Basic validations
  if (!config.formId) {
    console.error('FormEmbed: formId is required in window.FormEmbedConfig');
    return;
  }
  if (!config.domain) {
    console.error(
      'FormEmbed: domain is required in window.FormEmbedConfig. ' +
        'Set it to the full origin of your form host, e.g. "https://app.example.com".'
    );
    return;
  }

  // Normalize domain -> allowedOrigin
  let allowedOrigin;
  try {
    allowedOrigin = new URL(config.domain).origin;
  } catch (err) {
    console.error('FormEmbed: invalid domain provided in FormEmbedConfig:', config.domain);
    return;
  }

  // Build styles
  const styles = `
    .form-embed-button {
      position: fixed;
      z-index: 9999;
      border: none;
      border-radius: 50%;
      color: white;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .form-embed-button:hover {
      transform: scale(1.06);
      box-shadow: 0 6px 12px rgba(0,0,0,0.3);
    }
    .form-embed-button.bottom-right { bottom: 20px; right: 20px; }
    .form-embed-button.bottom-left  { bottom: 20px; left: 20px; }
    .form-embed-button.top-right    { top: 20px; right: 20px; }
    .form-embed-button.top-left     { top: 20px; left: 20px; }
    .form-embed-button.small { width: 50px; height: 50px; font-size: 12px; }
    .form-embed-button.medium { width: 60px; height: 60px; font-size: 14px; }
    .form-embed-button.large { width: 70px; height: 70px; font-size: 16px; }

    .form-embed-modal {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 10000;
      display: none;
      justify-content: center;
      align-items: center;
    }
    .form-embed-modal.show { display: flex; }
    .form-embed-modal-content {
      background: white;
      border-radius: 8px;
      width: ${config.modalWidth};
      height: ${config.modalHeight};
      position: relative;
      overflow: hidden;
      max-width: 1000px;
    }
    .form-embed-close {
      position: absolute;
      top: 10px;
      right: 10px;
      background: #f0f0f0;
      border: none;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      cursor: pointer;
      font-size: 18px;
      z-index: 10001;
    }
    .form-embed-iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }
  `;

  // Inject styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Create floating button
  const button = document.createElement('button');
  button.className = `form-embed-button ${config.buttonPosition} ${config.buttonSize}`;
  button.style.backgroundColor = config.buttonColor;
  button.textContent = config.buttonText;
  document.body.appendChild(button);

  // Create modal
  const modal = document.createElement('div');
  modal.className = 'form-embed-modal';
  const iframeSrc = `${allowedOrigin.replace(/\/$/, '')}/embed/form?id=${encodeURIComponent(config.formId)}`;
  modal.innerHTML = `
    <div class="form-embed-modal-content">
      <button class="form-embed-close" aria-label="Close">&times;</button>
      <iframe class="form-embed-iframe" src="${iframeSrc}" frameborder="0" allow="clipboard-write"></iframe>
    </div>
  `;
  document.body.appendChild(modal);

  // Event listeners
  button.addEventListener('click', () => {
    modal.classList.add('show');
  });

  modal.addEventListener('click', (e) => {
    // Click outside content or click on close button closes modal
    if (e.target === modal || e.target.classList.contains('form-embed-close')) {
      modal.classList.remove('show');
    }
  });

  // Listen for messages from iframe. Accept both string and object messages.
  window.addEventListener('message', (event) => {
    // Only accept messages from the configured form host origin
    if (event.origin !== allowedOrigin) return;

    // Normalize the payload
    let type;
    if (typeof event.data === 'string') {
      type = event.data;
    } else if (event.data && typeof event.data === 'object') {
      type = event.data.type || null;
    }

    if (!type) return;

    if (type === 'formSubmitted') {
      modal.classList.remove('show');
      // Optional: show an inline toast or callback (not doing by default)
    } else if (type === 'closeModal') {
      modal.classList.remove('show');
    } else if (type === 'resize' && event.data && event.data.height) {
      // Optional: resize iframe height if requested
      const iframe = modal.querySelector('.form-embed-iframe');
      if (iframe) iframe.style.height = `${event.data.height}px`;
    }
  });
})();
