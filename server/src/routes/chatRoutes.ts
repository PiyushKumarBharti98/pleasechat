import express from 'express';
import { Chat } from '../models/Chat';
import { Message } from '../models/Message';
import { authenticate, AuthRequest } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/', authenticate, async (req: AuthRequest, res): Promise<void> => {
    try {
        console.log('[GET /chats] Handler started for user:', req.user._id);

        console.log('[GET /chats] Step 1: Finding chats for user...');
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

        console.log(`[GET /chats] Step 2: Found ${chats.length} chats`);
        console.log('[GET /chats] Step 3: Sending response...');

        res.status(200).json({
            success: true,
            data: { chats }
        });
        console.log('[GET /chats] Response sent successfully');

    } catch (error) {
        console.error('[GET /chats] Error fetching chats:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Create new chat
router.post('/', authenticate, async (req: AuthRequest, res): Promise<void> => {
    try {
        console.log('[POST /chats] Handler started for user:', req.user._id);
        console.log('[POST /chats] Request body:', req.body);

        const { participants, isGroupChat = false, name } = req.body;

        console.log('[POST /chats] Step 1: Validating participants...');
        if (!participants || participants.length === 0) {
            console.log('[POST /chats] Validation failed: no participants provided');
            res.status(400).json({
                success: false,
                message: 'Participants are required'
            });
            return;
        }

        const allParticipants = [...new Set([...participants, req.user._id.toString()])];
        console.log(`[POST /chats] All participants: ${allParticipants.join(', ')}`);

        if (!isGroupChat && allParticipants.length === 2) {
            console.log('[POST /chats] Step 2: Checking for existing 1:1 chat...');
            try {
                const existingChat = await Chat.findOne({
                    isGroupChat: false,
                    participants: { $all: allParticipants, $size: 2 }
                }).populate('participants', '-password');

                if (existingChat) {
                    console.log('[POST /chats] Existing chat found:', existingChat._id);
                    res.status(200).json({
                        success: true,
                        data: { chat: existingChat }
                    });
                    return;
                }
            } catch (error) {
                console.error('[POST /chats] Error finding existing chat:', error);
                res.status(500).json({
                    success: false,
                    message: 'Server error'
                });
                return;
            }
        }

        console.log('[POST /chats] Step 3: Creating new chat...');
        const chat = new Chat({
            participants: allParticipants,
            isGroupChat,
            name: isGroupChat ? name : undefined,
            admin: isGroupChat ? req.user._id : undefined
        });

        console.log('[POST /chats] Step 4: Saving chat to database...');
        await chat.save();
        await chat.populate('participants', '-password');
        console.log('[POST /chats] Chat saved successfully:', chat._id);

        res.status(201).json({
            success: true,
            data: { chat }
        });
        console.log('[POST /chats] Response sent successfully');

    } catch (error) {
        console.error('[POST /chats] Error creating chat:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get messages for a specific chat
router.get('/:chatId/messages', authenticate, async (req: AuthRequest, res): Promise<void> => {
    try {
        const { chatId } = req.params;
        console.log(`[GET /chats/${chatId}/messages] Handler started for user:`, req.user._id);

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;

        console.log(`[GET /chats/${chatId}/messages] Page: ${page}, Limit: ${limit}`);

        console.log('[GET /chats/messages] Step 1: Verifying chat access...');
        const chat = await Chat.findOne({
            _id: chatId,
            participants: req.user._id
        });

        if (!chat) {
            console.log(`[GET /chats/messages] Chat not found or access denied: ${chatId}`);
            res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
            return;
        }

        console.log('[GET /chats/messages] Step 2: Fetching messages...');
        const messages = await Message.find({ chat: chatId })
            .populate('sender', '-password')
            .populate('readBy.user', '-password')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);

        console.log(`[GET /chats/messages] Found ${messages.length} messages`);
        console.log('[GET /chats/messages] Step 3: Preparing response...');

        res.status(200).json({
            success: true,
            data: {
                messages: messages.reverse(),
                pagination: {
                    page,
                    limit,
                    total: await Message.countDocuments({ chat: chatId })
                }
            }
        });
        console.log('[GET /chats/messages] Response sent successfully');

    } catch (error) {
        console.error(`[GET /chats/${req.params.chatId}/messages] Error:`, error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

export default router;

