// Simple debug
export const debugLog = (...args: any[]) => {
    if (process.env.NODE_ENV === "development") {
        console.log("[DEBUG]", ...args);
    }
};

// TODO: Add further debug utilities as needed

