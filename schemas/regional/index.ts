import { SchemaStub } from 'schemas/types';
import AustralianSchemas from './au';
import SwissSchemas from './ch';
import IndianSchemas from './in';

/**
 * Regional Schemas are exported by country code.
 */
export default { au: AustralianSchemas, in: IndianSchemas, ch: SwissSchemas } as Record<
  string,
  SchemaStub[]
>;
