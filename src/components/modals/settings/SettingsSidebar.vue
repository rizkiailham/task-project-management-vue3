<script setup>
/**
 * SettingsSidebar - Settings navigation list.
 */
const props = defineProps({
  groups: {
    type: Array,
    default: () => []
  },
  activeSection: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['select'])

function selectSection(sectionId) {
  emit('select', sectionId)
}
</script>

<template>
  <aside class="settings-nav">
    <div
      v-for="group in groups"
      :key="group.title"
      class="settings-nav-group"
    >
      <div class="settings-nav-title">{{ group.title }}</div>
      <button
        v-for="item in group.items"
        :key="item.id"
        type="button"
        class="settings-nav-item"
        :class="{ 'is-active': activeSection === item.id }"
        @click="selectSection(item.id)"
      >
        {{ item.label }}
      </button>
    </div>
  </aside>
</template>

<style scoped>
.settings-nav {
  background: #f3f4f6;
  border-right: 1px solid #f3f4f6;
  padding: 20px 10px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  overflow: auto;
  box-sizing: border-box;
  padding-bottom: calc(20px + var(--settings-footer-height, 56px));
  position: relative;
}

.settings-nav::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--settings-footer-height, 56px);
  background: #f3f4f6;
  pointer-events: none;
}

.settings-nav-group {
  display: flex;
  flex-direction: column;
}

.settings-nav-title {
  font-size: 12px;
  font-weight: 600;
  padding: 0 10px;
  margin-bottom: 6px;
  color: #9CA3af;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.settings-nav-item {
  text-align: left;
  font-size: 13px;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  color: #374151;
  transition: background 0.15s ease, color 0.15s ease;
}

.settings-nav-item:hover {
  background: #f3f4f6;
}

.settings-nav-item.is-active {
  background: #e5e7eb;
}

@media (max-width: 900px) {
  .settings-nav {
    border-right: none;
    border-bottom: 1px solid #f3f4f6;
    flex-direction: row;
    flex-wrap: wrap;
    padding-bottom: 20px;
  }
}
</style>
