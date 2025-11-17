/**
 * Group Chat API Service
 * 
 * Provides methods to interact with Group Message API endpoints.
 * All methods require JWT authentication.
 * 
 * Backend: /api/groupmessage
 * Features: Send, receive, read receipts, reactions, threads
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, getAuthHeaders, refreshToken } from '../API/Api';
import signalRService from './signalRService';

// Pending outbox storage key
const PENDING_OUTBOX_KEY = 'pending_group_outbox_v1';

// Helper: read pending outbox (array)
const _readPendingOutbox = async () => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_OUTBOX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) || [];
  } catch (e) {
    console.error('[GroupChatService] _readPendingOutbox error', e);
    return [];
  }
};

// Helper: write pending outbox
const _writePendingOutbox = async (arr) => {
  try {
    await AsyncStorage.setItem(PENDING_OUTBOX_KEY, JSON.stringify(arr || []));
  } catch (e) {
    console.error('[GroupChatService] _writePendingOutbox error', e);
  }
};

// Enqueue pending message (idempotent by clientTempId)
const _enqueuePendingMessage = async (item) => {
  try {
    const list = await _readPendingOutbox();
    // dedupe by clientTempId if provided
    if (item.clientTempId) {
      const exists = list.find(x => x.clientTempId === item.clientTempId);
      if (exists) return;
    }
    list.push(item);
    await _writePendingOutbox(list);
  } catch (e) {
    console.error('[GroupChatService] _enqueuePendingMessage error', e);
  }
};

// Remove pending message by clientTempId
const _removePendingByClientTempId = async (clientTempId) => {
  try {
    if (!clientTempId) return;
    const list = await _readPendingOutbox();
    const filtered = list.filter(x => x.clientTempId !== clientTempId);
    await _writePendingOutbox(filtered);
  } catch (e) {
    console.error('[GroupChatService] _removePendingByClientTempId error', e);
  }
};

// Flush pending outbox: try SignalR first, fallback to REST sendMessage
export const flushPendingOutbox = async (opts = { stopOnError: false }) => {
  try {
    const list = await _readPendingOutbox();
    if (!list || list.length === 0) return { flushed: 0 };

    let flushed = 0;
    for (const item of list) {
      const { conversationId, messageData, clientTempId } = item;
      try {
        // Try SignalR send if connected
        try {
          await signalRService.sendMessage(conversationId, messageData);
          await _removePendingByClientTempId(clientTempId);
          flushed += 1;
          continue; // next item
        } catch (srErr) {
          console.warn('[GroupChatService] SignalR send failed for pending, falling back to REST', srErr?.message || srErr);
        }

        // Fallback: REST send (idempotent if server honors ClientTempId)
        try {
          // messageData may already contain ClientTempId
          const restResult = await sendMessage(
            conversationId,
            messageData.Content || '',
            messageData.MessageType || 'text',
            messageData.FileUrl || null,
            messageData.ReplyToMessageId || null,
            clientTempId || messageData.ClientTempId || null
          );
          // If REST succeeded, remove from pending
          await _removePendingByClientTempId(clientTempId);
          flushed += 1;
        } catch (restErr) {
          console.error('[GroupChatService] REST send failed for pending item', restErr);
          if (opts.stopOnError) break;
          // otherwise continue to next item (leave in queue)
        }
      } catch (e) {
        console.error('[GroupChatService] Error flushing pending item', e);
        if (opts.stopOnError) break;
      }
    }

    return { flushed };
  } catch (e) {
    console.error('[GroupChatService] flushPendingOutbox error', e);
    return { flushed: 0, error: e };
  }
};

// Register automatic flush after reconnect
try {
  if (signalRService && typeof signalRService.onReconnected === 'function') {
    signalRService.onReconnected(async () => {
      console.log('[GroupChatService] SignalR reconnected — flushing pending outbox');
      try { await flushPendingOutbox({ stopOnError: false }); } catch (e) { console.error(e); }
    });
  }
} catch (e) {
  // ignore if signalRService doesn't support onReconnected
}

/**
 * Queue an optimistic message for durability. Called by UI when adding optimistic message to state.
 * Optimistic object should contain an `id` or `tempId` to act as clientTempId.
 */
