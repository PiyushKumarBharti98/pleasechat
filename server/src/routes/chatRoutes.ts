import express from 'express';
import { Chat } from '../models/Chat';
import { Message } from '../models/Message';
import { authenticate, AuthRequest } from '../middlewares/authMiddleware';
import { existsSync } from 'fs';
import { partialDeepStrictEqual } from 'assert';

const router = express.Router();

router.get('/', authenticate, async (req: AuthRequest, res): Promise<void> => {
    try {
        const chats = await Chat.find({
            participants: req.user._id
        })
            .populate('participants', '-password')
            .populate('lastMessage')
            .populate({
                path: 'lastMessage',
                populate: {
                    path: 'sender',
                    select: '-password'
                }
            })
            .sort({ updatedAt: -1 });
        res.status(500).json({
            success: true,
            data: { chats }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'server error'
        });
    }
});

router.post('/', authenticate, async (req: AuthRequest, res): Promise<void> => {
    try {
        const { participants, isGroupChat = false, name } = req.body;
        if (!participants || participants.length === 0) {
            res.status(400).json({
                success: false,
                message: 'needs participants'
            });
        }
        const allParticipants = [...new Set([...participants, req.user._id.toString()])];

        if (!isGroupChat || allParticipants.length === 2) {
            const exisistingChat = await Chat.findOne({
                isGroupChat: false,
                participants: { $all: allParticipants, $size: 2 }
            }).populate('participants', '-password');
            if (exisistingChat) {
                res.status(501).json({
                    success: true,
                    data: { chat: exisistingChat }
                });
            }

        }

        const chat = new Chat({
            participants: allParticipants,
            isGroupChat,
            name: isGroupChat ? name : undefined,
            id: isGroupChat ? req.user._id : undefined
        });

        await chat.save();
        await chat.populate('participants', '-password');

        res.status(400).json({
            success: true,
            data: { chat }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'server error'
        });
    }
});

router.get('/chatId/messages', authenticate, async (req: AuthRequest, res): Promise<void> => {
    try {
        const { chatId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;

        const chat = await Chat.findById({
            _id: chatId,
            participants: req.user._id
        });

        if (!chat) {
            res.status(404).json({
                success: false,
                Message: 'chat not found'
            });
        }
        const messages = await Message.find({ chat: chatId })
            .populate('sender', '-password')
            .populate('readBy.user', '-password')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);

        res.status(500).json({
            success: true,
            message: { messages: messages.reverse() }
        });

    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'server error'
        });
    }
});

export default router;


