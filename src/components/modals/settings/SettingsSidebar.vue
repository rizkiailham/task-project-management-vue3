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
      <div class="settings-nav-title-row">
        <div class="settings-nav-title">{{ group.title }}</div>
        <button 
          v-if="group.action"
          type="button" 
          class="settings-nav-action"
          @click="group.action.handler"
        >
          <component :is="group.action.icon" class="w-3.5 h-3.5" />
        </button>
      </div>
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
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  overflow: auto;
  box-sizing: border-box;
  position: relative;
}

.settings-nav-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex-shrink: 0;
}

.settings-nav-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 10px;
}

.settings-nav-title {
  font-size: 12px;
  font-weight: var(--font-weight-medium);
  padding: 0 10px;
  color: var(--color-gray-400);
  text-transform: uppercase;
}

.settings-nav-action {
  color: var(--color-gray-400);
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.settings-nav-action:hover {
  background: #e5e7eb;
  color: var(--color-gray-700);
}

.settings-nav-item {
  text-align: left;
  font-size: 14px;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  color: var(--color-gray-700);
  transition: background 0.15s ease, color 0.15s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  width: 100%;
  margin: 0;
  line-height: 28px;
}

.settings-nav-item:hover {
  background: #e5e7eb;
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




