(() => {
  let viewer;

  // Adapted from the supplied React Bits RefineFrame example.
  async function revealImage(picture, canvas, status, signal) {
    const frame = picture.parentElement;
    frame.dataset.reveal = 'loading';
    status.textContent = 'Opening image…';
    try {
      await picture.decode();
    } catch {
      if (signal.aborted) return;
      if (!picture.naturalWidth) {
        frame.dataset.reveal = 'failed';
        status.textContent = 'Image could not be opened.';
        return;
      }
    }
    if (signal.aborted) return;

    let fallback;
    function finish() {
      clearTimeout(fallback);
      if (signal.aborted) return;
      frame.dataset.reveal = 'ready';
      status.textContent = 'Image ready';
      canvas.width = canvas.height = 1;
    }

    const context = canvas.getContext('2d');
    const bounds = picture.getBoundingClientRect();
    if (!context || !bounds.width || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }

    const width = Math.min(900, Math.round(bounds.width));
    const height = Math.max(1, Math.round(width * picture.naturalHeight / picture.naturalWidth));
    canvas.width = width;
    canvas.height = height;
    context.imageSmoothingEnabled = false;
    const layers = [32, 16, 8, 4, 2, 1].map((block) => {
      const layer = document.createElement('canvas');
      layer.width = Math.max(1, Math.round(width / block));
      layer.height = Math.max(1, Math.round(height / block));
      layer.getContext('2d').drawImage(picture, 0, 0, layer.width, layer.height);
      return layer;
    });

    const duration = 950;
    const start = performance.now();
    function paint(now) {
      if (signal.aborted || frame.dataset.reveal !== 'refining') return;
      const progress = Math.max(0, Math.min(1, (now - start) / duration));
      if (progress === 1) {
        finish();
        return;
      }
      const position = progress * (layers.length - 1);
      const index = Math.floor(position);
      const edge = Math.round((position - index) * height);
      context.drawImage(layers[index], 0, 0, width, height);
      context.save();
      context.beginPath();
      context.rect(0, 0, width, edge);
      context.clip();
      context.drawImage(layers[index + 1], 0, 0, width, height);
      context.restore();
      context.fillStyle = 'rgba(220, 190, 255, .22)';
      context.fillRect(0, edge - 1, width, 2);
      requestAnimationFrame(paint);
    }
    frame.dataset.reveal = 'refining';
    status.textContent = 'Refining image…';
    fallback = setTimeout(finish, duration + 100);
    paint(start);
  }

  function createViewer() {
    const dialog = document.createElement('dialog');
    dialog.className = 'plantopia-viewer';
    dialog.setAttribute('aria-labelledby', 'plantopia-viewer-title');
    dialog.innerHTML = `
      <div class="plantopia-viewer-header">
        <h2 id="plantopia-viewer-title"></h2>
        <div class="plantopia-viewer-controls">
          <button type="button" data-zoom="-1" aria-label="Zoom out">−</button>
          <button type="button" data-zoom="1" aria-label="Zoom in">+</button>
          <button type="button" data-close autofocus>Close</button>
        </div>
      </div>
      <div class="plantopia-viewer-stage" tabindex="0" role="region" aria-label="Scrollable diagram">
        <div class="plantopia-viewer-image">
          <img alt="">
          <canvas aria-hidden="true"></canvas>
          <span class="plantopia-reveal-status" role="status"></span>
        </div>
      </div>`;
    const title = dialog.querySelector('h2');
    const stage = dialog.querySelector('.plantopia-viewer-stage');
    const picture = stage.querySelector('img');
    const frame = picture.parentElement;
    const canvas = frame.querySelector('canvas');
    const status = frame.querySelector('[role="status"]');
    let reveal;
    const minus = dialog.querySelector('[data-zoom="-1"]');
    const plus = dialog.querySelector('[data-zoom="1"]');
    const levels = [1, 1.5, 2, 3];
    let level;
    let trigger;

    function setZoom(next) {
      level = next;
      frame.style.setProperty('--diagram-zoom', levels[level]);
      minus.disabled = level === 0;
      plus.disabled = level === levels.length - 1;
    }

    minus.addEventListener('click', () => setZoom(level - 1));
    plus.addEventListener('click', () => setZoom(level + 1));
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      reveal?.abort();
      trigger?.focus();
    });
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) {
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
      }
    });
    document.body.append(dialog);

    return (link) => {
      trigger = link;
      const thumbnail = link.querySelector('img');
      title.textContent = link.closest('figure').querySelector('figcaption').textContent;
      reveal?.abort();
      reveal = new AbortController();
      picture.width = Number(thumbnail.getAttribute('width'));
      picture.height = Number(thumbnail.getAttribute('height'));
      picture.src = link.href;
      picture.alt = thumbnail.alt;
      const portrait = Number(thumbnail.getAttribute('width')) < Number(thumbnail.getAttribute('height'));
      frame.style.setProperty('--diagram-fit', portrait ? '52dvh' : '95dvh');
      setZoom(0);
      dialog.showModal();
      stage.scrollTo(0, 0);
      revealImage(picture, canvas, status, reveal.signal);
    };
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('.plantopia-image-frame a');
    if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    viewer ??= createViewer();
    viewer(link);
  });
})();
