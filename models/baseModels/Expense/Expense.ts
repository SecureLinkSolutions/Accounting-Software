import { Fyo } from 'fyo';
import { Doc } from 'fyo/model/doc';
import {
  DefaultMap,
  FiltersMap,
  FormulaMap,
  HiddenMap,
  ListViewSettings,
} from 'fyo/model/types';
import { getLedgerLinkAction, getNumberSeries } from 'models/helpers';
import { LedgerPosting } from 'models/Transactional/LedgerPosting';
import { Transactional } from 'models/Transactional/Transactional';
import { Money } from 'pesa';

export class Expense extends Transactional {
  name?: string;
  date?: Date;
  category?: string;
  description?: string;
  isBusinessExpense?: boolean;
  project?: string;
  expenseAccount?: string;
  paymentAccount?: string;
  amount?: Money;
  hasGst?: boolean;
  gstAccount?: string;
  gstAmount?: Money;
  totalAmount?: Money;
  attachment?: string;
  journalEntry?: string;

  static defaults: DefaultMap = {
    numberSeries: (doc: Doc) => getNumberSeries(doc.schemaName, doc.fyo),
    date: () => new Date(),
    isBusinessExpense: () => true,
  };

  static filters: FiltersMap = {
    numberSeries: () => ({ referenceType: 'Expense' }),
    expenseAccount: () => ({ rootType: 'Expense' }),
    gstAccount: () => ({ accountType: 'Tax' }),
  };

  formulas: FormulaMap = {
    gstAmount: {
      formula: () => {
        if (!this.hasGst || !this.amount) {
          return this.fyo.pesa(0);
        }
        return this.amount.mul(0.1);
      },
      dependsOn: ['amount', 'hasGst'],
    },
    totalAmount: {
      formula: () => {
        const base = this.amount ?? this.fyo.pesa(0);
        const gst = this.gstAmount ?? this.fyo.pesa(0);
        return base.add(gst);
      },
      dependsOn: ['amount', 'gstAmount'],
    },
  };

  hidden: HiddenMap = {
    gstAccount: () => !this.hasGst,
    gstAmount: () => !this.hasGst,
    journalEntry: () => !this.journalEntry,
  };

  async getPosting(): Promise<LedgerPosting | null> {
    if (!this.expenseAccount || !this.paymentAccount || !this.amount) {
      return null;
    }

    const posting = new LedgerPosting(this, this.fyo);
    await posting.debit(this.expenseAccount, this.amount);

    if (
      this.hasGst &&
      this.gstAccount &&
      this.gstAmount &&
      !this.gstAmount.isZero()
    ) {
      await posting.debit(this.gstAccount, this.gstAmount);
    }

    const total = this.totalAmount ?? this.amount;
    await posting.credit(this.paymentAccount, total);

    return posting;
  }

  static getActions(fyo: Fyo) {
    return [getLedgerLinkAction(fyo)];
  }

  static getListViewSettings(): ListViewSettings {
    return {
      columns: ['name', 'date', 'category', 'totalAmount'],
    };
  }
}
