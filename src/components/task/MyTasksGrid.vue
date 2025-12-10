<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { ChevronRight } from 'lucide-vue-next'
import Tag from 'primevue/tag'
import StatusEditorDropdown from '@/components/task/StatusEditorDropdown.vue'
import AssigneeEditorDropdown from '@/components/task/AssigneeEditorDropdown.vue'
import TaskTitleCell from '@/components/task/TaskTitleCell.vue'

const props = defineProps({
  tasks: {
    type: Array,
    default: () => []
  }
})

const fallbackTasks = [
  {
    title: 'Draft Desidia core frontend journey',
    dartboard: 'Product',
    status: 'In Progress',
    assignee: 'Hari W',
    tags: ['Product'],
    dueDate: '2025-12-17',
    children: [
      {
        title: 'Ideate key screens',
        dartboard: 'Design',
        status: 'To Do',
        assignee: 'Dart AI',
        tags: ['Design'],
        dueDate: '',
        children: [
          {
            title: 'Login & onboarding',
            dartboard: 'Design',
            status: 'To Do',
            assignee: 'Dart AI',
            tags: ['Design'],
            dueDate: '',
            children: [
              {
                title: 'Edge cases audit',
                dartboard: 'Product',
                status: 'Blocked',
                assignee: 'TestTask',
                tags: ['Product'],
                dueDate: ''
              }
            ]
          }
        ]
      }
    ]
  },
  {
    title: 'Create initial Desidia UI library',
    dartboard: 'Design',
    status: 'Done',
    assignee: 'studio@lomedia.no',
    tags: ['Design', 'Engineering'],
    dueDate: '2025-12-21',
    children: [
      {
        title: 'Buttons',
        dartboard: 'Engineering',
        status: 'In Progress',
        assignee: 'Erik Olsvik',
        tags: ['Engineering'],
        dueDate: '',
        children: [
          {
            title: 'States & interactions',
            dartboard: 'Engineering',
            status: 'To Do',
            assignee: 'Hari W',
            tags: ['Engineering'],
            dueDate: '',
            children: [
              {
                title: 'Accessibility sweep',
                dartboard: 'Engineering',
                status: 'To Do',
                assignee: 'Dart AI',
                tags: ['Engineering'],
                dueDate: ''
              }
            ]
          }
        ]
      }
    ]
  }
]

const treeNodes = ref([])
const expandedKeys = ref({})
const lastAddedKey = ref(null)
const focusKey = ref(null)

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function buildNodes(items = [], parentKey = '') {
  return items.map((item, index) => {
    const key = `${parentKey}${index}`
    const { children = [], ...data } = item
    return {
      key,
      data,
      children: buildNodes(children, `${key}-`)
    }
  })
}

function syncTree(source) {
  treeNodes.value = buildNodes(deepClone(source))
}

watch(
  () => props.tasks,
  (newVal) => {
    syncTree(newVal.length ? newVal : fallbackTasks)
  },
  { immediate: true, deep: true }
)

function findNodeByKey(nodes, key) {
  for (const n of nodes) {
    if (n.key === key) return n
    const found = findNodeByKey(n.children || [], key)
    if (found) return found
  }
  return null
}

function updateTitle(key, title) {
  const node = findNodeByKey(treeNodes.value, key)
  if (node) node.data.title = title
}

function addSubtask(key) {
  const node = findNodeByKey(treeNodes.value, key)
  if (!node) return
  if (!node.children) node.children = []
  const nextKey = `${key}-${node.children.length}`
  node.children.push({
    key: nextKey,
    data: {
      title: '',
      isNew: true,
      checked: true,
      dartboard: node.data.dartboard || 'Product',
      status: 'To Do',
      assignee: node.data.assignee || 'Unassigned',
      tags: node.data.tags || [],
      dueDate: ''
    },
    children: []
  })

  // Expand parent so the new child is visible
  expandedKeys.value = { ...expandedKeys.value, [key]: true }
  lastAddedKey.value = nextKey

  // Clear focus key first, then set it after DOM update to trigger the watch
  focusKey.value = null
  // Use nextTick + small timeout to ensure the new TaskTitleCell component is fully mounted
  nextTick(() => {
    setTimeout(() => {
      focusKey.value = nextKey
    }, 50)
  })

  setTimeout(() => {
    lastAddedKey.value = null
  }, 900)
}

