import { ref, computed } from 'vue'
import {
  Copy, Trash2, Edit2, Link, Download, Archive,
  Calendar, Clock, Bell, UserPlus, Tag, Share2,
  CornerUpRight, FileText, FolderPlus, Repeat,
  CheckCircle2, ArrowRightCircle
} from 'lucide-vue-next'

export function useTaskContextMenu(t) {
  function getMenuItems(task) {
    if (!task) return []

    return [
      {
        label: t('tasks.context.open', 'Open task'),
        icon: CornerUpRight,
        action: () => console.log('Open task', task)
      },
      { type: 'divider' },
      {
        label: t('tasks.context.changeTask', 'Change task'),
        icon: Edit2,
        children: [
          { label: 'Change board', action: () => { } },
          { label: 'Start timer', icon: Clock, action: () => { } },
          { label: 'Change status', icon: CheckCircle2, action: () => { } },
          { label: 'Change assignees', icon: UserPlus, action: () => { } },
          { label: 'Change tags', icon: Tag, action: () => { } },
          { label: 'Change subscriber', icon: Bell, action: () => { } },
        ]
      },
      {
        label: t('tasks.context.connect', 'Connect a task, doc, and more'),
        icon: Link,
        children: [
          { label: 'Add subtask', action: () => { } },
          { label: 'Set existing subtask', action: () => { } },
          { label: 'Set parent', action: () => { } },
          { type: 'divider' },
          { label: 'Mark duplicated', action: () => { } },
          { label: 'Merge into another task', action: () => { } },
          { label: 'Reference another task', action: () => { } },
          { type: 'divider' },
          { label: 'Link a folder', icon: FolderPlus, action: () => { } },
          { label: 'Add attachment', action: () => { } },
          { label: 'Add link', action: () => { } },
        ]
      },
      {
        label: t('tasks.context.addSubtask', 'Add subtask'),
        action: () => { }
      },
      {
        label: t('tasks.context.addAttachment', 'Add attachment'),
        action: () => { }
      },
      {
        label: t('tasks.context.setRecurrence', 'Set recurrence'),
        icon: Repeat,
        children: [
          { label: 'Daily', action: () => { } },
          { label: 'Every Monday', action: () => { } },
          { label: 'Every weekday', action: () => { } },
          { label: 'Monthly on the 12th', action: () => { } },
          { label: 'Yearly on Jan 12th', action: () => { } },
          { label: 'Custom', action: () => { } },
        ]
      },
      {
        label: t('tasks.context.setReminder', 'Set reminder'),
        icon: Bell,
        children: [] // Calendar picker placeholder?
      },
      {
        label: t('tasks.context.unsubscribe', 'Unsubscribe'),
        icon: Bell, // Strikethrough?
        action: () => { }
      },
      {
        label: t('tasks.context.archive', 'Move to archive board'),
        icon: Archive,
        action: () => { }
      },
      { type: 'divider' },
      {
        label: t('tasks.context.copyLink', 'Copy task link'),
        icon: Link,
        action: () => { }
      },
      {
        label: t('tasks.context.copyEmail', 'Copy task email'),
        action: () => { }
      },
      { type: 'divider' },
      {
        label: t('tasks.context.export', 'Export as'),
        icon: Download,
        children: [
          { label: 'PDF', action: () => { } },
          { label: 'HTML', action: () => { } },
          { label: 'Markdown', action: () => { } },
        ]
      },
      {
        label: t('tasks.context.replicate', 'Replicate'),
        icon: Copy,
        action: () => { }
      },
      {
        label: t('common.delete', 'Delete'),
        icon: Trash2,
        action: () => { }, // Confirm delete
        class: 'text-red-600'
      }
    ]
  }

  return {
    getMenuItems
  }
}
