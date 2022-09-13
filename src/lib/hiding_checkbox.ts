import { assertInstanceOf, $ } from "./util";

export function activateHidingCheckboxes() {
  for (const element of document.querySelectorAll('.hiding-checkbox')) {
    const input = assertInstanceOf(element, HTMLInputElement);
    const target = $(`#${input.dataset['for']}`);
    target.classList.toggle('hidden', !input.checked);

    input.addEventListener('change', () => {
      target.classList.toggle('hidden', !input.checked);
    });
  }
}