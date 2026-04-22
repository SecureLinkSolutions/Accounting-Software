import { t } from 'fyo';
import { Action } from 'fyo/model/types';
import { DateTime } from 'luxon';
import { Invoice } from 'models/baseModels/Invoice/Invoice';
import { ModelNameEnum } from 'models/types';
import { Report } from 'reports/Report';
import { ColumnField, ReportData, ReportRow } from 'reports/types';
import { Field } from 'schemas/types';

interface BASLine {
  code: string;
  description: string;
  amount: number;
  bold?: boolean;
  isSection?: boolean;
  isEmpty?: boolean;
}

export class BAS extends Report {
  static title = t`Business Activity Statement`;
  static reportName = 'BAS';

  fromDate?: string;
  toDate?: string;
  loading = false;

  setDefaultFilters(): void {
    if (!this.toDate) {
      this.toDate = DateTime.local().toISODate();
    }
    if (!this.fromDate) {
      this.fromDate = DateTime.local().minus({ months: 3 }).toISODate();
    }
  }

  getFilters(): Field[] {
    return [
      {
        fieldtype: 'Date',
        label: t`From Date`,
        placeholder: t`From Date`,
        fieldname: 'fromDate',
      },
      {
        fieldtype: 'Date',
        label: t`To Date`,
        placeholder: t`To Date`,
        fieldname: 'toDate',
      },
    ];
  }

  getColumns(): ColumnField[] {
    return [
      {
        fieldname: 'code',
        fieldtype: 'Data',
        label: t`Code`,
        width: 0.5,
      },
      {
        fieldname: 'description',
        fieldtype: 'Data',
        label: t`Description`,
        width: 3,
      },
      {
        fieldname: 'amount',
        fieldtype: 'Currency',
        label: t`Amount`,
        align: 'right',
        width: 1,
      },
    ];
  }

  async setReportData(): Promise<void> {
    this.loading = true;
    const lines = await this.getBASLines();
    this.reportData = this.buildReportData(lines);
    this.loading = false;
  }

  async getBASLines(): Promise<BASLine[]> {
    const [salesTotal, gstOnSales] = await this.getGSTAmounts(
      ModelNameEnum.SalesInvoice
    );
    const [purchasesTotal, gstCredits] = await this.getGSTAmounts(
      ModelNameEnum.PurchaseInvoice
    );
    const netGST = gstOnSales - gstCredits;
    const isPayable = netGST >= 0;

    return [
      { code: '', description: t`GST on Sales`, amount: 0, isSection: true },
      {
        code: 'G1',
        description: t`Total sales (including GST)`,
        amount: salesTotal,
      },
      {
        code: '1A',
        description: t`GST on sales`,
        amount: gstOnSales,
        bold: true,
      },
      { code: '', description: '', amount: 0, isEmpty: true },

      { code: '', description: t`GST Credits`, amount: 0, isSection: true },
      {
        code: 'G10/G11',
        description: t`Total purchases (including GST)`,
        amount: purchasesTotal,
      },
      {
        code: '1B',
        description: t`GST credits on purchases`,
        amount: gstCredits,
        bold: true,
      },
      { code: '', description: '', amount: 0, isEmpty: true },

      { code: '', description: t`Net GST`, amount: 0, isSection: true },
      {
        code: isPayable ? '9' : '8',
        description: isPayable
          ? t`GST payable to ATO`
          : t`GST refundable from ATO`,
        amount: Math.abs(netGST),
        bold: true,
      },
    ];
  }

  async getGSTAmounts(
    schemaName:
      | typeof ModelNameEnum.SalesInvoice
      | typeof ModelNameEnum.PurchaseInvoice
  ): Promise<[number, number]> {
    const dateFilter = this.getDateFilter();
    const filters: Record<string, unknown> = {
      submitted: true,
      cancelled: false,
    };
    if (dateFilter.length) {
      filters.date = dateFilter;
    }

    const rawEntries = (await this.fyo.db.getAllRaw(schemaName, {
      fields: ['name'],
      filters,
    })) as { name: string }[];

    let totalAmount = 0;
    let totalGST = 0;

    for (const { name } of rawEntries) {
      const invoice = (await this.fyo.doc.getDoc(schemaName, name)) as Invoice;
      totalAmount += (invoice.grandTotal as { float?: number } | undefined)?.float ?? 0;

      for (const tax of invoice.taxes ?? []) {
        if (tax.account === 'GST') {
          totalGST += (tax.amount as { float?: number } | undefined)?.float ?? 0;
        }
      }
    }

    return [totalAmount, totalGST];
  }

  getDateFilter(): string[] {
    const filter: string[] = [];
    if (this.fromDate) filter.push('>=', this.fromDate);
    if (this.toDate) filter.push('<=', this.toDate);
    return filter;
  }

  buildReportData(lines: BASLine[]): ReportData {
    return lines.map((line): ReportRow => {
      if (line.isEmpty) {
        return { cells: [], isEmpty: true };
      }

      if (line.isSection) {
        return {
          cells: [
            { value: '', rawValue: '', width: 0.5 },
            {
              value: line.description,
              rawValue: line.description,
              bold: true,
              width: 3,
            },
            { value: '', rawValue: '', width: 1 },
          ],
        };
      }

      const amountStr = line.amount
        ? this.fyo.format(line.amount, 'Currency')
        : '';

      return {
        cells: [
          { value: line.code, rawValue: line.code, width: 0.5 },
          {
            value: line.description,
            rawValue: line.description,
            bold: line.bold,
            width: 3,
          },
          {
            value: amountStr,
            rawValue: line.amount,
            bold: line.bold,
            align: 'right',
            width: 1,
          },
        ],
      };
    });
  }

  getActions(): Action[] {
    return [];
  }
}
