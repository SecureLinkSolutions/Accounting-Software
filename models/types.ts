export type InvoiceStatus =
  | 'Draft'
  | 'Saved'
  | 'Unpaid'
  | 'Cancelled'
  | 'Paid'
  | 'Return'
  | 'ReturnIssued'
  | 'Unpaid'
  | 'PartlyPaid';

export enum ModelNameEnum {
  Account = 'Account',
  AccountingLedgerEntry = 'AccountingLedgerEntry',
  AccountingSettings = 'AccountingSettings',
  Address = 'Address',
  Batch = 'Batch',
  BatchSeries = 'BatchSeries',
  Color = 'Color',
  Currency = 'Currency',
  GetStarted = 'GetStarted',
  Defaults = 'Defaults',
  Item = 'Item',
  ItemGroup = 'ItemGroup',
  ItemEnquiry = 'ItemEnquiry',
  UOM = 'UOM',
  UOMConversionItem = 'UOMConversionItem',
  JournalEntry = 'JournalEntry',
  JournalEntryAccount = 'JournalEntryAccount',
  Misc = 'Misc',
  NumberSeries = 'NumberSeries',
  SerialNumberSeries = 'SerialNumberSeries',
  Party = 'Party',
  Payment = 'Payment',
  PaymentMethod = 'PaymentMethod',
  PaymentFor = 'PaymentFor',
  PrintSettings = 'PrintSettings',
  PrintTemplate = 'PrintTemplate',
  PurchaseInvoice = 'PurchaseInvoice',
  PurchaseInvoiceItem = 'PurchaseInvoiceItem',
  SalesInvoice = 'SalesInvoice',
  SalesInvoiceItem = 'SalesInvoiceItem',
  SalesQuote = 'SalesQuote',
  SalesQuoteItem = 'SalesQuoteItem',
  SerialNumber = 'SerialNumber',
  SetupWizard = 'SetupWizard',
  Tax = 'Tax',
  TaxDetail = 'TaxDetail',
  TaxSummary = 'TaxSummary',
  PatchRun = 'PatchRun',
  SingleValue = 'SingleValue',
  InventorySettings = 'InventorySettings',
  SystemSettings = 'SystemSettings',
  StockMovement = 'StockMovement',
  StockMovementItem = 'StockMovementItem',
  StockLedgerEntry = 'StockLedgerEntry',
  Shipment = 'Shipment',
  ShipmentItem = 'ShipmentItem',
  PurchaseReceipt = 'PurchaseReceipt',
  PurchaseReceiptItem = 'PurchaseReceiptItem',
  Location = 'Location',
  CustomForm = 'CustomForm',
  CustomField = 'CustomField',
  BankAccount = 'BankAccount',
  BankTransaction = 'BankTransaction',
  ERPNextSyncSettings = 'ERPNextSyncSettings',
}

export type ModelName = keyof typeof ModelNameEnum;

export type PaymentMethodType = 'Cash' | 'Bank';