export const queuePendingMessage = async (conversationId, optimisticMessage) => {
  try {
    const clientTempId = optimisticMessage.id || optimisticMessage.tempId || `${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
    const messageData = {
      Content: optimisticMessage.message || optimisticMessage.content || '',
      MessageType: optimisticMessage.messageType || (optimisticMessage.mediaType ? optimisticMessage.mediaType : 'text'),
      FileUrl: optimisticMessage.mediaUri || optimisticMessage.fileUrl || null,
      ReplyToMessageId: optimisticMessage.replyTo?.id || optimisticMessage.replyTo?.messageId || null,
      ClientTempId: clientTempId
    };
    await _enqueuePendingMessage({ conversationId, messageData, clientTempId });
  } catch (e) {
    console.error('[GroupChatService] queuePendingMessage error', e);
  }
};

/**
 * Get pending messages (optionally filter by conversationId)
 */
export const getPendingMessages = async (conversationId = null) => {
  try {
    const list = await _readPendingOutbox();
    if (conversationId == null) return list;
    return list.filter(i => String(i.conversationId) === String(conversationId));
  } catch (e) {
    console.error('[GroupChatService] getPendingMessages error', e);
    return [];
  }
};

/**
 * Remove pending message by conversationId + clientTempId
 */
export const removePendingMessage = async (conversationId, clientTempId) => {
  try {
    // currently we remove by clientTempId globally
    await _removePendingByClientTempId(clientTempId);
  } catch (e) {
    console.error('[GroupChatService] removePendingMessage error', e);
  }
};

/**
 * Flush pending messages for a specific conversation (or all if conversationId omitted)
 */
export const flushPendingMessages = async (conversationId = null) => {
  try {
    const list = await _readPendingOutbox();
    const toFlush = conversationId == null ? list : list.filter(i => String(i.conversationId) === String(conversationId));
    if (!toFlush || toFlush.length === 0) return { flushed: 0 };

    let flushed = 0;
    for (const item of toFlush) {
      try {
        // Try SignalR
        try {
          await signalRService.sendMessage(item.conversationId, item.messageData);
          await _removePendingByClientTempId(item.clientTempId);
          flushed += 1;
          continue;
        } catch (srErr) {
          console.warn('[GroupChatService] flushPendingMessages SignalR send failed', srErr?.message || srErr);
        }

        // Fallback REST
        try {
          await sendMessage(
            item.conversationId,
            item.messageData.Content || '',
            item.messageData.MessageType || 'text',
            item.messageData.FileUrl || null,
            item.messageData.ReplyToMessageId || null,
            item.clientTempId
          );
          await _removePendingByClientTempId(item.clientTempId);
          flushed += 1;
        } catch (restErr) {
          console.error('[GroupChatService] flushPendingMessages REST fallback failed', restErr);
        }
      } catch (e) {
        console.error('[GroupChatService] flushPendingMessages item error', e);
      }
    }

    return { flushed };
  } catch (e) {
    console.error('[GroupChatService] flushPendingMessages error', e);
    return { flushed: 0, error: e };
  }
};

/**
 * Get JWT token from AsyncStorage
 * @returns {Promise<string|null>} JWT token or null
 */
const getAuthToken = async () => {
  try {
    // ✅ FIX: Token key is 'accessToken' not 'token'
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      console.warn('[GroupChatService] No access token found in AsyncStorage');
    }
    return token;
  } catch (error) {
    console.error('[GroupChatService] Get token error:', error);
    return null;
  }
};
// Remove a member from group
export const removeGroupMember = async (conversationId, userId) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/groupchat/${conversationId}/members/${userId}`, {
    method: 'DELETE',
    headers: { ...headers, Accept: 'application/json' },
  });

  const text = await response.text();
  let result = null; try { result = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) {
    throw new Error(result?.message || `HTTP error! status: ${response.status}`);
  }
  return result;
};

