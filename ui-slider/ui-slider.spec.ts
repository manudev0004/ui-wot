import { newSpecPage } from '@stencil/core/testing';
import { UiSlider } from './ui-slider';

describe('ui-slider', () => {
  it('renders with default props', async () => {
    const page = await newSpecPage({
      components: [UiSlider],
      html: `<ui-slider></ui-slider>`,
    });
    
    const slider = page.root.shadowRoot.querySelector('.ui-slider');
    expect(slider.getAttribute('aria-valuemin')).toBe('0');
    expect(slider.getAttribute('aria-valuemax')).toBe('100');
    expect(slider.getAttribute('aria-valuenow')).toBe('0');
    expect(slider).toHaveClass('ui-slider--default');
  });

  it('renders with custom range', async () => {
    const page = await newSpecPage({
      components: [UiSlider],
      html: `<ui-slider min="10" max="50" value="30"></ui-slider>`,
    });
    
    const slider = page.root.shadowRoot.querySelector('.ui-slider');
    expect(slider.getAttribute('aria-valuemin')).toBe('10');
    expect(slider.getAttribute('aria-valuemax')).toBe('50');
    expect(slider.getAttribute('aria-valuenow')).toBe('30');
  });

  it('renders disabled state', async () => {
    const page = await newSpecPage({
      components: [UiSlider],
      html: `<ui-slider disabled></ui-slider>`,
    });
    
    const slider = page.root.shadowRoot.querySelector('.ui-slider');
    expect(slider.getAttribute('aria-disabled')).toBe('true');
    expect(slider).toHaveClass('ui-slider--disabled');
    expect(slider.getAttribute('tabindex')).toBe('-1');
  });

  it('applies variant classes', async () => {
    const page = await newSpecPage({
      components: [UiSlider],
      html: `<ui-slider variant="secondary"></ui-slider>`,
    });
    
    const slider = page.root.shadowRoot.querySelector('.ui-slider');
    expect(slider).toHaveClass('ui-slider--secondary');
  });

  it('renders label when provided', async () => {
    const page = await newSpecPage({
      components: [UiSlider],
      html: `<ui-slider label="Brightness"></ui-slider>`,
    });
    
    const label = page.root.shadowRoot.querySelector('.ui-slider-label');
    expect(label.textContent).toBe('Brightness');
  });

  it('clamps value within bounds', async () => {
    const page = await newSpecPage({
      components: [UiSlider],
      html: `<ui-slider min="0" max="10" value="15"></ui-slider>`,
    });
    
    const slider = page.root.shadowRoot.querySelector('.ui-slider');
    expect(slider.getAttribute('aria-valuenow')).toBe('10');
  });

  it('aligns value to step', async () => {
    const page = await newSpecPage({
      components: [UiSlider],
      html: `<ui-slider min="0" max="10" step="2" value="3"></ui-slider>`,
    });
    
    const slider = page.root.shadowRoot.querySelector('.ui-slider');
    expect(slider.getAttribute('aria-valuenow')).toBe('4');
  });

  it('displays current value', async () => {
    const page = await newSpecPage({
      components: [UiSlider],
      html: `<ui-slider value="42"></ui-slider>`,
    });
    
    const valueDisplay = page.root.shadowRoot.querySelector('.ui-slider-value');
    expect(valueDisplay.textContent).toBe('42');
  });
});
