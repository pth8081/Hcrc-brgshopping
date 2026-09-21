const { Op } = require('sequelize');
const { ChatConversation, ChatMessage, User } = require('../models');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

// A customer request identifies its conversation either by a logged-in
// user's JWT (req.user) or, for a guest, a random token the browser
// generated and sent along (see getGuestChatToken() in public/js/api.js).
// This never trusts a bare conversation id alone — it must also match the
// caller's identity, so one visitor can't read another's chat by guessing ids.
async function findOwnedConversation(req, conversationId) {
  const conversation = await ChatConversation.findByPk(conversationId);
  if (!conversation) return null;
  if (req.user && conversation.userId === req.user.id) return conversation;
  const guestToken = req.body?.guestToken || req.query?.guestToken;
  if (guestToken && conversation.guestToken === guestToken) return conversation;
  return null;
}

const start = asyncHandler(async (req, res) => {
  if (req.user) {
    let conversation = await ChatConversation.findOne({ where: { userId: req.user.id }, order: [['id', 'DESC']] });
    if (!conversation) {
      conversation = await ChatConversation.create({ userId: req.user.id, guestName: req.user.fullName });
    }
    return res.json({ success: true, data: conversation });
  }

  const { guestToken, guestName } = req.body;
  if (!guestToken) throw new ApiError(400, 'guestToken is required for a guest chat');

  let conversation = await ChatConversation.findOne({ where: { guestToken }, order: [['id', 'DESC']] });
  if (!conversation) {
    conversation = await ChatConversation.create({ guestToken, guestName: guestName || 'Khách' });
  }
  res.json({ success: true, data: conversation });
});

const sendMessage = asyncHandler(async (req, res) => {
  const { body } = req.body;
  if (!body || !body.trim()) throw new ApiError(400, 'body is required');

  const conversation = await findOwnedConversation(req, req.params.id);
  if (!conversation) throw new ApiError(404, 'Conversation not found');

  const message = await ChatMessage.create({ conversationId: conversation.id, senderType: 'customer', body: body.trim().slice(0, 2000) });
  conversation.lastMessageAt = new Date();
  conversation.status = 'open';
  await conversation.save();

  res.status(201).json({ success: true, data: message });
});

const getMessages = asyncHandler(async (req, res) => {
  const conversation = await findOwnedConversation(req, req.params.id);
  if (!conversation) throw new ApiError(404, 'Conversation not found');

  const after = Number(req.query.after) || 0;
  const messages = await ChatMessage.findAll({
    where: { conversationId: conversation.id, id: { [Op.gt]: after } },
    order: [['id', 'ASC']],
  });
  res.json({ success: true, data: messages });
});

const listConversations = asyncHandler(async (req, res) => {
  const conversations = await ChatConversation.findAll({
    include: [
      { model: User, attributes: ['id', 'fullName', 'email'] },
      { model: ChatMessage, as: 'messages', separate: true, limit: 1, order: [['id', 'DESC']] },
    ],
    order: [['lastMessageAt', 'DESC'], ['createdAt', 'DESC']],
  });
  res.json({ success: true, data: conversations });
});

const getAdminMessages = asyncHandler(async (req, res) => {
  const conversation = await ChatConversation.findByPk(req.params.id);
  if (!conversation) throw new ApiError(404, 'Conversation not found');

  const messages = await ChatMessage.findAll({ where: { conversationId: conversation.id }, order: [['id', 'ASC']] });
  res.json({ success: true, data: { conversation, messages } });
});

const adminReply = asyncHandler(async (req, res) => {
  const { body } = req.body;
  if (!body || !body.trim()) throw new ApiError(400, 'body is required');

  const conversation = await ChatConversation.findByPk(req.params.id);
  if (!conversation) throw new ApiError(404, 'Conversation not found');

  const message = await ChatMessage.create({ conversationId: conversation.id, senderType: 'admin', body: body.trim().slice(0, 2000) });
  conversation.lastMessageAt = new Date();
  await conversation.save();

  res.status(201).json({ success: true, data: message });
});

const closeConversation = asyncHandler(async (req, res) => {
  const conversation = await ChatConversation.findByPk(req.params.id);
  if (!conversation) throw new ApiError(404, 'Conversation not found');

  conversation.status = 'closed';
  await conversation.save();
  res.json({ success: true, data: conversation });
});

module.exports = { start, sendMessage, getMessages, listConversations, getAdminMessages, adminReply, closeConversation };