// Current user leaves the group (self removal)
export const leaveGroup = async (conversationId) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/groupchat/${conversationId}/leave`, {
    method: 'POST',
    headers: { ...headers, Accept: 'application/json' },
  });

  const text = await response.text();
  let result = null; try { result = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) {
    throw new Error(result?.message || `HTTP error! status: ${response.status}`);
  }
  return result;
};

// Change member role (promote/demote). request: { role: 'admin', transferOwnership: true }
export const changeMemberRole = async (conversationId, userId, role, transferOwnership = false) => {
  const headers = await getAuthHeaders();
  const body = { role, transferOwnership };
  const response = await fetch(`${API_BASE_URL}/api/groupchat/${conversationId}/members/${userId}/role`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let result = null; try { result = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) {
    throw new Error(result?.message || `HTTP error! status: ${response.status}`);
  }
  return result;
};

/**
 * Get paginated messages for a group conversation
 * @param {number} conversationId - Group conversation ID
 * @param {number} page - Page number (1-indexed)
 * @param {number} pageSize - Number of messages per page
 * @returns {Promise<{messages: Array, totalCount: number, page: number, pageSize: number, hasMore: boolean}>}
 */
export const getMessages = async (conversationId, page = 1, pageSize = 50) => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  console.log(`[GroupChatService] GET /api/groupmessage/${conversationId}?page=${page}&pageSize=${pageSize}`);

  const response = await fetch(
    `${API_BASE_URL}/api/groupmessage/${conversationId}?page=${page}&pageSize=${pageSize}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GroupChatService] Get messages error:', response.status, errorText);
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  
  // ✅ FIX: Backend returns {success: true, data: {messages, totalCount, ...}}
  // Extract the actual data
  const data = result.data || result;
  
  console.log(`[GroupChatService] Loaded ${data.messages?.length || 0} messages (total: ${data.totalCount}, hasMore: ${data.hasMore})`);
  
  return data;
};

/**
 * Send a new message to a group
 * @param {number} conversationId - Group conversation ID
 * @param {string} content - Message content
 * @param {string} messageType - Message type: 'text', 'image', 'video'
 * @param {string|null} fileUrl - Media URL (for image/video messages)
 * @param {number|null} replyToMessageId - Parent message ID (for replies/threads)
 * @returns {Promise<Object>} Saved message object with DB-generated ID
 */
export const sendMessage = async (
  conversationId,
  content,
  messageType = 'text',
  fileUrl = null,
  replyToMessageId = null,
  clientTempId = null
) => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const requestBody = {
    ConversationId: conversationId,
    Content: content || '',
    MessageType: messageType,
    FileUrl: fileUrl,
    ReplyToMessageId: replyToMessageId,
    ClientTempId: clientTempId
  };

  console.log('[GroupChatService] POST /api/groupmessage/send', requestBody);

  const response = await fetch(
    `${API_BASE_URL}/api/groupmessage/send`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GroupChatService] Send message error:', response.status, errorText);
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  
  // ✅ FIX: Backend returns {success: true, message: "...", data: messageObject}
  const message = result.data || result.message || result;
  
  console.log('[GroupChatService] Message sent:', message);
  
  return message;
};

/**
 * Mark a message as read
 * @param {number} messageId - Message ID to mark as read
 * @returns {Promise<void>}
 */
