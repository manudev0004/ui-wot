/********************************************************************************
 * Copyright (c) 2023 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0, or the W3C Software Notice and
 * Document License (2015-05-13) which is available at
 * https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document.
 *
 * SPDX-License-Identifier: EPL-2.0 OR W3C-20150513
 ********************************************************************************/
function checkPropertyWrite(expected, actual) {
  const output = 'Property ' + expected + ' written with ' + actual;
  if (expected === actual) {
    console.info('PASS: ' + output);
  } else {
    throw new Error('FAIL: ' + output);
  }
}
function checkActionInvocation(name, expected, actual) {
  const output = 'Action ' + name + ' invoked with ' + actual;
  if (expected === actual) {
    console.info('PASS: ' + output);
  } else {
    throw new Error('FAIL: ' + output);
  }
}
// init property values
let bool = false;
let int = 42;
let num = 3.14;
let string = 'unset';
let array = [2, 'unset'];
let object = { id: 123, name: 'abc' };

// Calendar and Date/Time related properties
let currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
let currentTime = new Date().toTimeString().split(' ')[0]; // HH:MM:SS format
let currentDateTime = new Date().toISOString(); // Full ISO datetime
let dateRange = {
  start: '2024-01-01',
  end: '2024-12-31',
};

// Color picker properties
let currentColor = '#ff0000'; // Hex color
let colorRgb = { r: 255, g: 0, b: 0 }; // RGB object
let colorHsl = { h: 0, s: 100, l: 50 }; // HSL object