function toggleRow(row) {
  const isExpanded = !!expandedKeys.value[row.key]
  if (!row.hasChildren) {
    addSubtask(row.key)
    expandedKeys.value = { ...expandedKeys.value, [row.key]: true }
    return
  }
  expandedKeys.value = { ...expandedKeys.value, [row.key]: !isExpanded }
}

function flattenVisible(nodes, level = 0) {
  const rows = []
  nodes.forEach((node) => {
    const hasChildren = node.children && node.children.length > 0
    rows.push({
      key: node.key,
      data: node.data,
      level,
      hasChildren,
      node
    })
    if (expandedKeys.value[node.key] && hasChildren) {
      rows.push(...flattenVisible(node.children, level + 1))
    }
  })
  return rows
}

const visibleRows = computed(() => flattenVisible(treeNodes.value))

function removeNodeByKey(nodes, key) {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    if (n.key === key) {
      nodes.splice(i, 1)
      return true
    }
    if (n.children && n.children.length) {
      const removed = removeNodeByKey(n.children, key)
      if (removed) {
        if (n.children.length === 0) n.hasChildren = false
        return true
      }
    }
  }
  return false
}

function handleCommit(key) {
  const node = findNodeByKey(treeNodes.value, key)
  if (!node) return
  const title = (node.data.title || '').trim()
  if (node.data.isNew && title === '' && (!node.children || node.children.length === 0)) {
    removeNodeByKey(treeNodes.value, key)
    delete expandedKeys.value[key]
  } else if (title !== '') {
    node.data.isNew = false
  }
}

function rowClass(row) {
  const classes = ['row-hoverable']
  if (row.hasChildren) {
    classes.push('row-has-children')
  } else {
    classes.push('row-no-children')
  }
  if (row.key === lastAddedKey.value) classes.push('row-flash')
  return classes.join(' ')
}

const resizeInfo = ref(null)
let resizeTimer = null

function handleColumnResize(event) {
  const width = event?.element?.offsetWidth || 0
  const headerText = event?.element?.innerText?.split('\n')[0]?.trim() || 'Column'
  resizeInfo.value = `${headerText}: ${Math.round(width)}px`
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    resizeInfo.value = null
  }, 1200)
}
</script>

