import { Doc } from 'fyo/model/doc';
import { ListViewSettings } from 'fyo/model/types';
import { Money } from 'pesa';

export class BankTransaction extends Doc {
  date?: string;
  bankAccount?: string;
  description?: string;
  amount?: Money;
  transactionType?: string;
  status?: string;
  matchedDocType?: string;
  matchedDocName?: string;
  journalEntry?: string;
  plaidTransactionId?: string;

  static getListViewSettings(): ListViewSettings {
    return {
      columns: ['date', 'bankAccount', 'description', 'amount', 'transactionType', 'status'],
    };
  }
}
