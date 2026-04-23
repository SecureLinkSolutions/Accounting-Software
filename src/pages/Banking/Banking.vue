<template>
  <div class="h-screen" style="width: var(--w-desk)">
    <PageHeader :title="t`Banking`">
      <Button
        type="primary"
        :disabled="connecting"
        @click="connectBank"
      >
        {{ connecting ? t`Connecting...` : t`Connect Bank` }}
      </Button>
    </PageHeader>

    <div
      class="overflow-auto dark:bg-gray-875"
      style="height: calc(100vh - var(--h-row-largest) - 1px)"
    >
      <!-- Bank Accounts -->
      <div class="p-4">
        <h2 class="text-base font-semibold mb-3 dark:text-white">
          {{ t`Connected Accounts` }}
        </h2>
        <p v-if="accounts.length === 0" class="text-sm text-gray-500">
          {{
            t`No bank accounts connected. Click "Connect Bank" to get started.`
          }}
        </p>
        <div v-else class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))">
          <div
            v-for="acct in accounts"
            :key="acct.name"
            class="border rounded-lg p-4 dark:border-gray-800 dark:bg-gray-850"
          >
            <div class="flex justify-between items-start mb-2">
              <div>
                <div class="font-medium dark:text-white">{{ acct.name }}</div>
                <div class="text-sm text-gray-500">
                  {{ acct.institution }}
                  <span v-if="acct.accountType"> · {{ acct.accountType }}</span>
                </div>
                <div v-if="acct.accountNumber" class="text-sm text-gray-400">
                  •••• {{ acct.accountNumber }}
                </div>
              </div>
              <div class="text-right">
                <div class="font-semibold dark:text-white">
                  {{ formatCurrency(acct.currentBalance) }}
                </div>
                <div class="text-xs text-gray-400 mt-0.5">
                  {{
                    acct.lastSynced
                      ? t`Synced ` + formatDate(acct.lastSynced)
                      : t`Never synced`
                  }}
                </div>
              </div>
            </div>
            <div class="flex gap-2 mt-3">
              <Button
                :disabled="syncing === acct.name"
                @click="syncAccount(acct)"
              >
                {{ syncing === acct.name ? t`Syncing...` : t`Sync` }}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <hr class="dark:border-gray-800" />

      <!-- Transactions -->
      <div class="p-4">
        <div class="flex items-center gap-3 mb-4 flex-wrap">
          <h2 class="text-base font-semibold dark:text-white">
            {{ t`Transactions` }}
          </h2>
          <select
            v-model="filterAccount"
            class="border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          >
            <option value="">{{ t`All Accounts` }}</option>
            <option v-for="acct in accounts" :key="acct.name" :value="acct.name">
              {{ acct.name }}
            </option>
          </select>
          <select
            v-model="filterStatus"
            class="border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          >
            <option value="">{{ t`All Status` }}</option>
            <option value="Unmatched">{{ t`Unmatched` }}</option>
            <option value="Matched">{{ t`Matched` }}</option>
            <option value="Ignored">{{ t`Ignored` }}</option>
          </select>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr
                class="text-left text-gray-500 border-b dark:border-gray-800"
              >
                <th class="pb-2 font-medium pe-4">{{ t`Date` }}</th>
                <th class="pb-2 font-medium pe-4">{{ t`Account` }}</th>
                <th class="pb-2 font-medium pe-4">{{ t`Description` }}</th>
                <th class="pb-2 font-medium text-right pe-4">
                  {{ t`Amount` }}
                </th>
                <th class="pb-2 font-medium pe-4">{{ t`Status` }}</th>
                <th class="pb-2 font-medium">{{ t`Actions` }}</th>
              </tr>
            </thead>
            <tbody>
              <template
                v-for="txn in filteredTransactions"
                :key="txn.name"
              >
                <tr
                  class="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-850 transition-colors"
                >
                  <td class="py-2 pe-4 dark:text-white whitespace-nowrap">
                    {{ txn.date }}
                  </td>
                  <td class="py-2 pe-4 text-gray-500">
                    {{ txn.bankAccount }}
                  </td>
                  <td class="py-2 pe-4 dark:text-white max-w-xs truncate">
                    {{ txn.description }}
                  </td>
                  <td
                    class="py-2 pe-4 text-right font-medium whitespace-nowrap"
                    :class="
                      txn.transactionType === 'Credit'
                        ? 'text-green-600'
                        : 'text-red-500'
                    "
                  >
                    {{ txn.transactionType === 'Credit' ? '+' : '-'
                    }}{{ formatCurrency(txn.amount) }}
                  </td>
                  <td class="py-2 pe-4">
                    <span
                      class="text-xs px-2 py-0.5 rounded-full"
                      :class="statusClass(txn.status)"
                    >{{ txn.status }}</span>
                  </td>
                  <td class="py-2">
                    <div
                      v-if="txn.status === 'Unmatched'"
                      class="flex gap-1 flex-wrap"
                    >
                      <Button class="text-xs" @click="openMatch(txn)">
                        {{ t`Match` }}
                      </Button>
                      <Button class="text-xs" @click="createJE(txn)">
                        {{ t`Create JE` }}
                      </Button>
                      <Button
                        class="text-xs"
                        @click="ignoreTransaction(txn)"
                      >
                        {{ t`Ignore` }}
                      </Button>
                    </div>
                    <div
                      v-else-if="txn.status === 'Matched'"
                      class="text-xs text-gray-500"
                    >
                      {{ txn.matchedDocType }} · {{ txn.matchedDocName }}
                    </div>
                    <div
                      v-else-if="txn.status === 'Ignored'"
                      class="text-xs text-gray-400"
                    >
                      <Button
                        class="text-xs"
                        @click="unignoreTransaction(txn)"
                      >
                        {{ t`Restore` }}
                      </Button>
                    </div>
                  </td>
                </tr>
                <!-- Inline match form -->
                <tr
                  v-if="matchingTxn && matchingTxn.name === txn.name"
                  class="bg-gray-50 dark:bg-gray-850"
                >
                  <td colspan="6" class="py-3 px-4">
                    <div class="flex items-center gap-2 flex-wrap">
                      <select
                        v-model="matchDocType"
                        class="border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      >
                        <option value="Payment">{{ t`Payment` }}</option>
                        <option value="JournalEntry">
                          {{ t`Journal Entry` }}
                        </option>
                        <option value="SalesInvoice">
                          {{ t`Sales Invoice` }}
                        </option>
                        <option value="PurchaseInvoice">
                          {{ t`Purchase Invoice` }}
                        </option>
                      </select>
                      <input
                        v-model="matchDocName"
                        :placeholder="t`Document name...`"
                        class="border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      />
                      <Button
                        type="primary"
                        class="text-xs"
                        :disabled="!matchDocName"
                        @click="saveMatch(txn)"
                      >
                        {{ t`Save` }}
                      </Button>
                      <Button class="text-xs" @click="matchingTxn = null">
                        {{ t`Cancel` }}
                      </Button>
                    </div>
                  </td>
                </tr>
              </template>
              <tr v-if="filteredTransactions.length === 0">
                <td colspan="6" class="py-10 text-center text-gray-400">
                  {{ t`No transactions found.` }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Error toast -->
    <div
      v-if="errorMessage"
      class="fixed bottom-4 right-4 bg-red-500 text-white text-sm px-4 py-3 rounded-lg shadow-lg max-w-xs"
      @click="errorMessage = ''"
    >
      {{ errorMessage }}
    </div>
  </div>
</template>

<script lang="ts">
import { t } from 'fyo';
import { defineComponent } from 'vue';
import { fyo } from 'src/initFyo';
import PageHeader from 'src/components/PageHeader.vue';
import Button from 'src/components/Button.vue';

interface BankAccountRow {
  name: string;
  institution: string;
  accountType: string;
  accountNumber: string;
  currency: string;
  currentBalance: number;
  lastSynced: string;
  isActive: boolean;
  plaidAccessToken: string;
  plaidAccountId: string;
  plaidCursor: string;
}

interface BankTransactionRow {
  name: string;
  date: string;
  bankAccount: string;
  description: string;
  amount: number;
  transactionType: string;
  status: string;
  matchedDocType: string;
  matchedDocName: string;
  journalEntry: string;
  plaidTransactionId: string;
}

export default defineComponent({
  name: 'Banking',
  components: { PageHeader, Button },

  data() {
    return {
      t,
      accounts: [] as BankAccountRow[],
      transactions: [] as BankTransactionRow[],
      filterAccount: '',
      filterStatus: 'Unmatched',
      syncing: '' as string,
      connecting: false,
      matchingTxn: null as BankTransactionRow | null,
      matchDocType: 'Payment',
      matchDocName: '',
      errorMessage: '',
    };
  },

  computed: {
    filteredTransactions(): BankTransactionRow[] {
      return this.transactions.filter((txn) => {
        if (this.filterAccount && txn.bankAccount !== this.filterAccount) {
          return false;
        }
        if (this.filterStatus && txn.status !== this.filterStatus) {
          return false;
        }
        return true;
      });
    },
  },

  async mounted() {
    await this.loadAccounts();
    await this.loadTransactions();
  },

  methods: {
    async loadAccounts() {
      try {
        const rows = await fyo.db.getAllRaw('BankAccount', {
          fields: [
            'name', 'institution', 'accountType', 'accountNumber',
            'currency', 'currentBalance', 'lastSynced', 'isActive',
            'plaidAccessToken', 'plaidAccountId', 'plaidCursor',
          ],
          filters: { isActive: true },
        });
        this.accounts = rows as unknown as BankAccountRow[];
      } catch {
        this.accounts = [];
      }
    },

    async loadTransactions() {
      try {
        const filters: Record<string, unknown> = {};
        if (this.filterAccount) {
          filters.bankAccount = this.filterAccount;
        }
        const rows = await fyo.db.getAllRaw('BankTransaction', {
          fields: [
            'name', 'date', 'bankAccount', 'description', 'amount',
            'transactionType', 'status', 'matchedDocType', 'matchedDocName',
            'journalEntry', 'plaidTransactionId',
          ],
          orderBy: 'date',
          order: 'desc',
        });
        this.transactions = rows as unknown as BankTransactionRow[];
      } catch {
        this.transactions = [];
      }
    },

    formatCurrency(amount: number | undefined): string {
      if (amount === undefined || amount === null) return '0.00';
      return fyo.format(amount, 'Currency') as string;
    },

    formatDate(dateStr: string): string {
      if (!dateStr) return '';
      try {
        return new Date(dateStr).toLocaleDateString();
      } catch {
        return dateStr;
      }
    },

    statusClass(status: string): string {
      switch (status) {
        case 'Unmatched':
          return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
        case 'Matched':
          return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
        case 'Ignored':
          return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
        default:
          return 'bg-gray-100 text-gray-500';
      }
    },

    async connectBank() {
      this.connecting = true;
      try {
        const r = await fetch('/api/bank/link-token', { method: 'POST' });
        const { link_token, error } = (await r.json()) as {
          link_token?: string;
          error?: string;
        };
        if (error || !link_token) {
          this.errorMessage = error ?? t`Failed to get link token`;
          return;
        }
        await this.openPlaidLink(link_token);
      } catch (e) {
        this.errorMessage = String(e);
      } finally {
        this.connecting = false;
      }
    },

    openPlaidLink(linkToken: string): Promise<void> {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
        script.onload = () => {
          const handler = (
            window as Window & {
              Plaid?: {
                create: (cfg: Record<string, unknown>) => { open: () => void };
              };
            }
          ).Plaid?.create({
            token: linkToken,
            onSuccess: async (
              public_token: string,
              metadata: { accounts: { id: string }[] }
            ) => {
              const accountId = metadata.accounts[0]?.id ?? '';
              await this.exchangeToken(public_token, accountId);
              resolve();
            },
            onExit: () => resolve(),
          });
          handler?.open();
        };
        document.body.appendChild(script);
      });
    },

    async exchangeToken(publicToken: string, accountId: string) {
      const r = await fetch('/api/bank/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token: publicToken, account_id: accountId }),
      });
      const { access_token, account, error } = (await r.json()) as {
        access_token?: string;
        account?: {
          account_id: string;
          name: string;
          type: string;
          subtype: string;
          mask: string;
          institution: string;
          balance: number;
          currency: string;
        };
        error?: string;
      };

      if (error || !access_token || !account) {
        this.errorMessage = error ?? t`Failed to connect account`;
        return;
      }

      const doc = fyo.doc.getNewDoc('BankAccount');
      await doc.set({
        name: account.name,
        institution: account.institution,
        accountType: account.subtype ?? account.type,
        accountNumber: account.mask,
        currency: account.currency,
        currentBalance: fyo.pesa(account.balance),
        isActive: true,
        plaidAccessToken: access_token,
        plaidAccountId: account.account_id,
        plaidCursor: '',
      });
      await doc.sync();

      await this.loadAccounts();

      const savedAccount = this.accounts.find((a) => a.name === account.name);
      if (savedAccount) {
        await this.syncAccount(savedAccount);
      }
    },

    async syncAccount(acct: BankAccountRow) {
      if (!acct.plaidAccessToken) return;
      this.syncing = acct.name;
      try {
        const r = await fetch('/api/bank/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: acct.plaidAccessToken,
            cursor: acct.plaidCursor ?? '',
          }),
        });
        const { added, next_cursor, error } = (await r.json()) as {
          added?: Record<string, unknown>[];
          next_cursor?: string;
          error?: string;
        };

        if (error) {
          this.errorMessage = error;
          return;
        }

        for (const txn of added ?? []) {
          const existing = await fyo.db.getAllRaw('BankTransaction', {
            fields: ['name'],
            filters: { plaidTransactionId: txn.transaction_id as string },
          });
          if (existing.length > 0) continue;

          const amount = (txn.amount as number) ?? 0;
          const transactionType = amount < 0 ? 'Credit' : 'Debit';

          const newTxn = fyo.doc.getNewDoc('BankTransaction');
          await newTxn.set({
            date: txn.date as string,
            bankAccount: acct.name,
            description: (txn.name as string) ?? '',
            amount: fyo.pesa(Math.abs(amount)),
            transactionType,
            status: 'Unmatched',
            plaidTransactionId: txn.transaction_id as string,
          });
          await newTxn.sync();
        }

        const accountDoc = await fyo.doc.getDoc('BankAccount', acct.name);
        await accountDoc.set({
          plaidCursor: next_cursor ?? acct.plaidCursor,
          lastSynced: new Date().toISOString(),
        });
        await accountDoc.sync();

        await this.loadAccounts();
        await this.loadTransactions();
      } catch (e) {
        this.errorMessage = String(e);
      } finally {
        this.syncing = '';
      }
    },

    openMatch(txn: BankTransactionRow) {
      this.matchingTxn = txn;
      this.matchDocType = 'Payment';
      this.matchDocName = '';
    },

    async saveMatch(txn: BankTransactionRow) {
      if (!this.matchDocName) return;
      try {
        const doc = await fyo.doc.getDoc('BankTransaction', txn.name);
        await doc.set({
          status: 'Matched',
          matchedDocType: this.matchDocType,
          matchedDocName: this.matchDocName,
        });
        await doc.sync();
        this.matchingTxn = null;
        await this.loadTransactions();
      } catch (e) {
        this.errorMessage = String(e);
      }
    },

    async createJE(txn: BankTransactionRow) {
      try {
        const je = fyo.doc.getNewDoc('JournalEntry');
        await je.set({
          date: txn.date,
          userRemark: txn.description,
        });
        await je.sync();

        const jeName = je.name as string;
        const txnDoc = await fyo.doc.getDoc('BankTransaction', txn.name);
        await txnDoc.set({
          status: 'Matched',
          matchedDocType: 'JournalEntry',
          matchedDocName: jeName,
          journalEntry: jeName,
        });
        await txnDoc.sync();
        await this.loadTransactions();

        this.$router.push(`/edit/JournalEntry/${jeName}`);
      } catch (e) {
        this.errorMessage = String(e);
      }
    },

    async ignoreTransaction(txn: BankTransactionRow) {
      try {
        const doc = await fyo.doc.getDoc('BankTransaction', txn.name);
        await doc.set({ status: 'Ignored' });
        await doc.sync();
        await this.loadTransactions();
      } catch (e) {
        this.errorMessage = String(e);
      }
    },

    async unignoreTransaction(txn: BankTransactionRow) {
      try {
        const doc = await fyo.doc.getDoc('BankTransaction', txn.name);
        await doc.set({ status: 'Unmatched' });
        await doc.sync();
        await this.loadTransactions();
      } catch (e) {
        this.errorMessage = String(e);
      }
    },
  },
});
</script>
