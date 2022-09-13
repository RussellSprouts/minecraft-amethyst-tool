import { assertInstanceOf, $ } from "./util";

export function activateFileSelects() {
  for (const element of document.getElementsByClassName('file-select')) {
    const el = assertInstanceOf(element, HTMLElement);
    const span = assertInstanceOf(el.querySelector('span'), HTMLSpanElement);
    const input = assertInstanceOf(el.querySelector('input'), HTMLInputElement);
    const defaultText = span.textContent;

    let warning: HTMLElement;
    let warningTimeout = 0;
    const cancelWarning = () => {
      if (warningTimeout) {
        clearTimeout(warningTimeout);
      }
      if (warning) {
        warning.classList.add('hidden');
      }
    };
    if (el.dataset['warning']) {
      warning = $(`#${el.dataset['warning']}`);
      input.addEventListener('click', () => {
        warningTimeout = window.setTimeout(() => {
          warning.classList.remove('hidden');
        }, 10000);
      });
    }

    input.addEventListener('change', () => {
      if (!input.files || input.files.length === 0) {
        span.textContent = defaultText;
      } else if (input.files.length === 1) {
        span.textContent = `1 file selected.`;
        cancelWarning();
      } else {
        span.textContent = `${input.files.length} files selected.`;
        cancelWarning();
      }
    });
  }
}