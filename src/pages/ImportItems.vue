<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b dark:border-gray-800 flex-shrink-0">
      <h1 class="text-xl font-semibold text-gray-800 dark:text-gray-100">
        Import Products / Services
      </h1>
      <div class="flex gap-2">
        <label
          class="cursor-pointer px-4 py-2 rounded text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {{ fileName || 'Choose Excel / CSV File' }}
          <input type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="onFileChange" />
        </label>
        <button
          v-if="rows.length > 0 && !importing"
          class="px-4 py-2 rounded text-sm font-medium text-white"
          style="background: var(--color-brand, #2B4C8C);"
          @click="doImport"
        >
          Import {{ rows.length }} Items
        </button>
        <span v-if="importing" class="px-4 py-2 text-sm text-gray-500">
          Importing… {{ doneCount }}/{{ rows.length }}
        </span>
      </div>
    </div>

    <!-- Summary -->
    <div v-if="summary" class="px-6 py-2 text-sm flex-shrink-0 border-b dark:border-gray-800"
      :class="errorLog.length ? 'text-orange-600' : 'text-green-700'">
      {{ summary }}
    </div>

    <!-- Error log -->
    <div v-if="errorLog.length" class="px-6 py-2 flex-shrink-0 border-b dark:border-gray-800 bg-red-50 dark:bg-gray-900 max-h-36 overflow-auto">
      <p class="text-xs font-semibold text-red-700 mb-1">Errors (first {{ errorLog.length }}):</p>
      <p v-for="(e, i) in errorLog" :key="i" class="text-xs text-red-600">{{ e }}</p>
    </div>

    <!-- Instructions -->
    <div v-if="rows.length === 0" class="flex flex-col items-center justify-center flex-1 text-gray-500 gap-3">
      <feather-icon name="upload" class="w-12 h-12 opacity-30" />
      <p class="text-base">Select an Excel (.xlsx) or CSV file to preview and import items.</p>
      <p class="text-sm opacity-70 text-center max-w-lg">
        Expected columns: Product/Service Name, SKU, Type, Sales Price / Rate,
        Income Account, Purchase Cost, Expense Account, etc.<br/>
        Unknown account or tax names will be skipped — you can fill them in afterward.
      </p>
    </div>

    <!-- Preview Table -->
    <div v-else class="flex-1 overflow-auto custom-scroll custom-scroll-thumb1">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="text-left border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-875 z-10">
            <th class="px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 w-8">#</th>
            <th class="px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Product/Service Name</th>
            <th class="px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">SKU</th>
            <th class="px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Type</th>
            <th class="px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Sales Price</th>
            <th class="px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Income Account</th>
            <th class="px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Expense Account</th>
            <th class="px-3 py-2 w-24">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in rows"
            :key="i"
            class="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-875"
          >
            <td class="px-3 py-1.5 text-gray-400">{{ i + 1 }}</td>
            <td class="px-3 py-1.5 text-gray-700 dark:text-gray-300 max-w-xs truncate">{{ row['Product/Service Name'] }}</td>
            <td class="px-3 py-1.5 text-gray-500">{{ row['SKU'] }}</td>
            <td class="px-3 py-1.5 text-gray-500">{{ row['Type'] }}</td>
            <td class="px-3 py-1.5 text-gray-500">{{ row['Sales Price / Rate'] }}</td>
            <td class="px-3 py-1.5 text-gray-500 max-w-xs truncate">{{ row['Income Account'] }}</td>
            <td class="px-3 py-1.5 text-gray-500 max-w-xs truncate">{{ row['Expense Account'] }}</td>
            <td class="px-3 py-1.5 text-xs whitespace-nowrap">
              <span v-if="statuses[i] === 'ok'" class="text-green-600 font-medium">✓ Done</span>
              <span v-else-if="statuses[i] === 'skip'" class="text-yellow-600 font-medium">↷ Exists</span>
              <span v-else-if="statuses[i] === 'pending'" class="text-gray-400">—</span>
              <span v-else class="text-red-500 font-medium" :title="statuses[i]">✗ Error</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts">
import { fyo } from 'src/initFyo';
import { defineComponent } from 'vue';
import * as XLSX from 'xlsx';

const TYPE_MAP: Record<string, string> = {
  'non-inventory': 'Non-inventory',
  'service': 'Service',
  'product': 'Product',
  'inventory': 'Product',
};

const NUMERIC_FIELDS = new Set(['rate', 'costPrice', 'openingQuantity', 'lowStockAlert']);
const DATE_FIELDS = new Set(['openingQuantityDate']);

