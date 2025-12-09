<script setup>
/**
 * SettingsView - Settings container with tabs
 */
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

// PrimeVue
import TabMenu from 'primevue/tabmenu'

const router = useRouter()
const route = useRoute()

const tabs = [
  { label: 'Profile', icon: 'pi pi-user', route: 'SettingsProfile' },
  { label: 'Account', icon: 'pi pi-cog', route: 'SettingsAccount' },
  { label: 'Notifications', icon: 'pi pi-bell', route: 'SettingsNotifications' }
]

const activeIndex = computed(() => {
  const index = tabs.findIndex(tab => tab.route === route.name)
  return index >= 0 ? index : 0
})

function onTabChange(event) {
  router.push({ name: tabs[event.index].route })
}
</script>

<template>
  <div class="p-6 lg:p-8">
    <h1 class="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
    
    <TabMenu 
      :model="tabs" 
      :activeIndex="activeIndex"
      @tab-change="onTabChange"
      class="mb-6"
    />
    
    <RouterView />
  </div>
</template>

