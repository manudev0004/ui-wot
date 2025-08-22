// Services entry point for tree-shaking
export { WoTService, wotService } from './services/wot-service';
export { WoTBinder, createBinder } from './services/wot-binder';

export type {
  WoTThing,
  WoTServiceConfig
} from './services/wot-service';

export type {
  PropertyBinding,
  ActiveBinding
} from './services/wot-binder';
