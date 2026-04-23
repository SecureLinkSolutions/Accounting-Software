import { Doc } from 'fyo/model/doc';
import { ListViewSettings } from 'fyo/model/types';
import { Money } from 'pesa';

export class BankAccount extends Doc {
  institution?: string;
  accountType?: string;
  accountNumber?: string;
  currency?: string;
  currentBalance?: Money;
  lastSynced?: Date;
  isActive?: boolean;
  plaidAccessToken?: string;
  plaidAccountId?: string;
  plaidCursor?: string;

  static getListViewSettings(): ListViewSettings {
    return {
      columns: ['name', 'institution', 'accountType', 'accountNumber', 'currentBalance', 'isActive'],
    };
  }
}
