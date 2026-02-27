<script setup>
import { computed } from 'vue'
import PropertyMultiselectCell from '@/components/task/cells/PropertyMultiselectCell.vue'

const props = defineProps({
  params: {
    type: Object,
    required: true
  }
})

const normalizedParams = computed(() => {
  const input = props.params || {}
  const colDef = input.colDef || {}
  const rendererParams = colDef.cellRendererParams || input.cellRendererParams || {}
  const fieldKey = String(rendererParams.fieldKey || colDef.field || 'tags').trim() || 'tags'
  const sourceKey = String(colDef.sourceKey || fieldKey).trim() || 'tags'
  return {
    ...input,
    colDef: {
      ...colDef,
      propertyId: colDef.propertyId || fieldKey,
      propertyKey: colDef.propertyKey || fieldKey,
      sourceKey
    }
  }
})
</script>

<template>
  <PropertyMultiselectCell :params="normalizedParams" />
</template>
