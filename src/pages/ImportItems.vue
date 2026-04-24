<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <div
      class="flex items-center justify-between px-6 py-4 border-b dark:border-gray-800 flex-shrink-0"
    >
      <h1 class="text-xl font-semibold text-gray-800 dark:text-gray-100">
        Import Products / Services
      </h1>
      <div class="flex gap-2">
        <label
          class="
            cursor-pointer px-4 py-2 rounded text-sm font-medium border
            border-gray-300 dark:border-gray-600
            text-gray-700 dark:text-gray-200
            hover:bg-gray-50 dark:hover:bg-gray-800
          "
        >
          {{ fileName || 'Choose Excel / CSV File' }}
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            class="hidden"
            @change="onFileChange"
          />
        </label>
        <button
          v-if="rows.length > 0"
          :disabled="importing"
          class="
            px-4 py-2 rounded text-sm font-medium text-white
            disabled:opacity-50
          "
          style="background: var(--color-brand, #2B4C8C);"
          @click="doImport"
        >
          {{ importing ? `Importing… (${doneCount}/${rows.length})` : `Import ${rows.length} Items` }}
        </button>
      </div>
    </div>

    <!-- Status -->
    <div
      v-if="message"
      class="px-6 py-2 text-sm flex-shrink-0"
      :class="messageError ? 'text-red-600' : 'text-green-700'"
    >
      {{ message }}
    </div>

    <!-- Instructions -->
    <div
      v-if="rows.length === 0"
      class="flex flex-col items-center justify-center flex-1 text-gray-500 gap-3"
    >
      <feather-icon name="upload" class="w-12 h-12 opacity-30" />
      <p class="text-base">Select an Excel (.xlsx) or CSV file to preview and import items.</p>
      <p class="text-sm opacity-70">
        Expected columns: Product/Service Name, SKU, Type, Sales Price / Rate,
        Tax on Sales, Income Account, Purchase Cost, Expense Account, etc.
      </p>
    </div>

    <!-- Preview Table -->
    <div v-else class="flex-1 overflow-auto custom-scroll custom-scroll-thumb1 p-4">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="text-left border-b dark:border-gray-700">
            <th class="px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 w-8">#</th>
            <th
              v-for="col in columns"
              :key="col"
              class="px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap"
            >
              {{ col }}
            </th>
            <th class="px-3 py-2 w-20">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in rows"
            :key="i"
            class="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-875"
          >
            <td class="px-3 py-1.5 text-gray-400">{{ i + 1 }}</td>
            <td
              v-for="col in columns"
              :key="col"
              class="px-3 py-1.5 text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-xs truncate"
            >
              {{ row[col] ?? '' }}
            </td>
            <td class="px-3 py-1.5 text-xs">
              <span
                v-if="statuses[i] === 'ok'"
                class="text-green-600 font-medium"
              >✓ Done</span>
              <span
                v-else-if="statuses[i] === 'skip'"
                class="text-yellow-600 font-medium"
              >↷ Skip</span>
              <span
                v-else-if="statuses[i] && statuses[i] !== 'pending'"
                class="text-red-500 font-medium"
                :title="statuses[i]"
              >✗ Error</span>
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

const COLUMN_MAP: Record<string, string> = {
  'Product/Service Name': 'name',
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

const TYPE_MAP: Record<string, string> = {
  'non-inventory': 'Non-inventory',
  'service': 'Service',
  'product': 'Product',
  'inventory': 'Product',
};

export default defineComponent({
  name: 'ImportItems',
  data() {
    return {
      fileName: '',
      columns: [] as string[],
      rows: [] as Record<string, string>[],
      statuses: [] as string[],
      importing: false,
      doneCount: 0,
      message: '',
      messageError: false,
    };
  },
  methods: {
    onFileChange(event: Event) {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      this.fileName = file.name;
      this.message = '';
      this.statuses = [];
      this.doneCount = 0;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const wb = XLSX.read(data, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const json: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, {
            defval: '',
            raw: false,
          });

          if (!json.length) {
            this.message = 'No rows found in the file.';
            this.messageError = true;
            return;
          }

          this.columns = Object.keys(json[0]);
          this.rows = json;
          this.statuses = new Array(json.length).fill('pending');
        } catch (err) {
          this.message = `Failed to parse file: ${(err as Error).message}`;
          this.messageError = true;
        }
      };
      reader.readAsArrayBuffer(file);
    },

    async doImport() {
      this.importing = true;
      this.doneCount = 0;
      this.message = '';
      this.messageError = false;
      let created = 0;
      let skipped = 0;
      let errors = 0;

      for (let i = 0; i < this.rows.length; i++) {
        const raw = this.rows[i];
        const itemName = (raw['Product/Service Name'] || '').trim();
        if (!itemName) {
          this.statuses[i] = 'skip';
          skipped++;
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

          for (const [col, fieldname] of Object.entries(COLUMN_MAP)) {
            if (col === 'Product/Service Name') continue;
            const val = (raw[col] ?? '').toString().trim();
            if (!val) continue;

            if (fieldname === 'itemType') {
              data[fieldname] = TYPE_MAP[val.toLowerCase()] ?? val;
            } else if (
              fieldname === 'salesPriceIncludesTax' ||
              fieldname === 'purchaseCostIncludesTax'
            ) {
              data[fieldname] = val.toLowerCase() === 'yes' || val === '1' || val.toLowerCase() === 'true';
            } else if (fieldname === 'rate' || fieldname === 'costPrice' || fieldname === 'openingQuantity' || fieldname === 'lowStockAlert') {
              const num = parseFloat(val.replace(/,/g, ''));
              if (!isNaN(num)) data[fieldname] = num;
            } else {
              data[fieldname] = val;
            }
          }

          const doc = fyo.doc.getNewDoc('Item', data);
          await doc.sync();
          this.statuses[i] = 'ok';
          created++;
        } catch (err) {
          this.statuses[i] = (err as Error).message || 'error';
          errors++;
        }
        this.doneCount++;
      }

      this.importing = false;
      this.message = `Import complete: ${created} created, ${skipped} skipped (already exist), ${errors} errors.`;
      this.messageError = errors > 0;
    },
  },
});
</script>
