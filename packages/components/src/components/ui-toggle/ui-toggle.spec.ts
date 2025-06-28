import { newSpecPage } from '@stencil/core/testing';
import { UiToggle } from './ui-toggle';

describe('ui-toggle', () => {
  it('renders with default props', async () => {
    const page = await newSpecPage({
      components: [UiToggle],
      html: `<ui-toggle></ui-toggle>`,
    });
    
    expect(page.root).toEqualHtml(`
      <ui-toggle>
        <mock:shadow-root>
          <button class="ui-toggle ui-toggle--default" role="switch" aria-checked="false" aria-disabled="false" tabindex="0">
            <span class="ui-toggle__track">
              <span class="ui-toggle__thumb"></span>
            </span>
          </button>
        </mock:shadow-root>
      </ui-toggle>
    `);
  });

  it('renders checked state', async () => {
    const page = await newSpecPage({
      components: [UiToggle],
      html: `<ui-toggle checked></ui-toggle>`,
    });
    
    const button = page.root.shadowRoot.querySelector('button');
    expect(button.getAttribute('aria-checked')).toBe('true');
    expect(button).toHaveClass('ui-toggle--checked');
  });

  it('renders disabled state', async () => {
    const page = await newSpecPage({
      components: [UiToggle],
      html: `<ui-toggle disabled></ui-toggle>`,
    });
    
    const button = page.root.shadowRoot.querySelector('button');
    expect(button.getAttribute('disabled')).not.toBeNull();
    expect(button).toHaveClass('ui-toggle--disabled');
    expect(button.getAttribute('tabindex')).toBe('-1');
  });

  it('applies variant classes', async () => {
    const page = await newSpecPage({
      components: [UiToggle],
      html: `<ui-toggle variant="primary"></ui-toggle>`,
    });
    
    const button = page.root.shadowRoot.querySelector('button');
    expect(button).toHaveClass('ui-toggle--primary');
  });

  it('handles value prop', async () => {
    const page = await newSpecPage({
      components: [UiToggle],
      html: `<ui-toggle value="true"></ui-toggle>`,
    });
    
    const button = page.root.shadowRoot.querySelector('button');
    expect(button.getAttribute('aria-checked')).toBe('true');
  });
});
