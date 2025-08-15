import { newSpecPage } from '@stencil/core/testing';
import { UiText } from './ui-text';

describe('ui-text', () => {
  it('emits valueChange on input and does not render HTML tags in preview', async () => {
    const page = await newSpecPage({ components: [UiText], html: `<ui-text variant="edit" text-type="single" value="hello"></ui-text>` });

    const input = page.root.shadowRoot.querySelector('input') as HTMLInputElement;
    const events: any[] = [];
    page.root.addEventListener('valueChange', (e: any) => events.push(e));

    input.value = 'new text';
    input.dispatchEvent(new Event('input'));
    await page.waitForChanges();

    expect(events.length).toBe(1);
    expect(events[0].detail.value).toBe('new text');

    // ensure preview does not render HTML tags (sanitization / escaped output)
    page.rootInstance.value = '<b>bold</b>';
    page.rootInstance.variant = 'display';
    page.rootInstance.textType = 'multi';
    page.rootInstance.structure = 'unstructured';
    await page.waitForChanges();

    const pre = page.root.shadowRoot.querySelector('pre');
    expect(pre).toBeTruthy();
    const html = pre.innerHTML || '';
    expect(html).not.toContain('<span');
    expect(html).not.toContain('<b>');
  });

  it('pretty-prints JSON when structure is json', async () => {
    const sample = '{"a":1,"b":{"c":2}}';
    const page = await newSpecPage({ components: [UiText], html: `<ui-text variant="display" text-type="multi" structure="json" value='${sample}'></ui-text>` });
    await page.waitForChanges();

    const pre = page.root.shadowRoot.querySelector('pre');
    expect(pre).toBeTruthy();
    const text = pre.textContent || '';
    // pretty-printed JSON should contain newlines and indents
    expect(text).toContain('\n');
    expect(text).toContain('  "b"');
  });
});
