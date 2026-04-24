import { Fyo } from 'fyo';
import { DocValueMap } from 'fyo/core/types';
import { Action, FiltersMap, ListViewSettings } from 'fyo/model/types';
import { ModelNameEnum } from 'models/types';
import { getQuoteActions, getTransactionStatusColumn } from '../../helpers';
import { Invoice } from '../Invoice/Invoice';
import { SalesQuoteItem } from '../SalesQuoteItem/SalesQuoteItem';
import { Defaults } from '../Defaults/Defaults';
import { Doc } from 'fyo/model/doc';
import { Party } from '../Party/Party';

export class SalesQuote extends Invoice {
  items?: SalesQuoteItem[];
  party?: string;
  name?: string;
  referenceType?:
    | ModelNameEnum.SalesInvoice
    | ModelNameEnum.PurchaseInvoice
    | ModelNameEnum.Lead;

  // This is an inherited method and it must keep the async from the parent
  // class
  // eslint-disable-next-line @typescript-eslint/require-await
  async getPosting() {
    return null;
  }

  async getInvoice(): Promise<Invoice | null> {
    const schemaName = ModelNameEnum.SalesInvoice;
    const defaults = (this.fyo.singles.Defaults as Defaults) ?? {};
    const terms = defaults.salesInvoiceTerms ?? '';
    const numberSeries = defaults.salesInvoiceNumberSeries ?? undefined;

    const quoteDict = this.getValidDict(false, true);
    const data: DocValueMap = {
      ...quoteDict,
      name: undefined,
      date: new Date().toISOString(),
      terms,
      numberSeries,
      quote: this.name,
      items: [],
      submitted: false,
      cancelled: false,
    };

    const invoice = this.fyo.doc.getNewDoc(schemaName, data) as Invoice;
    for (const row of this.items ?? []) {
      await invoice.append('items', row.getValidDict(false, true));
    }

    if (!invoice.items?.length) {
      return null;
    }

    await invoice.sync();
    return invoice;
  }

  static filters: FiltersMap = {
    numberSeries: (doc: Doc) => ({ referenceType: doc.schemaName }),
  };

  async afterSubmit(): Promise<void> {
    await super.afterSubmit();

    if (this.referenceType == ModelNameEnum.Lead) {
      const partyDoc = (await this.loadAndGetLink('party')) as Party;

      await partyDoc.setAndSync('status', 'Quotation');
    }
  }

  static getListViewSettings(): ListViewSettings {
    return {
      columns: [
        'name',
        getTransactionStatusColumn(),
        'party',
        'date',
        'baseGrandTotal',
        'outstandingAmount',
      ],
    };
  }

  static getActions(fyo: Fyo): Action[] {
    return getQuoteActions(fyo, ModelNameEnum.SalesQuote);
  }
}
