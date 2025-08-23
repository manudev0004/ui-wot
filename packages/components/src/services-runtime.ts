// Runtime-only re-exports for consumers who need the node-wot service at application runtime.
// Importing this module will pull in the node-only dependencies; keep usage explicit.
export { WoTService, wotService, createWoTService } from './services/wot-service';
export { WoTBinder, createBinder } from './services/wot-binder';
