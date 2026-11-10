(() => {
  let challenge;

  function createChallenge() {
    const dialog = document.createElement('dialog');
    dialog.className = 'copy-editor contact-challenge';
    dialog.setAttribute('aria-labelledby', 'contact-challenge-title');
    dialog.innerHTML = `
      <form>
        <div class="copy-editor-heading">
          <h2 id="contact-challenge-title">Copy email address</h2>
          <button type="button" data-close>Close</button>
        </div>
        <p>Answer this quick check to copy the address.</p>
        <label><span data-question></span><input inputmode="numeric" autocomplete="off" required autofocus></label>
        <div class="copy-editor-actions"><button type="submit">Copy email</button></div>
        <p role="status"></p>
      </form>`;
    document.body.append(dialog);

    const form = dialog.querySelector('form');
    const input = form.querySelector('input');
    const question = form.querySelector('[data-question]');
    const status = form.querySelector('[role="status"]');
    const submit = form.querySelector('[type="submit"]');
    let trigger;
    let expected;
    let attempt = 0;

    function newQuestion() {
      const [first, second] = crypto.getRandomValues(new Uint8Array(2));
      const a = 2 + first % 8;
      const b = 2 + second % 8;
      expected = String(a + b);
      question.textContent = `What is ${a} + ${b}?`;
      input.value = '';
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (input.value.trim() !== expected) {
        newQuestion();
        status.textContent = 'Incorrect answer. Try the new question.';
        input.focus();
        return;
      }

      const current = ++attempt;
      submit.disabled = true;
      try {
        await navigator.clipboard.writeText(trigger.textContent.trim());
        if (current !== attempt) return;
        input.readOnly = true;
        status.textContent = 'Email address copied.';
        form.querySelector('[data-close]').focus();
      } catch {
        if (current !== attempt) return;
        submit.disabled = false;
        status.textContent = 'Clipboard access was blocked. Allow it in your browser and try again.';
      }
    });

    form.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => trigger?.focus());

    return (button) => {
      if (dialog.open) return;
      attempt += 1;
      trigger = button;
      status.textContent = '';
      submit.disabled = false;
      input.readOnly = false;
      newQuestion();
      dialog.showModal();
    };
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-copy-contact]');
    if (!button) return;
    challenge ??= createChallenge();
    challenge(button);
  });
})();
