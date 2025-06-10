/**
 * WoT Thing Description Parser
 */

export interface Property {
    name: string;
    title: string;
    description: string;
    type: string;
    readOnly: boolean;
    enum?: string[];
    minimum?: number;
    maximum?: number;
}

export interface Action {
    name: string;
    title: string;
    description: string;
    hasInput: boolean;
    inputType?: string;
}

export interface Event {
    name: string;
    title: string;
    description: string;
    dataType?: string;
}

export interface Thing {
    id: string;
    title: string;
    description: string;
    properties: Property[];
    actions: Action[];
    events: Event[];
}

// Check if TD JSON is valid
// TODO: This validation is pretty basic, might need to add JSON Schema validation later
export function validateTD(td: any): boolean {
    if (!td || typeof td !== "object") {
        console.warn("TD validation failed: not an object"); 
        return false;
    }

    // Context and title are mandatory
    const hasContext =
        td["@context"] &&
        (td["@context"] === "https://www.w3.org/2019/wot/td/v1" ||
            (Array.isArray(td["@context"]) && td["@context"].includes("https://www.w3.org/2019/wot/td/v1")));

    if (!hasContext) {
        return false;
    }

    if (!td.title || typeof td.title !== "string") {
        return false;
    }

    return true;
}

// Parse TD JSON into our Thing structure
export function parseTD(td: any): Thing {
    if (!validateTD(td)) {
        throw new Error("Invalid Thing Description");
    }

    // Extract basic metadata
    const result = {
        id: td.id || td.title.toLowerCase().replace(/\s+/g, "-") || "unknown-thing",
        title: td.title,
        description: td.description || "No description provided",
        properties: parseProperties(td.properties || {}),
        actions: parseActions(td.actions || {}),
        events: parseEvents(td.events || {}),
    };
    
    return result;
}

// Convert properties object to array
function parseProperties(propsObj: any): Property[] {
    const properties: Property[] = [];

    for (const [name, prop] of Object.entries(propsObj)) {
        const p = prop as any;

        properties.push({
            name,
            title: p.title || name,
            description: p.description || "No description",
            type: p.type || "string",
            readOnly: p.readOnly || false,
            enum: p.enum, 
            minimum: p.minimum,
            maximum: p.maximum,
        });
    }

    return properties;
}

// Convert actions object to array
function parseActions(actionsObj: any): Action[] {
    const actions: Action[] = [];

    for (const [name, action] of Object.entries(actionsObj)) {
        const a = action as any;
        actions.push({
            name,
            title: a.title || name,
            description: a.description || "No description",
            hasInput: !!a.input,
            inputType: a.input?.type,
        });
    }

    return actions;
}

// Convert events object to array
function parseEvents(eventsObj: any): Event[] {
    const events: Event[] = [];

    for (const [name, event] of Object.entries(eventsObj)) {
        const e = event as any;
        events.push({
            name,
            title: e.title || name,
            description: e.description || "No description",
        });
    }

    return events;
}

// TD consumption
export async function consumeTDFromUrl(url: string): Promise<Thing> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch TD: ${response.status}`);
    }

    const tdJson = await response.json();

    if (!validateTD(tdJson)) {
        throw new Error("Invalid Thing Description");
    }

    return parseTD(tdJson);
}

export const SAMPLE_TD_URLS = {
    testthing: "http://plugfest.thingweb.io/http-data-schema-thing",
    smartcoffee: "http://plugfest.thingweb.io/http-advanced-coffee-machine",
    counter: "http://plugfest.thingweb.io/counter",
    // Local samples for development and testing
    coffeemaker: "/sample_td/coffee-machine.json",
    testdevice: "/sample_td/test-thing.json",
};

// Function to consume sample TD 
export async function consumeSampleTD(sampleKey: keyof typeof SAMPLE_TD_URLS): Promise<Thing> {
    const url = SAMPLE_TD_URLS[sampleKey];
    return await consumeTDFromUrl(url);
}

export function getAvailableSamples(): { key: keyof typeof SAMPLE_TD_URLS; name: string; description: string }[] {
    return [
        { key: "coffeemaker", name: "Coffee Machine", description: "Local coffee machine sample" },
        { key: "testdevice", name: "Test Device", description: "Local test device sample" },
        { key: "testthing", name: "Test Thing", description: "Remote test device" },
        { key: "smartcoffee", name: "Smart Coffee", description: "Remote coffee machine" },
        { key: "counter", name: "Counter", description: "Remote counter device" },
    ];
}

export function parseUrlParameters(): { url?: string } {
    const params = new URLSearchParams(window.location.search);
    return {
        url: params.get("url") || undefined,
    };
}
