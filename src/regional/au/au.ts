import { Fyo } from 'fyo';
import { AccountRootTypeEnum } from 'models/baseModels/Account/types';
import { ModelNameEnum } from 'models/types';

export async function createAustralianRecords(fyo: Fyo) {
  await createGSTAccount(fyo);
  await createTaxes(fyo);
}

async function createGSTAccount(fyo: Fyo) {
  const exists = await fyo.db.exists(ModelNameEnum.Account, 'GST');
  if (exists) return;

  const parentName = fyo.t`Duties and Taxes`;
  const parentExists = await fyo.db.exists(ModelNameEnum.Account, parentName);

  await fyo.doc
    .getNewDoc(ModelNameEnum.Account, {
      name: 'GST',
      rootType: AccountRootTypeEnum.Liability,
      parentAccount: parentExists ? parentName : null,
      accountType: 'Tax',
      isGroup: false,
    })
    .sync();
}

async function createTaxes(fyo: Fyo) {
  const taxes = [
    { name: 'GST-10', account: 'GST', rate: 10 },
    { name: 'GST-0', account: 'GST', rate: 0 },
  ];

  for (const { name, account, rate } of taxes) {
    const exists = await fyo.db.exists('Tax', name);
    if (exists) continue;

    const newTax = fyo.doc.getNewDoc('Tax', {
      name,
      details: [{ account, rate }],
    });
    await newTax.sync();
  }
}