<template>
      <div class="my-tasks-grid rounded-lg border border-gray-200 bg-white p-0 shadow-sm">
    <DataTable
      :value="visibleRows"
      class="w-full"
      scrollable
      scrollHeight="460px"
      resizableColumns
      columnResizeMode="expand"
      :rowHover="true"
      :rowClass="rowClass"
      @column-resize="handleColumnResize"
      :tableStyle="{ minWidth: '960px' }"
    >
      <Column header="" :style="{ width: '48px' }" frozen alignFrozen="left">
        <template #body="{ data }">
          <div class="flex items-center gap-1">
            <input type="checkbox" class="row-checkbox" :checked="!!data.data.checked" />
          </div>
        </template>
      </Column>

      <Column field="title" header="Title">
        <template #body="{ data }">
          <div class="flex items-center gap-2">
            <button
              class="expander-btn"
              :style="{ marginLeft: `${data.level * 12}px` }"
              :class="{
                'is-expanded': expandedKeys[data.key],
                'is-leaf': !data.hasChildren
              }"
              @click.stop="toggleRow(data)"
            >
              <ChevronRight class="w-3.5 h-3.5" />
            </button>
            <div class="flex-1">
              <TaskTitleCell
                :node="data.node"
                :focused-key="focusKey"
                @update:title="(val) => updateTitle(data.key, val)"
                @commit="() => handleCommit(data.key)"
              />
            </div>
          </div>
        </template>
      </Column>

      <Column field="dartboard" header="Dartboard">
        <template #body="{ data }">
          <span class="text-gray-700">{{ data.data.dartboard }}</span>
        </template>
      </Column>

      <Column field="status" header="Status">
        <template #body="{ data }">
          <StatusEditorDropdown :params="{ data: data.data, node: {}, api: { refreshCells: () => {} } }" />
        </template>
      </Column>

      <Column field="assignee" header="Assignee">
        <template #body="{ data }">
          <AssigneeEditorDropdown :params="{ data: data.data, node: {}, api: { refreshCells: () => {} } }" />
        </template>
      </Column>

      <Column field="tags" header="Tags">
        <template #body="{ data }">
          <div class="flex flex-wrap gap-1">
            <Tag
              v-for="tag in data.data.tags || []"
              :key="tag"
              :value="tag"
              severity="info"
              class="text-xs"
            />
          </div>
        </template>
      </Column>

      <Column field="dueDate" header="Due date">
        <template #body="{ data }">
          <span class="text-gray-700">{{ data.data.dueDate || '—' }}</span>
        </template>
      </Column>
    </DataTable>

    <transition name="fade">
      <div v-if="resizeInfo" class="resize-indicator">
        {{ resizeInfo }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.my-tasks-grid :deep(.p-datatable) {
  font-size: 12px;
  border-radius: 8px;
  position: relative;
}

.my-tasks-grid :deep(.p-datatable-thead > tr > th),
.my-tasks-grid :deep(.p-datatable-tbody > tr > td) {
  padding: 0.35rem 0.6rem;
}

.my-tasks-grid :deep(.p-datatable-tbody > tr) {
  transition: background-color 0.5s ease, transform 0.5s ease, opacity 0.5s ease;
  animation: rowExpand 0.5s ease;
}

.my-tasks-grid :deep(.p-datatable-thead > tr > th) {
  position: relative;
  border-right: 1px solid #e2e8f0;
}

.my-tasks-grid :deep(.p-datatable-thead > tr > th:last-child) {
  border-right: none;
}

.my-tasks-grid :deep(.p-datatable-thead > tr > th:first-child) {
  border-right: none;
}

.my-tasks-grid :deep(.p-resizable-column .p-column-resizer) {
  width: 10px;
  right: -5px;
  background: transparent;
  opacity: 1;
  cursor: col-resize;
}

.my-tasks-grid :deep(.p-resizable-column:hover) {
  background-color: rgba(148, 163, 184, 0.08);
}

.my-tasks-grid :deep(.p-column-resizer-helper) {
  border-color: #0ea5e9;
}

.resize-indicator {
  position: absolute;
  top: 8px;
  right: 12px;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(15, 118, 178, 0.08);
  color: #0f76b2;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid rgba(15, 118, 178, 0.2);
  pointer-events: none;
}

.row-flash {
  animation: rowFlash 0.8s ease, rowSlide 0.25s ease;
}

.my-tasks-grid :deep(.p-datatable-tbody > tr .row-checkbox) {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.my-tasks-grid :deep(.p-datatable-tbody > tr:hover .row-checkbox),
.my-tasks-grid :deep(.p-datatable-tbody > tr .row-checkbox:checked) {
  opacity: 1;
}

.my-tasks-grid :deep(.expander-btn) {
  border: none;
  background: transparent;
  color: #6b7280;
  opacity: 0.2;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.my-tasks-grid :deep(.expander-btn.is-expanded) {
  transform: rotate(90deg);
  opacity: 0.9;
}

.my-tasks-grid :deep(.row-has-children .expander-btn) {
  opacity: 1;
}

.my-tasks-grid :deep(tr:hover .expander-btn) {
  opacity: 1;
}

.my-tasks-grid :deep(.row-no-children .expander-btn) {
  opacity: 0;
  pointer-events: none;
}

.my-tasks-grid :deep(.row-no-children:hover .expander-btn) {
  opacity: 1;
  pointer-events: auto;
}

@keyframes rowFlash {
  0% {
    background-color: rgba(14, 165, 233, 0.15);
  }
  100% {
    background-color: transparent;
  }
}

@keyframes rowSlide {
  0% {
    transform: translateY(-6px);
    opacity: 0.6;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes rowExpand {
  0% {
    opacity: 0;
    transform: translateY(-4px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
