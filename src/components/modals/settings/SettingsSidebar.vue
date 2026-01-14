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
  background: #f9fafb;
  border-right: 1px solid #e5e7eb;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  overflow: auto;
}

.settings-nav-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.settings-nav-title {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.settings-nav-item {
  text-align: left;
  font-size: 13px;
  padding: 6px 8px;
  border-radius: 8px;
  color: #374151;
  transition: background 0.15s ease, color 0.15s ease;
}

.settings-nav-item:hover {
  background: #f3f4f6;
}

.settings-nav-item.is-active {
  background: #e5e7eb;
  color: #111827;
  font-weight: 600;
}

@media (max-width: 900px) {
  .settings-nav {
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
