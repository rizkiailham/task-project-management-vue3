<script setup>
import { computed } from 'vue'
import PropertyDateCell from '@/components/task/cells/PropertyDateCell.vue'

const props = defineProps({
  params: {
    type: Object,
    required: true
  }
})

const normalizedParams = computed(() => {
  const input = props.params || {}
  const colDef = input.colDef || {}
  return {
    ...input,
    colDef: {
      ...colDef,
      colId: colDef.colId || 'dueDate',
      field: colDef.field || 'dueDate',
      propertyId: colDef.propertyId || 'due_date',
      propertyKey: colDef.propertyKey || 'due_date',
      sourceKey: colDef.sourceKey || 'due_date'
    }
  }
})
</script>

<template>
  <PropertyDateCell :params="normalizedParams" />
</template>
