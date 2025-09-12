export function renderHeading(text: string, container: HTMLElement) {
  const el = document.createElement('h1');
  el.textContent = text;
  container.innerHTML = '';
  container.appendChild(el);

  console.log('Final container content:', container.innerHTML);
  console.log('Final container children:', container.children);
}
