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
          ...['Daily', 'Every Monday', 'Every weekday', 'Monthly on the 12th', 'Yearly on Jan 12th', 'Custom'].map(label => ({
            label,
            class: 'recurrence-card-item',
            action: () => { }
          }))
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
