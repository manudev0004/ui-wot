/**
 * ThingDashboard Component
 * Displays detailed information about a WoT Thing, including its properties, actions, and events.
 */
import React from 'react';
import { Thing } from '../parsers/TDParser';
import { PropertyWidget } from './PropertyWidget';
import { ActionForm } from './ActionForm';
import { EventViewer } from './EventViewer';

interface ThingDashboardProps {
  thing: Thing;
  onBack: () => void;
}

export const ThingDashboard: React.FC<ThingDashboardProps> = ({ thing, onBack }) => {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{thing.title}</h1>
            <p className="text-gray-600 mt-1">{thing.description}</p>
            <p className="text-sm text-gray-500 mt-1">ID: {thing.id}</p>
          </div>
          <button
            onClick={onBack}
            className="action-button bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500"
          >
            Back
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Properties Section */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Properties ({thing.properties.length})
          </h2>
          <div className="space-y-4">
            {thing.properties.length === 0 ? (
              <div className="component-card p-4 text-center text-gray-500">
                No properties available
              </div>
            ) : (
              thing.properties.map((property) => (
                <PropertyWidget key={property.name} property={property} propertyName={property.name} />
              ))
            )}
          </div>
        </div>

        {/* Actions Section */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Actions ({thing.actions.length})
          </h2>
          <div className="space-y-4">
            {thing.actions.length === 0 ? (
              <div className="component-card p-4 text-center text-gray-500">
                No actions available
              </div>
            ) : (
              thing.actions.map((action) => (
                <ActionForm key={action.name} action={action} />
              ))
            )}
          </div>
        </div>

        {/* Events Section */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Events ({thing.events.length})
          </h2>
          <div className="space-y-4">
            {thing.events.length === 0 ? (
              <div className="component-card p-4 text-center text-gray-500">
                No events available
              </div>
            ) : (
              thing.events.map((event) => (
                <EventViewer key={event.name} event={event} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
