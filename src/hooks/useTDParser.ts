import { useState } from 'react';
import { Thing, parseTD, validateTD } from '../parsers/TDParser';

export function useTDParser() {
  const [currentThing, setCurrentThing] = useState<Thing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadThingFromJson = async (jsonString: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const tdObject = JSON.parse(jsonString);
      
      if (!validateTD(tdObject)) {
        throw new Error('Invalid Thing Description format');
      }

      const thing = parseTD(tdObject);
      setCurrentThing(thing);
      return thing;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse Thing Description';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSampleThing = async (filename: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`/sample_td/${filename}`);
      if (!response.ok) {
        throw new Error('Failed to load sample Thing Description');
      }
      
      const tdObject = await response.json();
      const thing = parseTD(tdObject);
      setCurrentThing(thing);
      return thing;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sample Thing Description';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const clearThing = () => {
    setCurrentThing(null);
    setError(null);
  };

  return {
    currentThing,
    error,
    isLoading,
    loadThingFromJson,
    loadSampleThing,
    clearThing
  };
}
