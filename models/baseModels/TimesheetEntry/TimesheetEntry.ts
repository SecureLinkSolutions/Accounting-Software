import { Doc } from 'fyo/model/doc';
import { CurrenciesMap, FormulaMap } from 'fyo/model/types';
import { DEFAULT_CURRENCY } from 'fyo/utils/consts';
import { FieldTypeEnum, Schema } from 'schemas/types';
import { DocValueMap } from 'fyo/core/types';
import { Fyo } from 'fyo';
import { Money } from 'pesa';

export class TimesheetEntry extends Doc {
  date?: string;
  project?: string;
  task?: string;
  description?: string;
  hours?: number;
  billable?: boolean;
  hourlyRate?: Money;
  amount?: Money;

  constructor(schema: Schema, data: DocValueMap, fyo: Fyo) {
    super(schema, data, fyo);
    this._setGetCurrencies();
  }

  formulas: FormulaMap = {
    amount: {
      formula: () => {
        if (!this.billable) return this.fyo.pesa(0);
        const hours = this.hours ?? 0;
        const rate = (this.hourlyRate as Money | undefined)?.float ?? 0;
        return this.fyo.pesa(hours * rate);
      },
      dependsOn: ['hours', 'hourlyRate', 'billable'],
    },
  };

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
