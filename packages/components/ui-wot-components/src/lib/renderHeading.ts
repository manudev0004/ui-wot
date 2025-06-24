import '../components/ui-heading/ui-heading';


export function renderHeading(text: string, container: HTMLElement) {
  console.log('renderHeading called with:', text, container);
  
  // Check if custom element is defined
  console.log('ui-heading defined?', customElements.get('ui-heading'));
  
  const el = document.createElement('ui-heading');
  console.log('Created element:', el);
  
  el.setAttribute('text', text);
  console.log('Set text attribute, element:', el);
  
  container.innerHTML = '';
  container.appendChild(el);
  
  console.log('Final container content:', container.innerHTML);
  console.log('Final container children:', container.children);
}
