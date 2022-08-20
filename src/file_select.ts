import { assertInstanceOf } from "./util";

export function activateFileSelects() {
  for (const el of document.getElementsByClassName('file-select')) {
    const span = assertInstanceOf(el.querySelector('span'), HTMLSpanElement);
    const input = assertInstanceOf(el.querySelector('input'), HTMLInputElement);
    const defaultText = span.textContent;

    input.addEventListener('change', (e) => {
      if (!input.files || input.files.length === 0) {
        span.textContent = defaultText;
      } else if (input.files.length === 1) {
        span.textContent = `1 file selected.`;
      } else {
        span.textContent = `${input.files.length} files selected.`;
      }
    });
  }
}