// File picker properties
let selectedFile = {
  name: 'example.txt',
  size: 1024,
  type: 'text/plain',
  lastModified: Date.now(),
};
let fileList = []; // Array of file objects
WoT.produce({
  title: 'TestThing',
  properties: {
    bool: {
      title: 'Boolean',
      description: 'Property that can be set to true or false',
      type: 'boolean',
    },
    int: {
      title: 'Integer',
      description: 'An integer value that can be read and written',
      type: 'integer',
    },
    num: {
      title: 'Number',
      description: 'A floating point value that can be read and written',
      type: 'number',
    },
    string: {
      title: 'String',
      description: 'A string value that can be read and written',
      type: 'string',
    },
    array: {
      title: 'Array',
      description: 'An Array (List) with no structure that can be read and written',
      type: 'array',
      items: {},
    },
    object: {
      title: 'Object',
      description: 'An object with id and name that can be read and written',
      type: 'object',
      properties: {
        id: {
          title: 'ID',
          description: 'Integer identifier',
          type: 'integer',
        },
        name: {
          title: 'Name',
          description: 'Name associated to the identifier',
          type: 'string',
        },
      },
    },
    // Calendar and Date/Time properties
    currentDate: {
      title: 'Current Date',
      description: 'A date value in YYYY-MM-DD format for calendar component testing',
      type: 'string',
      format: 'date',
    },
    currentTime: {
      title: 'Current Time',
      description: 'A time value in HH:MM:SS format for time picker testing',
      type: 'string',
      format: 'time',
    },
    currentDateTime: {
      title: 'Current DateTime',
      description: 'A full datetime value in ISO format for datetime picker testing',
      type: 'string',
      format: 'date-time',
    },
    dateRange: {
      title: 'Date Range',
      description: 'A date range object with start and end dates',
      type: 'object',
      properties: {
        start: {
          title: 'Start Date',
          description: 'Range start date',
          type: 'string',
          format: 'date',
        },
        end: {
          title: 'End Date',
          description: 'Range end date',
          type: 'string',
          format: 'date',
        },
      },
      required: ['start', 'end'],
    },
    // Color picker properties
    currentColor: {
      title: 'Current Color',
      description: 'A hex color value for color picker component testing',
      type: 'string',
      pattern: '^#[0-9A-Fa-f]{6}$',
    },
    colorRgb: {
      title: 'RGB Color',
      description: 'A color represented as RGB values',
      type: 'object',
      properties: {
        r: { type: 'integer', minimum: 0, maximum: 255 },
        g: { type: 'integer', minimum: 0, maximum: 255 },
        b: { type: 'integer', minimum: 0, maximum: 255 },
      },
      required: ['r', 'g', 'b'],
    },
    colorHsl: {
      title: 'HSL Color',
      description: 'A color represented as HSL values',
      type: 'object',
      properties: {
        h: { type: 'integer', minimum: 0, maximum: 360 },
        s: { type: 'integer', minimum: 0, maximum: 100 },
        l: { type: 'integer', minimum: 0, maximum: 100 },
      },
      required: ['h', 's', 'l'],
    },
    // File picker properties
    selectedFile: {
      title: 'Selected File',
      description: 'Information about a selected file',
      type: 'object',
      properties: {
        name: { type: 'string' },
        size: { type: 'integer', minimum: 0 },
        type: { type: 'string' },
        lastModified: { type: 'integer', minimum: 0 },
      },
      required: ['name', 'size', 'type', 'lastModified'],
    },
    fileList: {
      title: 'File List',
      description: 'An array of file objects for multi-file selection testing',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          size: { type: 'integer', minimum: 0 },
          type: { type: 'string' },
          lastModified: { type: 'integer', minimum: 0 },
        },
        required: ['name', 'size', 'type', 'lastModified'],
      },
    },
  },
  actions: {
    'void-void': {
      title: 'void-void Action',
      description: 'Action without input nor output',
    },
    'void-int': {
      title: 'void-int Action',
      description: 'Action without input, but with integer output',
    },
    'int-void': {
      title: 'int-void Action',
      description: 'Action with integer input, but without output',
      input: { type: 'integer' },
    },
    'int-int': {
      title: 'int-int Action',
      description: 'Action with integer input and output',
      input: { type: 'integer' },
      output: { type: 'integer' },
    },
    'int-string': {
      title: 'int-string Action',
      description: 'Action with integer input and string output',
      input: { type: 'integer' },
      output: { type: 'string' },
    },
    'void-obj': {
      title: 'void-obj Action',
      description: 'Action without input, but with object output',
      output: {
        type: 'object',
        properties: {
          prop1: {
            type: 'integer',
          },
          prop2: {
            type: 'string',
          },
        },
        required: ['prop1', 'prop2'],
      },
    },
    'obj-void': {
      title: 'obj-void Action',
      description: 'Action with object input, but without output',
      input: {
        type: 'object',
        properties: {
          prop1: { type: 'integer' },
          prop2: { type: 'string' },
        },
        required: ['prop1', 'prop2'],
      },
    },
    // Calendar/Date actions
    'set-date-range': {
      title: 'Set Date Range',
      description: 'Action to set a date range for calendar testing',
      input: {
        type: 'object',
        properties: {
          start: { type: 'string', format: 'date' },
          end: { type: 'string', format: 'date' },
        },
        required: ['start', 'end'],
      },
    },
    'get-next-month': {
      title: 'Get Next Month',
      description: "Action to get the next month's date for calendar navigation",
      input: { type: 'string', format: 'date' },
      output: { type: 'string', format: 'date' },
    },
    // Color picker actions
    'convert-color': {
      title: 'Convert Color',
      description: 'Convert color between different formats',
      input: {
        type: 'object',
        properties: {
          color: { type: 'string' },
          from: { type: 'string', enum: ['hex', 'rgb', 'hsl'] },
          to: { type: 'string', enum: ['hex', 'rgb', 'hsl'] },
        },
        required: ['color', 'from', 'to'],
      },
      output: { type: 'string' },
    },
    // File picker actions
    'upload-file': {
      title: 'Upload File',
      description: 'Simulate file upload action',
      input: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          size: { type: 'integer' },
          type: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['name', 'size', 'type'],
      },
      output: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: { type: 'string' },
          url: { type: 'string' },
        },
        required: ['id', 'status'],
      },
    },
    'clear-files': {
      title: 'Clear Files',
      description: 'Clear all selected files',
    },
  },
  events: {
    'on-bool': {
      title: 'Bool Property Change',
      description: 'Event with boolean data that is emitted when the bool property is written to',
      data: { type: 'boolean' },
    },
    'on-int': {
      title: 'Int Property Change',
      description: 'Event with integer data that is emitted when the int property is written to ',
      data: { type: 'integer' },
    },
    'on-num': {
      title: 'Num Property Change',
      description: 'Event with number data that is emitted when the num property is written to',
      data: { type: 'number' },
    },
    'on-string': {
      title: 'String Property Change',
      description: 'Event with string data that is emitted when the string property is written to',
      data: { type: 'string' },
    },
    'on-array': {
      title: 'Array Property Change',
      description: 'Event with number data that is emitted when the array property is written to',
      data: { type: 'number' },
    },
    'on-object': {
      title: 'Object Property Change',
      description: 'Event with number data that is emitted when the object property is written to',
      data: { type: 'number' },
    },
    // Calendar/Date events
    'on-date-change': {
      title: 'Date Change',
      description: 'Event emitted when date is changed',
      data: { type: 'string', format: 'date' },
    },
    'on-time-change': {
      title: 'Time Change',
      description: 'Event emitted when time is changed',
      data: { type: 'string', format: 'time' },
    },
    'on-datetime-change': {
      title: 'DateTime Change',
      description: 'Event emitted when datetime is changed',
      data: { type: 'string', format: 'date-time' },
    },
    'on-date-range-change': {
      title: 'Date Range Change',
      description: 'Event emitted when date range is changed',
      data: {
        type: 'object',
        properties: {
          start: { type: 'string', format: 'date' },
          end: { type: 'string', format: 'date' },
        },
        required: ['start', 'end'],
      },
    },
    // Color picker events
    'on-color-change': {
      title: 'Color Change',
      description: 'Event emitted when color is changed',
      data: { type: 'string' },
    },
    'on-color-rgb-change': {
      title: 'RGB Color Change',
      description: 'Event emitted when RGB color is changed',
      data: {
        type: 'object',
        properties: {
          r: { type: 'integer', minimum: 0, maximum: 255 },
          g: { type: 'integer', minimum: 0, maximum: 255 },
          b: { type: 'integer', minimum: 0, maximum: 255 },
        },
      },
    },
    // File picker events
    'on-file-selected': {
      title: 'File Selected',
      description: 'Event emitted when a file is selected',
      data: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          size: { type: 'integer' },
          type: { type: 'string' },
        },
      },
    },
    'on-files-changed': {
      title: 'Files Changed',
      description: 'Event emitted when the file list changes',
      data: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            size: { type: 'integer' },
            type: { type: 'string' },
          },
        },
      },
    },
  },
})
  .then(thing => {
    console.log('Produced ' + thing.getThingDescription().title);
    // set property read/write handlers
    thing
      .setPropertyWriteHandler('bool', async value => {
        const localBool = await value.value();
        checkPropertyWrite('boolean', typeof localBool);
        bool = localBool;
        thing.emitEvent('on-bool', bool);
      })
      .setPropertyReadHandler('bool', async () => bool)
      .setPropertyWriteHandler('int', async value => {
        const localInt = await value.value();
        if (localInt === Math.floor(localInt)) {
          checkPropertyWrite('integer', 'integer');
        } else {
          checkPropertyWrite('integer', typeof value);
        }
        int = localInt;
        thing.emitEvent('on-int', int);
      })
      .setPropertyReadHandler('int', async () => int)
      .setPropertyWriteHandler('num', async value => {
        const localNum = await value.value();
        checkPropertyWrite('number', typeof localNum);
        num = localNum;
        thing.emitEvent('on-num', num);
      })
      .setPropertyReadHandler('num', async () => num)
      .setPropertyWriteHandler('string', async value => {
        const localString = await value.value();
        checkPropertyWrite('string', typeof localString);
        string = localString;
        thing.emitEvent('on-string', string);
      })
      .setPropertyReadHandler('string', async () => string)
      .setPropertyWriteHandler('array', async value => {
        const localArray = await value.value();
        if (Array.isArray(localArray)) {
          checkPropertyWrite('array', 'array');
        } else {
          checkPropertyWrite('array', typeof localArray);
        }
        array = localArray;
        thing.emitEvent('on-array', array);
      })
      .setPropertyReadHandler('array', async () => array)
      .setPropertyWriteHandler('object', async value => {
        const localObject = await value.value();
        if (Array.isArray(localObject)) {
          checkPropertyWrite('object', 'array');
        } else {
          checkPropertyWrite('object', typeof localObject);
        }
        object = localObject;
        thing.emitEvent('on-object', object);
      })
      .setPropertyReadHandler('object', async () => object)

      // Calendar/Date property handlers
      .setPropertyWriteHandler('currentDate', async value => {
        const localDate = await value.value();
        checkPropertyWrite('string', typeof localDate);
        currentDate = localDate;
        thing.emitEvent('on-date-change', currentDate);
      })
      .setPropertyReadHandler('currentDate', async () => currentDate)

      .setPropertyWriteHandler('currentTime', async value => {
        const localTime = await value.value();
        checkPropertyWrite('string', typeof localTime);
        currentTime = localTime;
        thing.emitEvent('on-time-change', currentTime);
      })
      .setPropertyReadHandler('currentTime', async () => currentTime)

      .setPropertyWriteHandler('currentDateTime', async value => {
        const localDateTime = await value.value();
        checkPropertyWrite('string', typeof localDateTime);
        currentDateTime = localDateTime;
        thing.emitEvent('on-datetime-change', currentDateTime);
      })
      .setPropertyReadHandler('currentDateTime', async () => currentDateTime)

      .setPropertyWriteHandler('dateRange', async value => {
        const localDateRange = await value.value();
        checkPropertyWrite('object', typeof localDateRange);
        dateRange = localDateRange;
        thing.emitEvent('on-date-range-change', dateRange);
      })
      .setPropertyReadHandler('dateRange', async () => dateRange)

      // Color picker property handlers
      .setPropertyWriteHandler('currentColor', async value => {
        const localColor = await value.value();
        checkPropertyWrite('string', typeof localColor);
        currentColor = localColor;
        thing.emitEvent('on-color-change', currentColor);
      })
      .setPropertyReadHandler('currentColor', async () => currentColor)

      .setPropertyWriteHandler('colorRgb', async value => {
        const localColorRgb = await value.value();
        checkPropertyWrite('object', typeof localColorRgb);
        colorRgb = localColorRgb;
        thing.emitEvent('on-color-rgb-change', colorRgb);
      })
      .setPropertyReadHandler('colorRgb', async () => colorRgb)

      .setPropertyWriteHandler('colorHsl', async value => {
        const localColorHsl = await value.value();
        checkPropertyWrite('object', typeof localColorHsl);
        colorHsl = localColorHsl;
      })
      .setPropertyReadHandler('colorHsl', async () => colorHsl)

      // File picker property handlers
      .setPropertyWriteHandler('selectedFile', async value => {
        const localFile = await value.value();
        checkPropertyWrite('object', typeof localFile);
        selectedFile = localFile;
        thing.emitEvent('on-file-selected', selectedFile);
      })
      .setPropertyReadHandler('selectedFile', async () => selectedFile)

      .setPropertyWriteHandler('fileList', async value => {
        const localFileList = await value.value();
        if (Array.isArray(localFileList)) {
          checkPropertyWrite('array', 'array');
        } else {
          checkPropertyWrite('array', typeof localFileList);
        }
        fileList = localFileList;
        thing.emitEvent('on-files-changed', fileList);
      })
      .setPropertyReadHandler('fileList', async () => fileList);
    // set action handlers
    thing
      .setActionHandler('void-void', async parameters => {
        checkActionInvocation('void-void', 'undefined', typeof (await parameters.value()));
        return undefined;
      })
      .setActionHandler('void-int', async parameters => {
        checkActionInvocation('void-int', 'undefined', typeof (await parameters.value()));
        return 0;
      })
      .setActionHandler('int-void', async parameters => {
        const localParameters = await parameters.value();
        if (localParameters === Math.floor(localParameters)) {
          checkActionInvocation('int-void', 'integer', 'integer');
        } else {
          checkActionInvocation('int-void', 'integer', typeof parameters);
        }
        return undefined;
      })
      .setActionHandler('int-int', async parameters => {
        const localParameters = await parameters.value();
        if (localParameters === Math.floor(localParameters)) {
          checkActionInvocation('int-int', 'integer', 'integer');
        } else {
          checkActionInvocation('int-int', 'integer', typeof localParameters);
        }
        return localParameters + 1;
      })
      .setActionHandler('int-string', async parameters => {
        const localParameters = await parameters.value();
        const inputtype = typeof localParameters;
        if (localParameters === Math.floor(localParameters)) {
          checkActionInvocation('int-string', 'integer', 'integer');
        } else {
          checkActionInvocation('int-string', 'integer', typeof localParameters);
        }
        if (inputtype === 'number') {
          // eslint-disable-next-line no-new-wrappers
          return new String(localParameters)
            .replace(/0/g, 'zero-')
            .replace(/1/g, 'one-')
            .replace(/2/g, 'two-')
            .replace(/3/g, 'three-')
            .replace(/4/g, 'four-')
            .replace(/5/g, 'five-')
            .replace(/6/g, 'six-')
            .replace(/7/g, 'seven-')
            .replace(/8/g, 'eight-')
            .replace(/9/g, 'nine-');
        } else {
          throw new Error('ERROR');
        }
      })
      .setActionHandler('void-obj', async parameters => {
        checkActionInvocation('void-complex', 'undefined', typeof (await parameters.value()));
        return { prop1: 123, prop2: 'abc' };
      })
      .setActionHandler('obj-void', async parameters => {
        checkActionInvocation('complex-void', 'object', typeof (await parameters.value()));
        return undefined;
      })

      // Calendar/Date action handlers
      .setActionHandler('set-date-range', async parameters => {
        const range = await parameters.value();
        checkActionInvocation('set-date-range', 'object', typeof range);
        dateRange = range;
        thing.emitEvent('on-date-range-change', dateRange);
        return undefined;
      })

      .setActionHandler('get-next-month', async parameters => {
        const inputDate = await parameters.value();
        checkActionInvocation('get-next-month', 'string', typeof inputDate);
        const date = new Date(inputDate);
        date.setMonth(date.getMonth() + 1);
        return date.toISOString().split('T')[0];
      })

      // Color picker action handlers
      .setActionHandler('convert-color', async parameters => {
        const conversionData = await parameters.value();
        checkActionInvocation('convert-color', 'object', typeof conversionData);

        // Simple color conversion logic for testing
        const { color, from, to } = conversionData;
        if (from === 'hex' && to === 'rgb') {
          const hex = color.replace('#', '');
          const r = parseInt(hex.substr(0, 2), 16);
          const g = parseInt(hex.substr(2, 2), 16);
          const b = parseInt(hex.substr(4, 2), 16);
          return `rgb(${r}, ${g}, ${b})`;
        } else if (from === 'rgb' && to === 'hex') {
          // Assuming color is in "rgb(r, g, b)" format
          const matches = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (matches) {
            const r = parseInt(matches[1]).toString(16).padStart(2, '0');
            const g = parseInt(matches[2]).toString(16).padStart(2, '0');
            const b = parseInt(matches[3]).toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
          }
        }
        return color; // fallback
      })

      // File picker action handlers
      .setActionHandler('upload-file', async parameters => {
        const fileData = await parameters.value();
        checkActionInvocation('upload-file', 'object', typeof fileData);

        const uploadResult = {
          id: `file_${Date.now()}`,
          status: 'uploaded',
          url: `/uploads/${fileData.name}`,
        };

        // Add to file list
        fileList.push({
          name: fileData.name,
          size: fileData.size,
          type: fileData.type,
          lastModified: Date.now(),
        });
        thing.emitEvent('on-files-changed', fileList);

        return uploadResult;
      })

      .setActionHandler('clear-files', async parameters => {
        checkActionInvocation('clear-files', 'undefined', typeof (await parameters.value()));
        fileList = [];
        thing.emitEvent('on-files-changed', fileList);
        return undefined;
      });
    // expose the thing
    thing.expose().then(() => {
      console.info(thing.getThingDescription().title + ' ready');
    });
  })
  .catch(e => {
    console.log(e);
  });
