// Re-exports the DMS2_OPTIONS injection token for use within the application layer.
// Application handlers import from here instead of from infrastructure/ directly,
// preserving the DDD dependency direction (application must not depend on infrastructure/).
export { DMS2_OPTIONS } from './dms-options.token';
