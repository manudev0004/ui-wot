import { Component, Prop, h } from '@stencil/core';

@Component({
  tag: 'ui-heading',
  styleUrl: 'ui-heading.css',
  shadow: true,
})
export class UiHeading {
  @Prop() text: string;

  render() {
    return <h1>{this.text}</h1>;
  }
}
