import { useState } from "react";
import { Property } from "../parsers/TDParser";

interface PropertyWidgetProps {
    property: Property;
    propertyName: string;
}

export const PropertyWidget: React.FC<PropertyWidgetProps> = ({ property, propertyName }) => {
    const [value, setValue] = useState<any>(null);
    const [writeValue, setWriteValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const readProperty = async () => {
        if (loading) return;
        setLoading(true);
        setError(null);

        try {
            let val: any = "Not available";
            if (property.enum && property.enum.length > 0) {
                val = property.enum[0];
            } else if (property.type === "boolean") {
                val = false;
            } else if (property.type === "number") {
                val = property.minimum || 0;
            }
            setValue(val);
        } catch (err) {
            setError("Read failed");
        } finally {
            setLoading(false);
        }
    };

    const writeProperty = async () => {
        if (!writeValue.trim()) {
            setError("Value required");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let parsedValue: any = writeValue;
            if (property.type === "boolean") {
                parsedValue = writeValue.toLowerCase() === "true";
            } else if (property.type === "number") {
                const num = parseFloat(writeValue);
                if (isNaN(num)) throw new Error("Invalid number");
                parsedValue = num;
            }

            setValue(parsedValue);
            setWriteValue("");
        } catch (err) {
            setError("Write failed");
        } finally {
            setLoading(false);
        }
    };

    const renderInput = () => {
        if (property.enum) {
            return (
                <select
                    value={writeValue}
                    onChange={(e) => setWriteValue(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    disabled={loading}
                >
                    <option value="">Select...</option>
                    {property.enum.map((option: string) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
            );
        }

        if (property.type === "boolean") {
            return (
                <select
                    value={writeValue}
                    onChange={(e) => setWriteValue(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    disabled={loading}
                >
                    <option value="">Select...</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                </select>
            );
        }

        return (
            <input
                type={property.type === "number" ? "number" : "text"}
                value={writeValue}
                onChange={(e) => setWriteValue(e.target.value)}
                placeholder="Enter value"
                className="w-full px-3 py-2 border rounded-md"
                disabled={loading}
                {...(property.type === "number" && {
                    min: property.minimum,
                    max: property.maximum,
                })}
            />
        );
    };

    const formatValue = (val: any) => {
        if (val === null || val === undefined) return "No data";
        if (typeof val === "boolean") return val ? "True" : "False";
        return String(val);
    };

    return (
        <div className="bg-white border rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">{propertyName}</h3>
                {property.readOnly && <span className="text-xs bg-gray-100 px-2 py-1 rounded">Read-only</span>}
            </div>

            {property.description && <p className="text-sm text-gray-600 mb-3">{property.description}</p>}

            <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Current Value</label>
                <div className="px-3 py-2 bg-gray-50 border rounded">{formatValue(value)}</div>
            </div>

            <button
                onClick={readProperty}
                disabled={loading}
                className="w-full mb-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
                {loading ? "Reading..." : "Read"}
            </button>

            {!property.readOnly && (
                <div className="border-t pt-3">
                    <label className="block text-sm font-medium mb-2">Write Value</label>
                    <div className="space-y-2">
                        {renderInput()}
                        <button
                            onClick={writeProperty}
                            disabled={loading || !writeValue.trim()}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                            {loading ? "Writing..." : "Write"}
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}
        </div>
    );
};
