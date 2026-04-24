<template>
  <div
    class="py-2 h-full flex justify-between flex-col relative"
    style="background: var(--color-brand-dark, #1E3670);"
    :class="{
      'window-drag': platform !== 'Windows',
    }"
  >
    <div>
      <!-- Company name -->
      <div
        class="px-4 flex flex-row items-center justify-between mb-4"
        :class="
          platform === 'Mac' && languageDirection === 'ltr' ? 'mt-10' : 'mt-2'
        "
      >
        <h6
          data-testid="company-name"
          class="font-semibold whitespace-nowrap overflow-auto no-scrollbar select-none"
          style="color: rgba(255,255,255,0.95);"
        >
          {{ companyName }}
        </h6>
      </div>

      <!-- Sidebar Items -->
      <div v-for="group in groups" :key="group.label">
        <div
          class="px-4 flex items-center cursor-pointer h-10 rounded-sm mx-1 transition-colors"
          :style="
            isGroupActive(group)
              ? 'background: rgba(255,255,255,0.15); border-inline-start: 3px solid rgba(255,255,255,0.9);'
              : 'border-inline-start: 3px solid transparent;'
          "
          @mouseenter="$event.currentTarget.style.background = isGroupActive(group) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'"
          @mouseleave="$event.currentTarget.style.background = isGroupActive(group) ? 'rgba(255,255,255,0.15)' : ''"
          @click="routeToSidebarItem(group)"
        >
          <Icon
            class="flex-shrink-0"
            :name="group.icon"
            :size="group.iconSize || '18'"
            :height="group.iconHeight ?? 0"
            :active="false"
            :darkMode="true"
            :class="isGroupActive(group) && !group.items ? '-ms-1' : ''"
          />
          <div
            class="ms-2 text-base font-medium"
            :style="
              isGroupActive(group)
                ? 'color: rgba(255,255,255,1);'
                : 'color: rgba(255,255,255,0.7);'
            "
          >
            {{ group.label }}
          </div>
        </div>

        <!-- Expanded Group -->
        <div v-if="group.items && isGroupActive(group)">
          <div
            v-for="item in group.items"
            :key="item.label"
            class="h-9 ps-10 cursor-pointer flex items-center rounded-sm mx-1 text-sm transition-colors"
            :style="
              isItemActive(item)
                ? 'background: rgba(255,255,255,0.15); color: rgba(255,255,255,1); border-inline-start: 3px solid rgba(255,255,255,0.9); font-weight: 600;'
                : 'color: rgba(255,255,255,0.65); border-inline-start: 3px solid transparent;'
            "
            @mouseenter="$event.currentTarget.style.background = isItemActive(item) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'"
            @mouseleave="$event.currentTarget.style.background = isItemActive(item) ? 'rgba(255,255,255,0.15)' : ''"
            @click="routeToSidebarItem(item)"
          >
            <p>{{ item.label }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- DB Switcher -->
    <div class="window-no-drag flex flex-col gap-2 py-2 px-4">
      <button
        data-testid="change-db"
        class="flex text-sm gap-1 items-center"
        style="color: rgba(255,255,255,0.5);"
        @click="$emit('change-db-file')"
      >
        <feather-icon name="database" class="h-4 w-4 flex-shrink-0" />
        <p>{{ t`Change DB` }}</p>
      </button>

      <p
        v-if="showDevMode"
        class="text-xs select-none cursor-pointer"
        style="color: rgba(255,255,255,0.4);"
        @click="showDevMode = false"
        title="Open dev tools with Ctrl+Shift+I"
      >
        dev mode
      </p>
    </div>

    <!-- Hide Sidebar Button -->
    <button
      class="absolute bottom-0 end-0 rounded p-1 m-4 rtl-rotate-180"
      style="color: rgba(255,255,255,0.5);"
      @click="() => toggleSidebar()"
    >
      <feather-icon name="chevrons-left" class="w-4 h-4" />
    </button>

  </div>
</template>
<script lang="ts">
import { fyo } from 'src/initFyo';
import { languageDirectionKey, shortcutsKey } from 'src/utils/injectionKeys';
import { getSidebarConfig } from 'src/utils/sidebarConfig';
import { SidebarConfig, SidebarItem, SidebarRoot } from 'src/utils/types';
import { routeTo, toggleSidebar } from 'src/utils/ui';
import { defineComponent, inject } from 'vue';
import router from '../router';
import Icon from './Icon.vue';

const COMPONENT_NAME = 'Sidebar';

export default defineComponent({
  components: {
    Icon,
  },
  props: {
    darkMode: { type: Boolean, default: false },
  },
  emits: ['change-db-file', 'toggle-darkmode'],
  setup() {
    return {
      languageDirection: inject(languageDirectionKey),
      shortcuts: inject(shortcutsKey),
    };
  },
  data() {
    return {
      companyName: '',
      groups: [],
      activeGroup: null,
      showDevMode: false,
    } as {
      companyName: string;
      groups: SidebarConfig;
      activeGroup: null | SidebarRoot;
      showDevMode: boolean;
    };
  },
  computed: {
    appVersion() {
      return fyo.store.appVersion;
    },
  },
  async mounted() {
    const { companyName } = await fyo.doc.getDoc('AccountingSettings');
    this.companyName = companyName as string;
    this.groups = await getSidebarConfig();

    this.setActiveGroup();
    router.afterEach(() => {
      this.setActiveGroup();
    });

    this.showDevMode = this.fyo.store.isDevelopment;
  },
  unmounted() {
    this.shortcuts?.delete(COMPONENT_NAME);
  },
  methods: {
    routeTo,
    toggleSidebar,
    setActiveGroup() {
      const { fullPath } = this.$router.currentRoute.value;
      const fallBackGroup = this.activeGroup;
      this.activeGroup =
        this.groups.find((g) => {
          if (fullPath.startsWith(g.route) && g.route !== '/') {
            return true;
          }

          if (g.route === fullPath) {
            return true;
          }

          if (g.items) {
            let activeItem = g.items.filter(
              ({ route }) => route === fullPath || fullPath.startsWith(route)
            );

            if (activeItem.length) {
              return true;
            }
          }
        }) ??
        fallBackGroup ??
        this.groups[0];
    },
    isItemActive(item: SidebarItem) {
      const { path: currentRoute, params } = this.$route;
      const routeMatch = currentRoute === item.route;

      const schemaNameMatch =
        item.schemaName && params.schemaName === item.schemaName;

      const isMatch = routeMatch || schemaNameMatch;
      if (params.name && item.schemaName && !isMatch) {
        return currentRoute.includes(`${item.schemaName}/${params.name}`);
      }

      return isMatch;
    },
    isGroupActive(group: SidebarRoot) {
      return this.activeGroup && group.label === this.activeGroup.label;
    },
    routeToSidebarItem(item: SidebarItem | SidebarRoot) {
      routeTo(this.getPath(item));
    },
    getPath(item: SidebarItem | SidebarRoot) {
      const { route: path, filters } = item;
      if (!filters) {
        return path;
      }

      return { path, query: { filters: JSON.stringify(filters) } };
    },
  },
});
</script>
