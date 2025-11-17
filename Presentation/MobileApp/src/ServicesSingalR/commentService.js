import signalRService from './signalRService';

/**
 * Comment realtime wrapper service
 * Exposes comment-specific realtime helpers and keeps SignalR logic separated
 */

export const connectRealtime = async () => {
  return await signalRService.connectToComments();
};

export const joinPostRoom = async (postId) => {
  return await signalRService.joinPostRoom(postId);
};

export const leavePostRoom = async (postId) => {
  return await signalRService.leavePostRoom(postId);
};

export const onReceiveComment = (cb) => signalRService.onReceiveComment(cb);
export const onCommentUpdated = (cb) => signalRService.onCommentUpdated(cb);
export const onCommentDeleted = (cb) => signalRService.onCommentDeleted(cb);
export const onCommentReplyAdded = (cb) => signalRService.onCommentReplyAdded(cb);
export const onReactionAdded = (cb) => signalRService.onReactionAdded(cb);
export const onReactionRemoved = (cb) => signalRService.onReactionRemoved(cb);

export const removeAllListeners = () => {
  try {
    if (signalRService && typeof signalRService.removeAllListeners === 'function') {
      signalRService.removeAllListeners();
    }
  } catch (e) {
    console.error('[commentService] removeAllListeners error', e);
  }
};

export const disconnectRealtime = async () => {
  try {
    if (signalRService && typeof signalRService.disconnectComments === 'function') {
      await signalRService.disconnectComments();
    }
  } catch (e) {
    console.error('[commentService] disconnectRealtime error', e);
  }
};

export default {
  connectRealtime,
  joinPostRoom,
  leavePostRoom,
  onReceiveComment,
  onCommentUpdated,
  onCommentDeleted,
  onCommentReplyAdded,
  onReactionAdded,
  onReactionRemoved,
  removeAllListeners,
  disconnectRealtime
};