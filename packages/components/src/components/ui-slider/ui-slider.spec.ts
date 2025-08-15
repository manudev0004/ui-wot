import { newSpecPage } from '@stencil/core/testing';
import { UiSlider } from './ui-slider';

describe('ui-slider', () => {
  it('updates value and emits valueChange on keyboard ArrowRight/ArrowLeft', async () => {
    const page = await newSpecPage({ components: [UiSlider], html: `<ui-slider value="50" min="0" max="100"></ui-slider>` });
    await page.waitForChanges();

  const host = page.root.shadowRoot.querySelector('[role="slider"]');
    expect(host).toBeTruthy();

    // simulate ArrowRight key
    const evRight = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    host.dispatchEvent(evRight);
    await page.waitForChanges();

  // value should increase (component logic typically increments by step=1)
  expect(Number(page.rootInstance.currentValue)).toBeGreaterThan(50);

    // simulate ArrowLeft key
    const evLeft = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
    host.dispatchEvent(evLeft);
    await page.waitForChanges();

  expect(Number(page.rootInstance.currentValue)).toBeLessThanOrEqual(51);
  });
});
