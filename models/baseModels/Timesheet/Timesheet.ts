import { Doc } from 'fyo/model/doc';
import { CurrenciesMap, DefaultMap, FormulaMap, ListViewSettings } from 'fyo/model/types';
import { DEFAULT_CURRENCY } from 'fyo/utils/consts';
import { FieldTypeEnum, Schema } from 'schemas/types';
import { DocValueMap } from 'fyo/core/types';
import { Fyo } from 'fyo';
import { Money } from 'pesa';
import { TimesheetEntry } from '../TimesheetEntry/TimesheetEntry';
import { getNumberSeries } from 'models/helpers';

export class Timesheet extends Doc {
  employee?: string;
  project?: string;
  fromDate?: string;
  toDate?: string;
  entries?: TimesheetEntry[];
  totalHours?: number;
  totalBillableHours?: number;
  totalAmount?: Money;

  constructor(schema: Schema, data: DocValueMap, fyo: Fyo) {
    super(schema, data, fyo);
    this._setGetCurrencies();
  }

  formulas: FormulaMap = {
    totalHours: {
      formula: () =>
        (this.entries ?? []).reduce(
          (sum, entry) => sum + (entry.hours ?? 0),
          0
        ),
      dependsOn: ['entries'],
    },
    totalBillableHours: {
      formula: () =>
        (this.entries ?? [])
          .filter((e) => e.billable)
          .reduce((sum, entry) => sum + (entry.hours ?? 0), 0),
      dependsOn: ['entries'],
    },
    totalAmount: {
      formula: () => {
        let total = this.fyo.pesa(0);
        for (const entry of this.entries ?? []) {
          total = total.add(entry.amount ?? this.fyo.pesa(0));
        }
        return total;
      },
      dependsOn: ['entries'],
    },
  };

  static defaults: DefaultMap = {
    numberSeries: (doc) => getNumberSeries(doc.schemaName, doc.fyo),
    fromDate: () => new Date().toISOString().slice(0, 10),
  };

  static getListViewSettings(): ListViewSettings {
    return {
      columns: ['name', 'employee', 'project', 'fromDate', 'totalHours', 'totalAmount'],
    };
  }

  getCurrencies: CurrenciesMap = {};
  _getCurrency() {
    return this.fyo.singles.SystemSettings?.currency ?? DEFAULT_CURRENCY;
  }
  _setGetCurrencies() {
    const currencyFields = this.schema.fields.filter(
      ({ fieldtype }) => fieldtype === FieldTypeEnum.Currency
    );
    for (const { fieldname } of currencyFields) {
      this.getCurrencies[fieldname] ??= this._getCurrency.bind(this);
    }
  }
}
