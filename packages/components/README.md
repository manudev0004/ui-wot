# @thingweb/ui-wot-components

Tree-shakable Web Components implementing WoT patterns, plus lightweight Node‑WoT helpers.

## Install

```bash
npm i @thingweb/ui-wot-components @node-wot/core @node-wot/binding-http
```

## Usage

### Web Components (vanilla)

```html
<script type="module" src="/node_modules/@thingweb/ui-wot-components/dist/ui-wot-components/ui-wot-components.esm.js"></script>
<ui-toggle></ui-toggle>
```

### Framework imports (tree‑shakable)

```ts
// React / Vue / Angular — import only what you use
import { UiToggle } from '@thingweb/ui-wot-components';
import { property, createWoTClient, consumeFromUrl } from '@thingweb/ui-wot-components/services';

(async () => {
	const client = await createWoTClient();
	const thing = await consumeFromUrl(client, 'http://localhost:8080/counter/td');
	const el = document.querySelector('ui-toggle') as HTMLElement;
	await property(thing, 'enabled', true);
})();
```

### Quick dashboard wiring

```ts
import { quickConnect, action, bindProperty } from '@thingweb/ui-wot-components/services';

(async () => {
	const thing = await quickConnect('http://host/coffee/td', 'coffee');
	const toggle = document.querySelector('ui-toggle')!;
	await bindProperty(toggle, thing, 'heater');
	const button = document.querySelector('ui-button')!;
	button.addEventListener('click', () => action(thing, 'brew'));
})();
```

