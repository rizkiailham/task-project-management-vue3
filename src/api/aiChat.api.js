/**
 * Desidia v2 - AI Chat API
 */
import { get, post } from './httpClient'

export async function listConversations() {
  return get('/ai/conversations')
}

export async function getConversation(conversationId) {
  return get(`/ai/conversations/${conversationId}`)
}

export async function createConversation(payload = {}) {
  return post('/ai/conversations', payload)
}

export async function sendChatMessage(payload) {
  return post('/ai/chat', payload)
}

export default {
  listConversations,
  getConversation,
  createConversation,
  sendChatMessage
}