function parseDate(val: string): string | null {
  // Handle DD/MM/YYYY and DD-MM-YYYY
  const dmyMatch = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Handle YYYY-MM-DD passthrough
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  return null;
}
const BOOL_FIELDS = new Set(['salesPriceIncludesTax', 'purchaseCostIncludesTax']);
const LINK_FIELDS: Record<string, string> = {
  incomeAccount: 'Account',
  expenseAccount: 'Account',
  inventoryAssetAccount: 'Account',
  tax: 'Tax',
  purchaseTax: 'Tax',
};

export default defineComponent({
  name: 'ImportItems',
  data() {
    return {
      fileName: '',
      rows: [] as Record<string, string>[],
      statuses: [] as string[],
      importing: false,
      doneCount: 0,
      summary: '',
      errorLog: [] as string[],
    };
  },
  methods: {
    onFileChange(event: Event) {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      this.fileName = file.name;
      this.summary = '';
      this.errorLog = [];
      this.statuses = [];
      this.doneCount = 0;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const json: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, {
            defval: '',
            raw: false,
          });
          if (!json.length) {
            this.summary = 'No rows found in the file.';
            return;
          }
          this.rows = json;
          this.statuses = new Array(json.length).fill('pending');
        } catch (err) {
          this.summary = `Failed to parse file: ${(err as Error).message}`;
        }
      };
      reader.readAsArrayBuffer(file);
    },

    async linkExists(schema: string, name: string): Promise<boolean> {
      if (!name) return false;
      try {
        return !!(await fyo.db.exists(schema, name));
      } catch {
        return false;
      }
    },

    async doImport() {
      this.importing = true;
      this.doneCount = 0;
      this.summary = '';
      this.errorLog = [];
      let created = 0;
      let skipped = 0;
      let errors = 0;

      const colMap: Record<string, string> = {
        'Sales Description': 'description',
        'SKU': 'itemCode',
        'Type': 'itemType',
        'Sales Price / Rate': 'rate',
        'Tax on Sales': 'tax',
        'Price/Rate Includes Tax': 'salesPriceIncludesTax',
        'Income Account': 'incomeAccount',
        'Purchase Description': 'purchaseDescription',
        'Purchase Cost': 'costPrice',
        'Tax on Purchases': 'purchaseTax',
        'Purchase Cost Includes Tax': 'purchaseCostIncludesTax',
        'Expense Account': 'expenseAccount',
        'Quantity On Hand': 'openingQuantity',
        'Low Stock Alert': 'lowStockAlert',
        'Inventory Asset Account': 'inventoryAssetAccount',
        'Quantity as-of Date': 'openingQuantityDate',
      };

      for (let i = 0; i < this.rows.length; i++) {
        const raw = this.rows[i];
        const itemName = (raw['Product/Service Name'] || '').trim();
        if (!itemName) {
          this.statuses[i] = 'skip';
          skipped++;
          this.doneCount++;
          continue;
        }

        try {
          const exists = await fyo.db.exists('Item', itemName);
          if (exists) {
            this.statuses[i] = 'skip';
            skipped++;
            this.doneCount++;
            continue;
          }

          const data: Record<string, unknown> = { name: itemName, for: 'Both' };

          for (const [col, fieldname] of Object.entries(colMap)) {
            const val = (raw[col] ?? '').toString().trim();
            if (!val) continue;

            if (fieldname === 'itemType') {
              data[fieldname] = TYPE_MAP[val.toLowerCase()] ?? val;
            } else if (BOOL_FIELDS.has(fieldname)) {
              data[fieldname] = val.toLowerCase() === 'yes' || val === '1' || val.toLowerCase() === 'true';
            } else if (NUMERIC_FIELDS.has(fieldname)) {
              const num = parseFloat(val.replace(/,/g, ''));
              if (!isNaN(num)) data[fieldname] = num;
            } else if (DATE_FIELDS.has(fieldname)) {
              const parsed = parseDate(val);
              if (parsed) data[fieldname] = parsed;
            } else if (LINK_FIELDS[fieldname]) {
              const targetSchema = LINK_FIELDS[fieldname];
              if (await this.linkExists(targetSchema, val)) {
                data[fieldname] = val;
              }
            } else {
              data[fieldname] = val;
            }
          }

          const doc = fyo.doc.getNewDoc('Item', data);
          await doc.sync();
          this.statuses[i] = 'ok';
          created++;
        } catch (err) {
          const msg = `Row ${i + 1} (${(raw['Product/Service Name'] || '').trim()}): ${(err as Error).message}`;
          this.statuses[i] = (err as Error).message;
          if (this.errorLog.length < 20) this.errorLog.push(msg);
          errors++;
        }
        this.doneCount++;
      }

      this.importing = false;
      this.summary = `Import complete: ${created} created, ${skipped} skipped (already exist), ${errors} errors.`;
    },
  },
});
</script>
