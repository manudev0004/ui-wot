import { newSpecPage } from '@stencil/core/testing';
import { UiCheckbox } from './ui-checkbox';

describe('ui-checkbox', () => {
  it('syncs checked prop via Watch and emits valueChange on click', async () => {
    const page = await newSpecPage({ components: [UiCheckbox], html: `<ui-checkbox label="test" checked></ui-checkbox>` });

    const inst = page.rootInstance as any;
    expect(inst.isChecked).toBe(true);

    const events: any[] = [];
    page.root.addEventListener('valueChange', (e: any) => events.push(e));

    const control = page.root.shadowRoot.querySelector('[role="checkbox"]') as HTMLElement;
    control.click();
    await page.waitForChanges();

    expect(events.length).toBe(1);
    expect(events[0].detail.value).toBe(false);
  });
});
