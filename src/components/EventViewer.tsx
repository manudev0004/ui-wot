/**
 * Event Viewer Component for WoT Dynamic UI Generator
 */

import React, { useState, useEffect } from "react";
import { Event } from "../parsers/TDParser";

interface EventViewerProps {
    event: Event;
}

export const EventViewer: React.FC<EventViewerProps> = ({ event }) => {
    const [isListening, setIsListening] = useState(false);
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        // TODO: Add real event subscription when isListening is true
        // For now, just logging the subscription state change
        if (isListening) {
            console.log(`Started listening to event: ${event.name}`);
        } else {
            console.log(`Stopped listening to event: ${event.name}`);
        }
    }, [isListening, event.name]);

  
  // const generateMockEventData = () => {
  //   if (event.dataType === 'boolean') {
  //     return Math.random() > 0.5;
  //   } else if (event.dataType === 'number') {
  //     return Math.floor(Math.random() * 100);
  //   } else if (event.name.includes('temperature')) {
  //     return {
  //       temperature: Math.floor(Math.random() * 40 + 10),
  //       humidity: Math.floor(Math.random() * 100),
  //       timestamp: new Date().toISOString()
  //     };
  //   } else if (event.name.includes('status')) {
  //     return Math.random() > 0.5;
  //   } else {
  //     return {
  //       message: `Event ${event.name} triggered`,
  //       value: Math.floor(Math.random() * 100)
  //     };
  //   }
  // };
  

    const toggleListening = () => {
        setIsListening(!isListening);
        if (!isListening) {
            setEvents([]); // Clear events
        }
    };

    return (
        <div className="component-card p-4">
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="font-semibold text-gray-900">{event.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                    {isListening && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Listening
                        </span>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                <button
                    onClick={toggleListening}
                    className={`action-button w-full ${
                        isListening
                            ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                            : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                    } text-white`}
                >
                    {isListening ? "Stop Listening" : "Start Listening"}
                </button>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Event Stream ({events.length} events):
                    </label>
                    <div className="max-h-64 overflow-y-auto bg-gray-50 border border-gray-200 rounded-md">
                        {events.length === 0 ? (
                            <div className="p-3 text-sm text-gray-500 text-center">
                                {isListening ? "Waiting for events..." : "No events captured yet"}
                            </div>
                        ) : (
                            events.map((eventData, index) => (
                                <div key={index} className="p-3 border-b border-gray-200 last:border-b-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-medium text-gray-600">{eventData.eventName}</span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(eventData.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-800">
                                        <pre className="whitespace-pre-wrap">
                                            {JSON.stringify(eventData.data, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="text-xs text-gray-500">
                    <div>Event Name: {event.name}</div>
                </div>
            </div>
        </div>
    );
};
