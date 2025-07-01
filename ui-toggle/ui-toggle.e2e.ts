import { newE2EPage } from '@stencil/core/testing';

describe('ui-toggle', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<ui-toggle></ui-toggle>');

    const element = await page.find('ui-toggle');
    expect(element).toHaveClass('hydrated');
  });

  it('toggles on click', async () => {
    const page = await newE2EPage();
    await page.setContent('<ui-toggle></ui-toggle>');

    const button = await page.find('ui-toggle >>> button');
    
    // Initial state should be unchecked
    expect(await button.getAttribute('aria-checked')).toBe('false');

    // Click to toggle
    await button.click();
    await page.waitForChanges();

    // Should be checked now
    expect(await button.getAttribute('aria-checked')).toBe('true');
  });

  it('emits toggle event', async () => {
    const page = await newE2EPage();
    await page.setContent('<ui-toggle></ui-toggle>');

    const toggleEvent = await page.spyOnEvent('toggle');
    const button = await page.find('ui-toggle >>> button');

    await button.click();
    await page.waitForChanges();

    expect(toggleEvent).toHaveReceivedEventDetail(true);
  });

  it('respects disabled state', async () => {
    const page = await newE2EPage();
    await page.setContent('<ui-toggle disabled></ui-toggle>');

    const toggleEvent = await page.spyOnEvent('toggle');
    const button = await page.find('ui-toggle >>> button');

    expect(await button.getAttribute('disabled')).not.toBeNull();

    await button.click();
    await page.waitForChanges();

    expect(toggleEvent).not.toHaveReceivedEvent();
  });

  it('handles keyboard interaction', async () => {
    const page = await newE2EPage();
    await page.setContent('<ui-toggle></ui-toggle>');

    const toggleEvent = await page.spyOnEvent('toggle');
    const button = await page.find('ui-toggle >>> button');

    await button.press(' ');
    await page.waitForChanges();

    expect(toggleEvent).toHaveReceivedEventDetail(true);
  });

  it('applies variant classes', async () => {
    const page = await newE2EPage();
    await page.setContent('<ui-toggle variant="primary"></ui-toggle>');

    const button = await page.find('ui-toggle >>> button');
    expect(button).toHaveClass('ui-toggle--primary');
  });
});
