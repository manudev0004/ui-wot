/**
 * WoT Dynamic UI Generator - Main Application Component
 */

import { useState, useEffect } from "react";
import { Thing, parseUrlParameters, consumeTDFromUrl } from "./parsers/TDParser";
import { ThingUploader } from "./components/ThingUploader";
import { ThingDashboard } from "./components/ThingDashboard";

function App() {
    const [currentThing, setCurrentThing] = useState<Thing | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const urlParams = parseUrlParameters();
        if (urlParams.url) {
            setLoading(true);
            consumeTDFromUrl(urlParams.url)
                .then(setCurrentThing)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, []);

    const handleThingConsumed = (thing: Thing) => {
        console.log("Consuming thing:", thing.title); 
        // console.log("Thing properties count:", Object.keys(thing.properties || {}).length);
        // console.log("Thing actions count:", Object.keys(thing.actions || {}).length);
        // console.log("Thing events count:", Object.keys(thing.events || {}).length);
        setCurrentThing(thing);
    };

    const back = () => {
        setCurrentThing(null);
        window.history.replaceState({}, document.title, window.location.pathname);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <h1 className="text-xl font-semibold text-gray-900">WoT UI Generator</h1>
                </div>
            </header>

            <main className="py-8">
                {loading ? (
                    <div className="max-w-4xl mx-auto px-6 text-center">
                        <div className="component-card p-8">
                            <div className="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-blue-600 rounded-full mb-4"></div>
                            <p className="text-gray-600">Loading...</p>
                        </div>
                    </div>
                ) : currentThing ? (
                    <ThingDashboard thing={currentThing} onBack={back} />
                ) : (
                    <div className="max-w-4xl mx-auto px-6">
                        <ThingUploader onThingConsumed={handleThingConsumed} />
                    </div>
                )}
            </main>

            <footer className="mt-12 bg-white border-t border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <p className="text-sm text-gray-500 text-center">GSoC 2025 - Eclipse Thingweb - WoT Dynamic UI Generator</p>
                </div>
            </footer>
        </div>
    );
}

export default App;
