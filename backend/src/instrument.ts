// Imported first by main.ts so auto-instrumentation patches modules before
// they are loaded anywhere else. Keep this file free of other imports.
import { startTracing } from './tracing';

startTracing();
