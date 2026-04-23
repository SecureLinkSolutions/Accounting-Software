import { Doc } from 'fyo/model/doc';

export class ERPNextSyncSettings extends Doc {
  isEnabled?: boolean;
  baseURL?: string;
  authToken?: string;
  dataSyncInterval?: string;
  deviceID?: string;
}
