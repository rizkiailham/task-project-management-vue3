<script setup>
/**
 * NotFoundView - 404 page
 */
import { useRouter } from 'vue-router'
import Button from 'primevue/button'

const router = useRouter()

function goHome() {
  router.push({ name: 'Home' })
}

function goBack() {
  router.back()
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
    <div class="text-center">
      <h1 class="text-9xl font-bold text-primary-600">404</h1>
      <h2 class="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">
        Page Not Found
      </h2>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        Sorry, we couldn't find the page you're looking for.
      </p>
      <div class="mt-8 flex items-center justify-center gap-4">
        <Button 
          label="Go Back" 
          outlined
          @click="goBack"
        />
        <Button 
          label="Go Home" 
          @click="goHome"
        />
      </div>
    </div>
  </div>
</template>

