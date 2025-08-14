import { Component, Prop, State, h, Event, EventEmitter, Watch } from '@stencil/core';

export interface UiTextValueChange { value: string }

@Component({ tag: 'ui-text', shadow: true })
export class UiText {
  @Prop() variant: 'display' | 'edit' = 'display';
  @Prop() textType: 'single' | 'multi' = 'single';
  @Prop() structure: 'unstructured' | 'json' | 'yaml' | 'xml' | 'markdown' = 'unstructured';
  @Prop() resizable: boolean = false;
  @Prop() expandable: boolean = false;
  @Prop() maxHeight: number = 200;
  @Prop({ mutable: true }) state: 'disabled' | 'active' | 'default' = 'default';
  @Prop() theme: 'light' | 'dark' = 'light';
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';
  @Prop() label?: string;
  @Prop({ mutable: true }) value: string = '';
  @Prop() placeholder?: string;
  @Prop() maxLength?: number;
  @Prop() rows: number = 4;

  @State() currentValue: string = '';
  @State() showSuccess = false;
  @State() errorMessage?: string;
  @State() isExpanded = false;

  @Event() textChange: EventEmitter<UiTextValueChange>;
  @Event() valueChange: EventEmitter<UiTextValueChange>;

  @Watch('value') watchValue() { this.currentValue = this.value }

  componentWillLoad() { this.currentValue = this.value }

  private handleInput = (event: Event) => {
    if (this.state === 'disabled' || this.variant === 'display') return;
    const t = event.target as HTMLInputElement | HTMLTextAreaElement;
    const v = t.value;
    this.currentValue = v; this.value = v;
    this.textChange.emit({ value: v });
    this.valueChange.emit({ value: v });
  }

  private escapeHtml(s: string) { return s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

  private highlightSyntax(text: string, structure: string) {
    if (!text) return '';
    if (structure === 'unstructured') return this.escapeHtml(text);
    if (structure === 'json') {
      try { return this.escapeHtml(JSON.stringify(JSON.parse(text), null, 2)) } catch (e) { /* fallback */ }
    }
    return this.escapeHtml(text);
  }

  private shouldShowExpandButton() { if (!this.expandable || this.textType === 'single') return false; const lines = (this.currentValue || '').split('\n').length; return lines * 20 > this.maxHeight }
  private toggleExpand = () => { this.isExpanded = !this.isExpanded }

  private getInputStyles() {
    const isDisabled = this.state === 'disabled';
    const isEdit = this.variant === 'edit';
    let base = 'w-full transition-all duration-200 font-sans text-sm';
    if (isEdit) { base += ' border rounded-md px-3 py-2 focus:outline-none focus:ring-2'; if (isDisabled) base += ' bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'; else base += this.theme === 'dark' ? ' bg-gray-800 border-gray-600 text-white placeholder-gray-400' : ' bg-white border-gray-300 text-gray-900 placeholder-gray-500' }
    else base += this.theme === 'dark' ? ' p-3 rounded-md border bg-gray-800 border-gray-600 text-gray-100' : ' p-3 rounded-md border bg-gray-50 border-gray-200 text-gray-900';
    return base
  }

  render() {
    const inputStyles = this.getInputStyles();
    const isDisabled = this.state === 'disabled';
    const isEdit = this.variant === 'edit';

    return (
      <div class='relative w-full'>
        {this.label && <label class={`block text-sm font-medium mb-2 ${isDisabled ? 'text-gray-400' : (this.theme === 'dark' ? 'text-white' : 'text-gray-900')}`}>{this.label}{!isEdit && <span class='ml-1 text-xs text-blue-500 dark:text-blue-400'>(Read-only)</span>}</label>}
        <div class='relative'>
          {this.showSuccess && <div class='absolute -top-2 -right-2 bg-green-500 rounded-full p-1 z-10'>
            <svg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M10 3L4.5 8.5L2 6' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' /></svg>
          </div>}

          {isEdit ? (
            this.textType === 'single' ? (
              <input type='text' class={inputStyles} value={this.currentValue} placeholder={this.placeholder} maxLength={this.maxLength} disabled={isDisabled} onInput={this.handleInput} aria-label={this.label || 'Text input'} />
            ) : (
              <textarea class={`${inputStyles} ${this.resizable ? 'resize-vertical' : 'resize-none'}`} value={this.currentValue} placeholder={this.placeholder} maxLength={this.maxLength} rows={this.rows} disabled={isDisabled} onInput={this.handleInput} aria-label={this.label || 'Text area'} />
            )
          ) : (
            <div class={inputStyles}>
              {this.textType === 'single' ? <span class='block truncate'>{this.currentValue || '\u00A0'}</span> : (
                <div class={`overflow-auto ${this.expandable && !this.isExpanded ? 'max-h-48' : ''}`} style={this.expandable && !this.isExpanded ? { maxHeight: `${this.maxHeight}px` } : {}}>
                  {this.structure === 'unstructured' ? <pre class='whitespace-pre-wrap m-0 font-sans text-sm'>{this.currentValue || '\u00A0'}</pre> : <pre class='whitespace-pre-wrap m-0 font-mono text-sm'>{this.highlightSyntax(this.currentValue || '\u00A0', this.structure)}</pre>}
                </div>
              )}
            </div>
          )}

          {this.shouldShowExpandButton() && <button type='button' class={`mt-2 text-xs font-medium transition-colors ${this.theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`} onClick={this.toggleExpand}>{this.isExpanded ? '▲ Show Less' : '▼ Show More'}</button>}

          {isEdit && this.currentValue && <div class={`mt-1 text-xs ${this.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{this.textType === 'single' ? <span>{this.currentValue.length}{this.maxLength && ` / ${this.maxLength}`} characters</span> : <span>{this.currentValue.split('\n').length} lines, {this.currentValue.length} characters{this.maxLength && ` / ${this.maxLength}`}</span>}</div>}
        </div>

        {this.errorMessage && <div class='text-red-500 text-sm mt-1 px-2'>{this.errorMessage}</div>}
      </div>
    )
  }
}
