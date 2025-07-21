import { Component, Prop, h } from '@stencil/core';

@Component({
  tag: 'ui-card',
  styleUrl: 'ui-card.css',
  shadow: true,
})
export class UiCard {
  @Prop() cardTitle: string = 'Card Title';
  @Prop() subtitle?: string;
  @Prop() variant: 'default' | 'gradient' | 'outlined' = 'default';

  render() {
    const cardClasses = {
      default: 'bg-white shadow-lg border border-gray-200',
      gradient: 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white shadow-xl',
      outlined: 'bg-transparent border-2 border-indigo-500 shadow-sm'
    };

    return (
      <div class={`rounded-lg p-6 max-w-sm mx-auto hover:shadow-xl transition-shadow duration-300 ${cardClasses[this.variant]}`}>
        <div class="flex items-center justify-between mb-4">
          <h3 class={`text-xl font-bold ${this.variant === 'gradient' ? 'text-white' : 'text-gray-800'}`}>
            {this.cardTitle}
          </h3>
          <div class={`w-12 h-12 rounded-full flex items-center justify-center ${
            this.variant === 'gradient' ? 'bg-white bg-opacity-20' : 
            this.variant === 'outlined' ? 'bg-indigo-100' : 'bg-indigo-500'
          }`}>
            <span class={`text-lg ${
              this.variant === 'gradient' ? 'text-white' :
              this.variant === 'outlined' ? 'text-indigo-600' : 'text-white'
            }`}>🎯</span>
          </div>
        </div>
        
        {this.subtitle && (
          <p class={`text-sm mb-4 ${
            this.variant === 'gradient' ? 'text-gray-100' : 'text-gray-600'
          }`}>
            {this.subtitle}
          </p>
        )}
        
        <div class="space-y-2">
          <slot></slot>
        </div>
        
        <div class="mt-6 flex space-x-3">
          <button class={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
            this.variant === 'gradient' 
              ? 'bg-white text-purple-600 hover:bg-gray-100' 
              : this.variant === 'outlined'
              ? 'bg-indigo-500 text-white hover:bg-indigo-600'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}>
            Action
          </button>
          <button class={`px-4 py-2 rounded-md text-sm font-medium border transition-colors duration-200 ${
            this.variant === 'gradient'
              ? 'border-white text-white hover:bg-white hover:text-purple-600'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}>
            Cancel
          </button>
        </div>
      </div>
    );
  }
}
