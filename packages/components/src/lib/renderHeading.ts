import '../components/ui-heading/ui-heading';


export function renderHeading(text: string, container: HTMLElement) {  
  const el = document.createElement('ui-heading');  
  el.setAttribute('text', text);  
  container.innerHTML = '';
  container.appendChild(el);
  
  console.log('Final container content:', container.innerHTML);
  console.log('Final container children:', container.children);
}
