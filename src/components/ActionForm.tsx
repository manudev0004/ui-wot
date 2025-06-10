/**
 * Action Form Component for WoT Dynamic UI Generator
 */

import React, { useState } from "react";
import { Action } from "../parsers/TDParser";

interface ActionFormProps {
    action: Action;
}

export const ActionForm: React.FC<ActionFormProps> = ({ action }) => {
    const [inputValue, setInputValue] = useState<string>("");
    const [executing, setExecuting] = useState(false);
    const [result, setResult] = useState<any>(null);

    const execute = async () => {
        setExecuting(true);
        setResult(null);

        try {
            // TODO: Implement actual action execution
            const response = {
                success: true,
                data: action.hasInput ? inputValue : null,
            };

            setResult(response);
            if (action.hasInput) {
                setInputValue(""); // clear after execution
            }
        } catch (error) {
            setResult({ success: false, error: String(error) });
        } finally {
            setExecuting(false);
        }
    };

    const renderInput = () => {
        if (!action.hasInput) return null;

        return (
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Input Value:</label>
                {action.inputType === "number" ? (
                    <input
                        type="number"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter number..."
                    />
                ) : (
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter value..."
                    />
                )}
            </div>
        );
    };

    return (
        <div className="component-card p-4">
            <div className="mb-3">
                <h3 className="font-semibold text-gray-900">{action.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{action.description}</p>
            </div>

            <div className="space-y-3">
                {renderInput()}

                <button
                    onClick={execute}
                    disabled={executing || (action.hasInput && !inputValue)}
                    className="action-button w-full bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500 disabled:opacity-50"
                >
                    {executing ? "Executing..." : `Execute ${action.title}`}
                </button>

                {result && (
                    <div className="mt-3">
                        <div
                            className={`px-3 py-2 rounded-md text-sm ${
                                result.success
                                    ? "bg-green-50 border border-green-200 text-green-800"
                                    : "bg-red-50 border border-red-200 text-red-800"
                            }`}
                        >
                            {result.success ? "Success" : `Error: ${result.error}`}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
