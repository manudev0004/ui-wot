/**
 * TD Consumer Component
 */

import React, { useState } from "react";
import { parseTD, validateTD, Thing, consumeTDFromUrl, consumeSampleTD } from "../parsers/TDParser";

interface ThingUploaderProps {
    onThingConsumed: (thing: Thing) => void;
}

export const ThingUploader: React.FC<ThingUploaderProps> = ({ onThingConsumed }) => {
    const [jsonInput, setJsonInput] = useState("");
    const [urlInput, setUrlInput] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"samples" | "json" | "url">("samples");

    // URL-based TD consuming
    const handleConsumeFromUrl = async () => {
        if (!urlInput.trim()) {
            setError("Please enter a valid URL");
            return;
        }

        setError(null);
        setLoading(true);

        try {
            const thing = await consumeTDFromUrl(urlInput);
            onThingConsumed(thing);
            setUrlInput("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to consume Thing Description");
        } finally {
            setLoading(false);
        }
    };

    const handleParseJson = async () => {
        setError(null);
        setLoading(true);

        // Basic validation first
        if (!jsonInput.trim()) {
            setError("Please enter a Thing Description JSON");
            setLoading(false);
            return;
        }

        try {
            const tdObject = JSON.parse(jsonInput);

            // Validate TD structure
            if (!validateTD(tdObject)) {
                throw new Error("Invalid Thing Description format");
            }

            const thing = parseTD(tdObject);
            console.log("parsed TD for:", thing.title);

            // Success! Pass to parent component
            onThingConsumed(thing);
            setJsonInput(""); // clear
        } catch (err) {
            let errorMessage = "Failed to parse Thing Description";

            if (err instanceof SyntaxError) {
                errorMessage = "Invalid JSON format";
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }

            setError(errorMessage);
            console.error("TD parsing error:", err);
        } finally {
            setLoading(false);
        }
    };

    // Sample consuming function
    const consumeSampleFromParser = async (sampleKey: string) => {
        setError(null);
        setLoading(true);
        setJsonInput("");

        try {
            const thing = await consumeSampleTD(sampleKey as any);
            onThingConsumed(thing);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to consume sample");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="component-card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Consume Thing Description</h2>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab("samples")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === "samples"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                    >
                        Sample TDs
                    </button>
                    <button
                        onClick={() => setActiveTab("url")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === "url"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                    >
                        Consume from URL
                    </button>
                    <button
                        onClick={() => setActiveTab("json")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === "json"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                    >
                        Paste JSON
                    </button>
                </nav>
            </div>

            <div className="space-y-4">
                {/* Sample TDs Tab */}
                {activeTab === "samples" && (
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Choose a sample Thing Description:</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => consumeSampleFromParser("coffeemaker")}
                                disabled={loading}
                                className="action-button bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500 disabled:opacity-50"
                            >
                                Coffee Machine
                            </button>
                            <button
                                onClick={() => consumeSampleFromParser("testdevice")}
                                disabled={loading}
                                className="action-button bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:opacity-50"
                            >
                                Test Device
                            </button>
                        </div>
                    </div>
                )}

                {/* URL Input Tab */}
                {activeTab === "url" && (
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Consume Thing Description from URL:</h3>
                        <div className="flex space-x-2">
                            <input
                                type="url"
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                placeholder="https://example.com/thing-description.json"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={loading}
                            />
                            <button
                                onClick={handleConsumeFromUrl}
                                disabled={!urlInput.trim() || loading}
                                className="action-button bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500 disabled:opacity-50"
                            >
                                {loading ? "Consuming..." : "Consume TD"}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Enter a URL to a Thing Description JSON file. Supports HTTP/HTTPS endpoints.
                        </p>
                    </div>
                )}

                {/* JSON Input Tab */}
                {activeTab === "json" && (
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Paste Thing Description JSON:</h3>
                        <textarea
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            placeholder="Paste Thing Description JSON here..."
                            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            disabled={loading}
                        />

                        <button
                            onClick={handleParseJson}
                            disabled={!jsonInput.trim() || loading}
                            className="action-button mt-2 bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500 disabled:opacity-50"
                        >
                            {loading ? "Consuming..." : "Consume TD"}
                        </button>
                    </div>
                )}

                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-red-800 text-sm">{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
