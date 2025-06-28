import { newE2EPage } from '@stencil/core/testing';

describe('ui-slider', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<ui-slider></ui-slider>');

    const element = await page.find('ui-slider');
    expect(element).toHaveClass('hydrated');
  });

  it('displays correct initial value', async () => {
    const page = await newE2EPage();
    await page.setContent('<ui-slider value="50"></ui-slider>');

    const slider = await page.find('ui-slider >>> .ui-slider');
    const valueDisplay = await page.find('ui-slider >>> .ui-slider-value');
    
    expect(await slider.getAttribute('aria-valuenow')).toBe('50');
    expect(await valueDisplay.textContent).toBe('50');
  });

  it('emits change event on interaction', async () => {
    const page = await newE2EPage();
    await page.setContent('<ui-slider min="0" max="100" value="25"></ui-slider>');

    const changeEvent = await page.spyOnEvent('change');
    const slider = await page.find('ui-slider >>> .ui-slider');

    // Simulate arrow key press
    await slider.press('ArrowRight');
    await page.waitForChanges();

    expect(changeEvent).toHaveReceivedEventDetail(26);
  });

  it('respects min and max bounds', async () => {
    const page = await newE2EPage();
    await page.setContent('<ui-slider min="10" max="20" value="15"></ui-slider>');

    const slider = await page.find('ui-slider >>> .ui-slider');
    
    expect(await slider.getAttribute('aria-valuemin')).toBe('10');
    expect(await slider.getAttribute('aria-valuemax')).toBe('20');
    expect(await slider.getAttribute('aria-valuenow')).toBe('15');
  });

  it('handles keyboard navigation', async () => {
    const page = await newE2EPage();
    await page.setContent('<ui-slider min="0" max="100" value="50"></ui-slider>');

    const changeEvent = await page.spyOnEvent('change');
    const slider = await page.find('ui-slider >>> .ui-slider');

    // Test different keys
    await slider.press('Home');
    await page.waitForChanges();
    expect(changeEvent).toHaveReceivedEventDetail(0);

    await slider.press('End');
    await page.waitForChanges();
    expect(changeEvent).toHaveReceivedEventDetail(100);
  });

  it('respects disabled state', async () => {
    const page = await newE2EPage();
    await page.setContent('<ui-slider disabled value="50"></ui-slider>');

    const changeEvent = await page.spyOnEvent('change');
    const slider = await page.find('ui-slider >>> .ui-slider');

    expect(await slider.getAttribute('aria-disabled')).toBe('true');
    expect(await slider.getAttribute('tabindex')).toBe('-1');

    await slider.press('ArrowRight');
    await page.waitForChanges();

    expect(changeEvent).not.toHaveReceivedEvent();
  });

  it('applies variant classes', async () => {
    const page = await newE2EPage();
    await page.setContent('<ui-slider variant="accent"></ui-slider>');

    const slider = await page.find('ui-slider >>> .ui-slider');
    expect(slider).toHaveClass('ui-slider--accent');
  });

  it('displays label when provided', async () => {
    const page = await newE2EPage();
    await page.setContent('<ui-slider label="Volume"></ui-slider>');

    const label = await page.find('ui-slider >>> .ui-slider-label');
    expect(await label.textContent).toBe('Volume');
  });
});
