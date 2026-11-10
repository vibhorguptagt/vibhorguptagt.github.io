(() => {
  const storageKey = 'portfolio-copy-v1';
  const outputKey = 'terminal:output';
  let edits = {};
  try {
    const priorKey = Object.keys(localStorage).find((key) => key.endsWith('-' + storageKey));
    const saved = localStorage.getItem(storageKey) ?? (priorKey ? localStorage.getItem(priorKey) : null);
    edits = parseEdits(saved ?? '{}');
  } catch {
    // The portfolio remains usable when browser storage is unavailable.
  }

  window.portfolioCopy = {
    get: (key, fallback) => edits[key] ?? fallback,
    terminalOutput: '',
  };

  function parseEdits(json) {
    const data = JSON.parse(json);
    if (!data || Array.isArray(data) || typeof data !== 'object') {
      throw new Error('Choose a portfolio copy JSON file.');
    }
    return Object.fromEntries(Object.entries(data).map(([key, value]) => {
      if ((!key.startsWith('[') && !key.startsWith('terminal:')) ||
          typeof value !== 'string') {
        throw new Error('Choose a portfolio copy JSON file.');
      }
      return [key, value];
    }));
  }

  // CodeSlots-style input for the browser-local copy editor.
  function mountPasscode(trigger, unlock) {
    const expected = 'ae3974b97a03a46ce1d20e29c77220f9aa0c3690d38890a91fb799e6f6d3cd2b';
    const dialog = document.createElement('dialog');
    dialog.className = 'copy-editor copy-passcode';
    dialog.setAttribute('aria-labelledby', 'copy-passcode-title');
    dialog.innerHTML = `
      <form autocomplete="off">
        <div class="copy-editor-heading">
          <h2 id="copy-passcode-title">Unlock editor</h2>
          <button type="button" data-cancel>Cancel</button>
        </div>
        <p>Enter the 8-digit passcode.</p>
        <div class="copy-code-row">
          <div class="copy-code-slots" aria-hidden="true"></div>
          <input aria-label="Editor passcode" type="password" inputmode="numeric"
                 autocomplete="off" maxlength="8" autofocus>
        </div>
        <p class="copy-code-status" role="status"></p>
      </form>`;
    const form = dialog.querySelector('form');
    const input = dialog.querySelector('input');
    const status = dialog.querySelector('[role="status"]');
    const row = dialog.querySelector('.copy-code-slots');
    const slots = Array.from({ length: 8 }, (_, index) => {
      const slot = document.createElement('span');
      slot.style.setProperty('--slot-index', index);
      row.append(slot);
      return slot;
    });
    let attempt = 0;
    let busy = false;
    let timer;

    function draw() {
      slots.forEach((slot, index) => {
        slot.toggleAttribute('data-filled', index < input.value.length);
        slot.toggleAttribute('data-current', index === input.value.length);
      });
    }

    function reset() {
      clearTimeout(timer);
      attempt += 1;
      busy = false;
      input.value = '';
      input.readOnly = false;
      dialog.dataset.state = 'idle';
      status.textContent = '';
      draw();
    }

    async function verify() {
      if (input.value.length !== slots.length || busy) return;
      busy = true;
      input.readOnly = true;
      const current = ++attempt;
      let match;
      try {
        const bytes = new TextEncoder().encode(input.value);
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        match = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('') === expected;
      } catch {
        if (current === attempt) {
          reset();
          status.textContent = 'Passcode verification requires HTTPS or localhost.';
        }
        return;
      }
      if (current !== attempt || !dialog.open) return;
      dialog.dataset.state = match ? 'success' : 'error';
      status.textContent = match ? '✓ Unlocked' : 'Incorrect passcode. Try again.';
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      timer = setTimeout(() => {
        if (match) {
          dialog.close();
          unlock();
        } else {
          const message = status.textContent;
          reset();
          status.textContent = message;
          input.focus();
        }
      }, reduced ? 0 : 340);
    }

    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, slots.length);
      status.textContent = '';
      draw();
      verify();
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      verify();
    });
    dialog.querySelector('[data-cancel]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', reset);
    trigger.addEventListener('click', () => {
      reset();
      document.body.append(dialog);
      dialog.showModal();
      input.focus();
    });
  }

  function mountEditor() {
    const trigger = document.createElement('button');
    trigger.className = 'copy-editor-trigger';
    trigger.setAttribute('aria-label', 'Edit text');
    trigger.setAttribute('aria-keyshortcuts', 'Alt+Shift+E');
    trigger.type = 'button';
    const dialog = document.createElement('dialog');
    dialog.className = 'copy-editor';
    dialog.setAttribute('aria-labelledby', 'copy-editor-title');
    dialog.innerHTML = `
      <form method="dialog" class="copy-editor-heading">
        <h2 id="copy-editor-title">Edit website text</h2>
        <button aria-label="Close editor">Close</button>
      </form>
      <p>Choose a piece of text on this page. Edits save in this browser.</p>
      <label>Find text <input type="search" id="copy-search" placeholder="Search the page or terminal"></label>
      <label>Text field <select id="copy-field"></select></label>
      <label>New text <textarea id="copy-value" rows="6" spellcheck="false"></textarea></label>
      <div class="copy-editor-actions">
        <button type="button" id="copy-save">Save text</button>
        <button type="button" id="copy-restore">Restore original</button>
      </div>
      <div class="copy-editor-actions">
        <button type="button" id="copy-export">Export edits</button>
        <button type="button" id="copy-import">Import edits</button>
        <input type="file" accept=".json,application/json" id="copy-file" hidden>
      </div>
      <p role="status" id="copy-status"></p>`;
    document.body.append(dialog);

    const $ = (selector) => dialog.querySelector(selector);
    const search = $('#copy-search');
    const select = $('#copy-field');
    const input = $('#copy-value');
    const status = $('#copy-status');
    const save = $('#copy-save');
    const restore = $('#copy-restore');
    const file = $('#copy-file');
    const defaults = new WeakMap();
    let fields = [];

    function textField(node, key, label, group) {
      if (!defaults.has(node)) defaults.set(node, node.data);
      return { key, label, group, original: defaults.get(node), node };
    }

    function collectFields() {
      const route = location.pathname.replace(/\/$/, '') || '/';
      const result = [];
      for (const [selector, group] of [['header', 'Navigation'], ['main', 'Page text'], ['footer', 'Footer']]) {
        const root = document.querySelector(selector);
        if (!root) continue;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const occurrences = new Map();
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const parent = node.parentElement;
          if (parent.closest('.crt-flicker, script, style, svg, [hidden]')) continue;
          const original = defaults.get(node) ?? node.data;
          if (!/[\p{L}\p{N}]/u.test(original)) continue;
          const id = JSON.stringify([selector === 'main' ? route : selector, parent.tagName, original]);
          const occurrence = occurrences.get(id) || 0;
          occurrences.set(id, occurrence + 1);
          const key = JSON.stringify([id, occurrence]);
          result.push(textField(node, key, original.trim().replace(/\s+/g, ' ').slice(0, 100), group));
        }
      }
      const terminal = document.querySelector('main .crt-flicker');
      if (route === '/' && terminal) {
        for (const [key, label, selector] of [
          ['prompt', 'Terminal title bar', ':scope > div:first-child span:last-child'],
          ['art-top', 'ASCII art · first line block', 'pre:nth-of-type(1)'],
          ['art-bottom', 'ASCII art · second line block', 'pre:nth-of-type(2)'],
          ['status', 'Terminal status bar', ':scope > div:last-child span:last-child'],
        ]) {
          const node = terminal.querySelector(selector)?.firstChild;
          if (node?.nodeType === Node.TEXT_NODE) {
            result.push(textField(node, 'terminal:' + key, label, 'Front-page terminal'));
          }
        }
        result.push({
          key: outputKey,
          label: 'Terminal typed output',
          group: 'Front-page terminal',
          original: window.portfolioCopy.terminalOutput,
        });
      }
      return result;
    }

    function applyEdits() {
      fields = collectFields();
      for (const { key, original, node } of fields) {
        const value = edits[key] ?? original;
        if (node && node.data !== value) node.data = value;
      }
    }

    function loadSelection() {
      const field = fields.find(({ key }) => key === select.value);
      input.disabled = save.disabled = restore.disabled = !field;
      input.value = field ? edits[field.key] ?? field.original : '';
    }

    function listFields(preferred = select.value) {
      select.replaceChildren();
      const query = search.value.trim().toLowerCase();
      const groups = new Map();
      for (const { key, label, group } of fields) {
        const searchable = [label, group, edits[key]].join(' ').toLowerCase();
        if (!searchable.includes(query)) continue;
        if (!groups.has(group)) {
          const section = document.createElement('optgroup');
          section.label = group;
          groups.set(group, section);
          select.append(section);
        }
        groups.get(group).append(new Option(label, key));
      }
      if (!select.options.length) select.add(new Option('No matching text', ''));
      if (Array.from(select.options).some(({ value }) => value === preferred)) select.value = preferred;
      loadSelection();
    }

    function storeEdits(next, message) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        status.textContent = 'Could not save. Browser storage is unavailable or full.';
        return;
      }
      const outputChanged = next[outputKey] !== edits[outputKey];
      edits = next;
      applyEdits();
      if (outputChanged) window.dispatchEvent(new Event('portfolio-terminal-edit'));
      listFields();
      status.textContent = message;
    }

    mountPasscode(trigger, () => {
      applyEdits();
      search.value = '';
      status.textContent = '';
      listFields();
      dialog.showModal();
    });
    document.addEventListener('keydown', (event) => {
      if (event.code !== 'KeyE' || !event.altKey || !event.shiftKey || event.ctrlKey ||
          event.metaKey || event.repeat || document.querySelector('dialog[open]') ||
          event.target.closest('input, textarea, select, [contenteditable]')) return;
      event.preventDefault();
      trigger.click();
    });
    search.addEventListener('input', () => listFields());
    select.addEventListener('change', loadSelection);
    save.addEventListener('click', () => {
      if (select.value) storeEdits({ ...edits, [select.value]: input.value }, 'Saved in this browser.');
    });
    restore.addEventListener('click', () => {
      if (!select.value) return;
      const next = { ...edits };
      delete next[select.value];
      storeEdits(next, 'Original text restored.');
    });
    $('#copy-export').addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(edits, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'portfolio-copy.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    $('#copy-import').addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
      const selected = file.files[0];
      if (!selected) return;
      try {
        storeEdits({ ...edits, ...parseEdits(await selected.text()) }, 'Edits imported.');
      } catch (error) {
        status.textContent = error.message;
      } finally {
        file.value = '';
      }
    });
    window.addEventListener('storage', (event) => {
      if (event.key !== storageKey) return;
      try {
        edits = parseEdits(event.newValue || '{}');
        applyEdits();
        window.dispatchEvent(new Event('portfolio-terminal-edit'));
        if (dialog.open) listFields();
      } catch {
        // Ignore invalid data written outside the editor.
      }
    });

    let scheduled = false;
    function queueApply() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        const greenDot = document.querySelector('main .crt-flicker > div:first-child > span:nth-child(3)');
        if (greenDot && trigger.parentElement !== greenDot) greenDot.append(trigger);
        if (!dialog.isConnected) document.body.append(dialog);
        applyEdits();
      });
    }
    // Watch for React route swaps. Ignore animation and editor-only mutations.
    const observer = new MutationObserver((records) => {
      if (records.some(({ target, addedNodes, removedNodes }) => {
        if (dialog.contains(target) || trigger.contains(target)) return false;
        if (target.nodeType === Node.ELEMENT_NODE && target.closest('.crt-flicker')) return false;
        return [...addedNodes, ...removedNodes].some((node) =>
          node.nodeType === Node.ELEMENT_NODE &&
          (node.matches('header, main, footer') || node.querySelector('header, main, footer'))
        );
      })) queueApply();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    queueApply();
  }

  window.addEventListener('load', () => setTimeout(mountEditor, 450), { once: true });
})();