export const markMessageAsRead = async (messageId) => {
  let token = await getAuthToken();
  if (!token) throw new Error('No authentication token found');

  console.log(`[GroupChatService] PUT /api/groupmessage/${messageId}/read`);

  const doRequest = async (bearer) => {
    return await fetch(`${API_BASE_URL}/api/groupmessage/${messageId}/read`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${bearer}`,
      },
    });
  };

  let response = await doRequest(token);

  // If unauthorized, attempt a single refresh + retry
  if (response.status === 401) {
    console.warn('[GroupChatService] Received 401, attempting refresh token and retry');
    try {
      await refreshToken();
      token = await getAuthToken();
      if (!token) throw new Error('No access token after refresh');
      response = await doRequest(token);
    } catch (rfErr) {
      const errText = await response.text().catch(() => '');
      console.error('[GroupChatService] Mark as read after refresh failed', rfErr, errText);
      throw new Error(`HTTP 401: ${errText}`);
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GroupChatService] Mark as read error:', response.status, errorText);
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  console.log(`[GroupChatService] Message ${messageId} marked as read`);
};

/**
 * Add a reaction to a message
 * @param {number} messageId - Message ID
 * @param {string} emoji - Emoji reaction (e.g. "❤️", "👍", "😂")
 * @returns {Promise<Object>} Updated message object with reactions
 */
export const addReaction = async (messageId, emoji) => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  console.log(`[GroupChatService] POST /api/groupmessage/${messageId}/reaction`, { emoji });

  const response = await fetch(
    `${API_BASE_URL}/api/groupmessage/${messageId}/reaction`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ emoji })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GroupChatService] Add reaction error:', response.status, errorText);
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  
  // ✅ FIX: Backend returns {success: true, data: messageObject}
  const message = result.data || result.message || result;
  
  console.log('[GroupChatService] Reaction added:', message);
  
  return message;
};

/**
 * Remove a reaction from a message
 * @param {number} messageId - Message ID
 * @param {string} emoji - Emoji reaction to remove
 * @returns {Promise<Object>} Updated message object without the reaction
 */
export const removeReaction = async (messageId, emoji) => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  console.log(`[GroupChatService] DELETE /api/groupmessage/${messageId}/reaction`, { emoji });

  const response = await fetch(
    `${API_BASE_URL}/api/groupmessage/${messageId}/reaction`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ emoji })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GroupChatService] Remove reaction error:', response.status, errorText);
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  
  // ✅ FIX: Backend returns {success: true, data: messageObject}
  const message = result.data || result.message || result;
  
  console.log('[GroupChatService] Reaction removed:', message);
  
  return message;
};

/**
 * Get all replies in a thread (all messages replying to a parent message)
 * @param {number} parentMessageId - Parent message ID
 * @returns {Promise<Array>} Array of reply messages
 */
export const getThreadMessages = async (parentMessageId) => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  console.log(`[GroupChatService] GET /api/groupmessage/${parentMessageId}/thread`);

  const response = await fetch(
    `${API_BASE_URL}/api/groupmessage/${parentMessageId}/thread`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GroupChatService] Get thread error:', response.status, errorText);
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  console.log(`[GroupChatService] Loaded thread with ${result.messages.length} replies`);
  
  return result.messages;
};

/**
 * Delete a message (soft delete, sets is_deleted = true)
 * @param {number} messageId - Message ID to delete
 * @returns {Promise<void>}
 */
export const deleteMessage = async (messageId) => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  console.log(`[GroupChatService] DELETE /api/groupmessage/${messageId}`);

  const response = await fetch(
    `${API_BASE_URL}/api/groupmessage/${messageId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GroupChatService] Delete message error:', response.status, errorText);
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  console.log(`[GroupChatService] Message ${messageId} deleted`);
};

/**
 * Pin a message in a group
 * POST /api/groupmessage/{conversationId}/pin/{messageId}
 */
export const pinMessage = async (conversationId, messageId) => {
  const token = await getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(
    `${API_BASE_URL}/api/groupmessage/${conversationId}/pin/${messageId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  return result.data || result;
};

/**
 * Unpin a message in a group
 * DELETE /api/groupmessage/{conversationId}/pin/{messageId}
 */
export const unpinMessage = async (conversationId, messageId) => {
  const token = await getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(
    `${API_BASE_URL}/api/groupmessage/${conversationId}/pin/${messageId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  return result.success;
};

/**
 * Get pinned messages for a group
 * GET /api/groupmessage/{conversationId}/pinned
 */
export const getPinnedMessages = async (conversationId) => {
  const token = await getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(
    `${API_BASE_URL}/api/groupmessage/${conversationId}/pinned`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  return result.data || result;
};

/**
 * Delete a group conversation (only allowed for group creator/admin)
 * DELETE /api/groupchat/{conversationId}
 */
export const deleteGroup = async (conversationId) => {
  const token = await getAuthToken();
  if (!token) throw new Error('No authentication token found');

  console.log(`[GroupChatService] DELETE /api/groupchat/${conversationId}`);

  const response = await fetch(
    `${API_BASE_URL}/api/groupchat/${conversationId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GroupChatService] Delete group error:', response.status, errorText);
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  return result;
};

/**
 * Purge local cached messages that are not persisted in the database.
 * Reads AsyncStorage key `group_messages_{conversationId}`, fetches all
 * persisted message IDs from the backend (paginated), removes any local
 * messages whose id is not present on the server, writes the cleaned array
 * back to AsyncStorage and returns summary info.
 *
 * @param {number} conversationId
 * @returns {Promise<{removed: number, remaining: number}>}
 */
export const purgeLocalUnsavedMessages = async (conversationId) => {
  if (!conversationId && conversationId !== 0) return { removed: 0, remaining: 0 };
  try {
    const storageKey = `group_messages_${conversationId}`;
    const saved = await AsyncStorage.getItem(storageKey);
    if (!saved) return { removed: 0, remaining: 0 };

    let localMessages = [];
    try {
      localMessages = JSON.parse(saved) || [];
    } catch (e) {
      console.warn('[GroupChatService] Failed to parse local messages JSON, clearing key', e);
      await AsyncStorage.removeItem(storageKey);
      return { removed: 0, remaining: 0 };
    }

    // Fetch all persisted message IDs from server using paginated getMessages
    const serverIds = new Set();
    let page = 1;
    const pageSize = 500;
    while (true) {
      const data = await getMessages(conversationId, page, pageSize);
      const msgs = data.messages || [];
      msgs.forEach(m => {
        const id = m.messageId || m.MessageId || m.id || m.MessageId || m.messageId;
        if (id != null) serverIds.add(String(id));
      });
      if (!data.hasMore) break;
      page += 1;
    }

    // Filter local messages: keep only those that exist on server
    const filtered = localMessages.filter(m => {
      const localId = m.id || m.messageId || m.MessageId;
      if (localId == null) return false;
      return serverIds.has(String(localId));
    });

    const removed = localMessages.length - filtered.length;

    if (filtered.length === 0) {
      // Remove storage key entirely if nothing remains
      await AsyncStorage.removeItem(storageKey);
    } else {
      await AsyncStorage.setItem(storageKey, JSON.stringify(filtered));
    }

    return { removed, remaining: filtered.length };
  } catch (error) {
    console.error('[GroupChatService] purgeLocalUnsavedMessages error:', error);
    throw error;
  }
};

/**
 * Export all methods
 */
// ---------- Realtime wrappers (delegate to transport) ----------
export const connectRealtime = async () => {
  return await signalRService.connectToChat();
};

export const joinRealtimeGroup = async (conversationId) => {
  return await signalRService.joinGroup(conversationId);
};

export const leaveRealtimeGroup = async (conversationId) => {
  return await signalRService.leaveGroup(conversationId);
};

/**
 * Durable send via realtime with fallback.
 * messageData should include a `ClientTempId` or caller should pass `clientTempId` in the queue item.
 */
export const sendMessageRealtime = async (conversationId, messageData) => {
  // Ensure we have a clientTempId to dedupe
  const clientTempId = messageData.ClientTempId || messageData.clientTempId || `${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
  const pendingItem = { conversationId, messageData: { ...messageData, ClientTempId: clientTempId }, clientTempId };

  // Persist to outbox before attempting network send
  await _enqueuePendingMessage(pendingItem);

  // Try SignalR first
  try {
    await signalRService.sendMessage(conversationId, pendingItem.messageData);
    // On success, remove from outbox
    await _removePendingByClientTempId(clientTempId);
    return { status: 'sent-via-signalr', clientTempId };
  } catch (srErr) {
    console.warn('[GroupChatService] sendMessageRealtime: SignalR send failed, falling back to REST', srErr?.message || srErr);
    // Fallback to REST send which accepts ClientTempId for idempotency
    try {
      const saved = await sendMessage(
        conversationId,
        pendingItem.messageData.Content || '',
        pendingItem.messageData.MessageType || 'text',
        pendingItem.messageData.FileUrl || null,
        pendingItem.messageData.ReplyToMessageId || null,
        clientTempId
      );
      // Remove from outbox
      await _removePendingByClientTempId(clientTempId);
      return { status: 'sent-via-rest', clientTempId, saved };
    } catch (restErr) {
      console.error('[GroupChatService] sendMessageRealtime: REST fallback failed', restErr);
      // Leave in outbox for later retry
      return { status: 'queued', clientTempId, error: restErr };
    }
  }
};

export const markMessageAsReadRealtime = async (conversationId, messageId) => {
  return await signalRService.markMessageAsRead(conversationId, messageId);
};

export const reactToMessageRealtime = async (conversationId, messageId, emoji) => {
  return await signalRService.reactToMessage(conversationId, messageId, emoji);
};

export const pinMessageRealtime = async (conversationId, messageId, messageData) => {
  return await signalRService.pinMessage(conversationId, messageId, messageData);
};

export const unpinMessageRealtime = async (conversationId, messageId) => {
  return await signalRService.unpinMessage(conversationId, messageId);
};

export const onReceiveMessageRealtime = (cb) => signalRService.onReceiveMessage(cb);
export const onMessageSaveFailedRealtime = (cb) => signalRService.onMessageSaveFailed(cb);
export const onMessageReadRealtime = (cb) => signalRService.onMessageRead(cb);
export const onReactionAddedRealtime = (cb) => signalRService.onReactionAdded(cb);
export const onReactionRemovedRealtime = (cb) => signalRService.onReactionRemoved(cb);
export const onMessagePinnedRealtime = (cb) => signalRService.onMessagePinned(cb);
export const onMessageUnpinnedRealtime = (cb) => signalRService.onMessageUnpinned(cb);
export const onUserTypingRealtime = (cb) => signalRService.onUserTyping(cb);
export const onUserStoppedTypingRealtime = (cb) => signalRService.onUserStoppedTyping(cb);
export const onMemberRemovedRealtime = (cb) => signalRService.onMemberRemoved(cb);
export const onGroupDeletedRealtime = (cb) => signalRService.onGroupDeleted(cb);

export default {
  getMessages,
  sendMessage,
  markMessageAsRead,
  addReaction,
  removeReaction,
  getThreadMessages,
  deleteMessage
  , pinMessage, unpinMessage, getPinnedMessages
  , purgeLocalUnsavedMessages
  , // realtime
  connectRealtime, joinRealtimeGroup, leaveRealtimeGroup, sendMessageRealtime, markMessageAsReadRealtime,
  reactToMessageRealtime, pinMessageRealtime, unpinMessageRealtime,
  onReceiveMessageRealtime, onMessageSaveFailedRealtime, onMessageReadRealtime,
  onReactionAddedRealtime, onReactionRemovedRealtime, onMessagePinnedRealtime, onMessageUnpinnedRealtime,
  onUserTypingRealtime, onUserStoppedTypingRealtime
  , onGroupDeletedRealtime
  , queuePendingMessage, getPendingMessages, removePendingMessage, flushPendingMessages, flushPendingOutbox
};
