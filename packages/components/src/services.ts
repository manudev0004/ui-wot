// Services entry point - type-only exports to avoid bundling node-only runtime
export type {
  ConsumedThing as WoTThing,
  ThingDescription,
  PropertyElement,
  ActionElement,
  EventElement,
  WoTServiceConfig
} from './services/wot-service';

export type {
  PropertyBinding,
  ActiveBinding
} from './services/wot-binder';

// NOTE: runtime implementations (WoTService, wotService, WoTBinder) are
// available from `./services-runtime` for consumers who explicitly need
// the node-wot runtime and are responsible for importing it at application
// runtime rather than pulling it into the web component bundle.
