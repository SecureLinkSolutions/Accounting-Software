import { Fyo } from 'fyo';

export async function createAustralianRecords(fyo: Fyo) {
  await createTaxes(fyo);
}

async function createTaxes(fyo: Fyo) {
  const taxes = [
    { name: 'GST-10', account: 'GST', rate: 10 },
    { name: 'GST-0', account: 'GST', rate: 0 },
  ];

  for (const { name, account, rate } of taxes) {
    const newTax = fyo.doc.getNewDoc('Tax', {
      name,
      details: [{ account, rate }],
    });
    await newTax.sync();
  }
}
