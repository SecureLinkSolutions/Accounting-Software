import { t } from 'fyo';
import { Doc } from 'fyo/model/doc';
import { FiltersMap, FormulaMap, ListViewSettings } from 'fyo/model/types';
import { ModelNameEnum } from 'models/types';
import { Money } from 'pesa';

export class Project extends Doc {
  customer?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  budget?: Money;
  description?: string;
  totalBilled?: Money;
  totalExpenses?: Money;
  totalHours?: number;

  formulas: FormulaMap = {
    totalBilled: {
      formula: async () => {
        if (!this.name || this.notInserted) return this.fyo.pesa(0);

        const salesInvoices = await this.fyo.db.getAllRaw(
          ModelNameEnum.SalesInvoice,
          {
            fields: ['grandTotal'],
            filters: { project: this.name as string, submitted: true, cancelled: false },
          }
        );

        return salesInvoices.reduce(
          (sum, inv) => sum.add(this.fyo.pesa(inv.grandTotal as number ?? 0)),
          this.fyo.pesa(0)
        );
      },
      dependsOn: [],
    },
    totalExpenses: {
      formula: async () => {
        if (!this.name || this.notInserted) return this.fyo.pesa(0);

        const purchaseInvoices = await this.fyo.db.getAllRaw(
          ModelNameEnum.PurchaseInvoice,
          {
            fields: ['grandTotal'],
            filters: { project: this.name as string, submitted: true, cancelled: false },
          }
        );

        return purchaseInvoices.reduce(
          (sum, inv) => sum.add(this.fyo.pesa(inv.grandTotal as number ?? 0)),
          this.fyo.pesa(0)
        );
      },
      dependsOn: [],
    },
    totalHours: {
      formula: async () => {
        if (!this.name || this.notInserted) return 0;

        const timesheets = await this.fyo.db.getAllRaw('Timesheet', {
          fields: ['totalHours'],
          filters: { project: this.name as string, submitted: true },
        });

        return timesheets.reduce(
          (sum, ts) => sum + ((ts.totalHours as number) ?? 0),
          0
        );
      },
      dependsOn: [],
    },
  };

  static filters: FiltersMap = {
    customer: () => ({
      role: ['in', ['Customer', 'Both']],
    }),
  };

  static getListViewSettings(): ListViewSettings {
    return {
      columns: ['name', 'customer', 'status', 'startDate', 'endDate'],
    };
  }
}
