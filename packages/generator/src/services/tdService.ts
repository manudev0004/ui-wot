import { ParsedAffordance, TDSource } from '../types';
import { ComponentMapper } from '../utils/component-integration';

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function validateTD(td: any): void {
  if (!td['@context']) throw new Error('Missing @context in Thing Description');
  if (!td.title) throw new Error('Missing title in Thing Description');
}

export async function parseTDFromSource(source: TDSource): Promise<any> {
  let tdContent: string;
  if (source.type === 'url') {
    const response = await fetch(source.content as string);
    if (!response.ok) throw new Error(`Failed to fetch TD: ${response.statusText}`);
    tdContent = await response.text();
  } else {
    tdContent = await readFileAsText(source.content as File);
  }
  const td = JSON.parse(tdContent);
  validateTD(td);
  return td;
}

export function parseAffordances(td: any): ParsedAffordance[] {
  const affordances: ParsedAffordance[] = [];

  if (td.properties) {
    Object.entries(td.properties).forEach(([key, property]: [string, any]) => {
      const mapping = ComponentMapper.mapPropertyToComponent(property);
      const allMappings = ComponentMapper.getAllPossibleComponents(property);
      affordances.push({
        key,
        type: 'property',
        title: property.title || key,
        description: property.description,
        schema: property,
        forms: property.forms,
        suggestedComponent: mapping?.componentName || 'ui-text',
        availableVariants: ['minimal', 'outlined', 'filled'],
        possibleComponents: allMappings.map(m => m.componentName),
      });
    });
  }

  if (td.actions) {
    Object.entries(td.actions).forEach(([key, action]: [string, any]) => {
      affordances.push({
        key,
        type: 'action',
        title: action.title || key,
        description: action.description,
        schema: action,
        forms: action.forms,
        suggestedComponent: 'ui-button',
        availableVariants: ['minimal', 'outlined', 'filled'],
        possibleComponents: ['ui-button'],
      });
    });
  }

  if (td.events) {
    Object.entries(td.events).forEach(([key, event]: [string, any]) => {
      const eventMapping = ComponentMapper.mapEventToComponent(event);
      const allEventMappings = ComponentMapper.getAllPossibleComponentsForEvent(event);
      affordances.push({
        key,
        type: 'event',
        title: event.title || key,
        description: event.description,
        schema: event,
        forms: event.forms,
        suggestedComponent: eventMapping?.componentName || 'ui-event',
        availableVariants: ['minimal'],
        possibleComponents: allEventMappings.map(m => m.componentName),
      });
    });
  }

  return affordances;
}
