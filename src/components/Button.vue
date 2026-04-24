<template>
  <button
    class="rounded-md flex justify-center items-center text-sm"
    :disabled="disabled"
    :class="_class"
    :style="type === 'primary' && background ? 'background: var(--color-brand); color: #fff;' : ''"
    v-bind="$attrs"
  >
    <slot></slot>
  </button>
</template>
<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Button',
  props: {
    type: {
      type: String,
      default: 'secondary',
    },
    icon: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    padding: {
      type: Boolean,
      default: true,
    },
    background: {
      type: Boolean,
      default: true,
    },
  },
  computed: {
    _class() {
      return {
        'opacity-50 cursor-not-allowed pointer-events-none': this.disabled,
        'text-white': this.type === 'primary',
        'text-gray-700 dark:text-gray-200': this.type !== 'primary',
        'bg-gray-200 dark:bg-gray-900':
          this.type !== 'primary' && this.background,
        'h-8': this.background,
        'px-3': this.padding && this.icon,
        'px-6': this.padding && !this.icon,
      };
    },
  },
});
</script>
<style scoped>
button:focus {
  filter: brightness(0.95);
}
</style>
