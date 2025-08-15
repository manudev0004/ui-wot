# ui-text



<!-- Auto Generated Below -->


## Properties

| Property      | Attribute     | Description | Type                                                        | Default          |
| ------------- | ------------- | ----------- | ----------------------------------------------------------- | ---------------- |
| `color`       | `color`       |             | `"neutral" \| "primary" \| "secondary"`                     | `'primary'`      |
| `expandable`  | `expandable`  |             | `boolean`                                                   | `false`          |
| `label`       | `label`       |             | `string`                                                    | `undefined`      |
| `maxHeight`   | `max-height`  |             | `number`                                                    | `200`            |
| `maxLength`   | `max-length`  |             | `number`                                                    | `undefined`      |
| `placeholder` | `placeholder` |             | `string`                                                    | `undefined`      |
| `resizable`   | `resizable`   |             | `boolean`                                                   | `false`          |
| `rows`        | `rows`        |             | `number`                                                    | `4`              |
| `state`       | `state`       |             | `"active" \| "default" \| "disabled"`                       | `'default'`      |
| `structure`   | `structure`   |             | `"json" \| "markdown" \| "unstructured" \| "xml" \| "yaml"` | `'unstructured'` |
| `textType`    | `text-type`   |             | `"multi" \| "single"`                                       | `'single'`       |
| `theme`       | `theme`       |             | `"dark" \| "light"`                                         | `'light'`        |
| `value`       | `value`       |             | `string`                                                    | `''`             |
| `variant`     | `variant`     |             | `"display" \| "edit"`                                       | `'display'`      |


## Events

| Event         | Description | Type                             |
| ------------- | ----------- | -------------------------------- |
| `textChange`  |             | `CustomEvent<UiTextValueChange>` |
| `valueChange` |             | `CustomEvent<UiTextValueChange>` |


## Shadow Parts

| Part          | Description |
| ------------- | ----------- |
| `"container"` |             |
| `"input"`     |             |
| `"preview"`   |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
