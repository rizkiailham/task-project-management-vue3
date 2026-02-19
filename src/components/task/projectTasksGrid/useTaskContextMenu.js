import { Repeat } from 'lucide-vue-next'

export function useTaskContextMenu(t, options = {}) {
  const {
    onOpenTask,
    onAddSubtask,
    onSetReminder
  } = options

  function handleOpenTask(task) {
    if (typeof onOpenTask === 'function') {
      onOpenTask(task)
      return
    }
    console.log('Open task', task)
  }

  function handleAddSubtask(task) {
    if (typeof onAddSubtask === 'function') {
      onAddSubtask(task)
    }
  }

  function handleSetReminder(task) {
    if (typeof onSetReminder === 'function') {
      onSetReminder(task)
    }
  }

  function getMenuItems(task) {
    if (!task) return []

    return [
      {
        label: t('tasks.context.open', 'Open task'),
        action: () => handleOpenTask(task)
      },
      { type: 'divider' },
      {
        label: t('tasks.context.changeTask', 'Change task'),
        items: [
          { label: 'Change board', action: () => { } },
          { label: 'Start timer', action: () => { } },
          { label: 'Change status', action: () => { } },
          { label: 'Change assignees', action: () => { } },
          { label: 'Change tags', action: () => { } },
          { label: 'Change subscriber', action: () => { } },
        ]
      },
      {
        label: t('tasks.context.connect', 'Connect a task, doc, and more'),
        items: [
          { label: 'Add subtask', action: () => handleAddSubtask(task) },
          { label: 'Set existing subtask', action: () => { } },
          { label: 'Set parent', action: () => { } },
          { type: 'divider' },
          { label: 'Mark duplicated', action: () => { } },
          { label: 'Merge into another task', action: () => { } },
          { label: 'Reference another task', action: () => { } },
          { type: 'divider' },
          { label: 'Link a folder', action: () => { } },
          { label: 'Add attachment', action: () => { } },
          { label: 'Add link', action: () => { } },
        ]
      },
      {
        label: t('tasks.context.addSubtask', 'Add subtask'),
        action: () => handleAddSubtask(task)
      },
      {
        label: t('tasks.context.addAttachment', 'Add attachment'),
        action: () => { }
      },
      {
        label: t('tasks.context.setRecurrence', 'Set recurrence'),
        items: [
          {
            type: 'header',
            label: t('tasks.context.setRecurrence', 'Set repetition'),
            icon: Repeat
          },
          { label: 'Daily', class: 'block w-full text-left px-3 py-2 m-1 mb-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500', action: () => { } },
          { label: 'Every Monday', class: 'block w-full text-left px-3 py-2 m-1 mb-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500', action: () => { } },
          { label: 'Every weekday', class: 'block w-full text-left px-3 py-2 m-1 mb-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500', action: () => { } },
          { label: 'Monthly on the 12th', class: 'block w-full text-left px-3 py-2 m-1 mb-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500', action: () => { } },
          { label: 'Yearly on Jan 12th', class: 'block w-full text-left px-3 py-2 m-1 mb-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500', action: () => { } },
          { label: 'Custom', class: 'block w-full text-left px-3 py-2 m-1 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500', action: () => { } },
        ]
      },
      {
        key: 'setReminder',
        label: t('tasks.context.setReminder', 'Set reminder'),
        closeOnSelect: false,
        action: () => handleSetReminder(task)
      },
      {
        label: t('tasks.context.unsubscribe', 'Unsubscribe'),
        action: () => { }
      },
      {
        label: t('tasks.context.archive', 'Move to archive board'),
        action: () => { }
      },
      { type: 'divider' },
      {
        label: t('tasks.context.copyLink', 'Copy task link'),
        action: () => { }
      },
      {
        label: t('tasks.context.copyEmail', 'Copy task email'),
        action: () => { }
      },
      { type: 'divider' },
      {
        label: t('tasks.context.export', 'Export as'),
        items: [
          { label: 'PDF', action: () => { } },
          { label: 'HTML', action: () => { } },
          { label: 'Markdown', action: () => { } },
        ]
      },
      {
        label: t('tasks.context.replicate', 'Replicate'),
        action: () => { }
      },
      {
        label: t('common.delete', 'Delete'),
        action: () => { } // Confirm delete
      }
    ]
  }

  return {
    getMenuItems
  }
}
