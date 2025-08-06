import { Server as SocketIOServer } from 'socket.io';
import mongoose from "mongoose";
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Chat, IChat } from '../models/Chat';
import { Message } from '../models/Message';
import { socketAuthenticate } from '../middlewares/authMiddleware';
import { existsSync } from 'fs';

interface socketUser {
    userId: string,
    socketId: string
}

export class SocketManager {
    private io: SocketIOServer;
    private connectedUsers: Map<string, string> = new Map();
    private userSockets: Map<string, string> = new Map();

    constructor(server: HTTPServer) {
        this.io = new SocketIOServer(server, {
            cors: {
                origin: process.env.CLIENT_URL || "http://localhost:3000",
                methods: ['GET', 'POST']
            }
        });

        this.setupMiddleware();
        this.setupEventHandlers();
    }

    private setupMiddleware() {
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token) {
                    return next(new Error('authentication error'));
                }
                const user = await socketAuthenticate(token);
                if (!user) {
                    return next(new Error('authenticaton error'));
                }
                socket.data.user = user;
                next();
            } catch (error) {
                next(new Error('authentication error'));
            }
        });
    }

    private setupEventHandlers() {
        this.io.on('connection', (socket) => {
            const user = socket.data.user;
            console.log(`user ${user.username} is connected`);

            this.connectedUsers.set(user._id.toString(), socket.id);
            this.userSockets.set(socket.id, user._id.toString());

            this.updateUserOnlineStatus(user._id.toString(), true);

            this.joinUserChats(socket, user._id.toString());

            socket.on('join-chat', (chatId: string) => {
                socket.join(chatId);
                console.log(`user ${user.username} has joined chat ${chatId}`);
            });
            socket.on('leave-chat', (chatId: string) => {
                socket.leave(chatId);
                console.log(`user ${user.username} has left chat ${chatId}`);
            });

            socket.on('send-message', async (data) => {
                try {
                    await this.handleSendMessage(socket, data);
                } catch (error) {
                    socket.emit('error sending message');
                }
            });

            socket.on('start-typing', (chatId: string) => {
                socket.to(chatId).emit('typing-start', {
                    userId: user._id.toString(),
                    chatId
                });
            });

            socket.on('stop-typing', (chatId: string) => {
                socket.to(chatId).emit('typing-stop', {
                    userId: user._id.toString(),
                    chatId
                });
            });

            socket.on('handleMarkRead', async (messageId: string) => {
                try {
                    await this.handleMarkRead(socket, messageId);
                } catch (error) {
                    socket.emit('error sending message');
                }
            });

            socket.on('create-chat', async (data) => {
                try {
                    await this.handleCreateChat(socket, data);
                } catch (error) {
                    socket.emit('error sending message');
                }
            });

            socket.on('disconnect', () => {
                console.log(`user ${user.username} disconnected`);

                this.connectedUsers.delete(user._id.toString());
                this.userSockets.delete(user._id.toString());

                this.updateUserOnlineStatus(user._id.toString(), false);
            });
        });

    }

    private async joinUserChats(socket: any, userId: string) {
        try {
            const chats = await Chat.find({
                participants: userId
            }).select('_id') as unknown as { _id: mongoose.Types.ObjectId }[];

            chats.forEach((chat) => {
                socket.join(chat._id.toString());
            });
        } catch (error) {
            console.log('error joining users with chat', error);
        }
    }

    private async handleSendMessage(socket: any, data: any) {
        const { chatId, content, messageType = 'text' } = data;
        const user = socket.data.user;

        const chat = await Chat.findById({
            _id: chatId,
            participants: user._id
        });

        if (!chat) {
            socket.emit('error', 'chat not found');
            return;
        }

        const message = new Message({
            sender: user._id,
            content,
            chat: chatId,
            messageType,
            readby: [{
                user: user._id,
                readAt: new Date()
            }]
        });

        await message.save();
        await message.populate('sender', '-password');

        chat.lastMessage = message._id;
        await chat.save();

        this.io.to(chatId).emit('message-recieved', message);
    }

    private async handleMarkRead(socket: any, messageId: string) {
        const user = socket.user.data;

        const message = await Message.findById(messageId);

        if (!message) {
            socket.emit('error', 'message not found');
            return;
        }

        const alreadyRead = message.readBy.some(
            readReceipt => readReceipt.user.toString() === user._id.toString()
        );

        if (!alreadyRead) {
            message.readBy.push({
                user: user._id,
                readAt: new Date()
            });
            await message.save();
        }

        this.io.to(message.chat.toString()).emit('message-read', {
            messageId,
            userId: user._id.toString()
        });
    }
    private async handleCreateChat(socket: any, data: any) {
        const { participants, isGroupChat = false, name } = data;
        const user = socket.data.user;

        const allParticipants = [...new Set([...participants, user._id.toString()])];

        if (!isGroupChat || allParticipants.length === 2) {
            const existingChat = await Chat.findOne({
                isGroupChat: false,
                participants: { $all: allParticipants, $size: 2 }
            }).populate('participants', '-password');

            if (existingChat) {
                socket.emit('chat-created', existingChat);
                return;
            }
        }

        const chat = new Chat({
            participants: allParticipants,
            isGroupChat,
            name: isGroupChat ? name : undefined,
            admin: isGroupChat ? user._id : undefined
        });

        await chat.save();
        await chat.populate('participants', '-password');

        allParticipants.forEach(participantId => {
            const socketId = this.connectedUsers.get(participantId);
            if (socketId) {
                this.io.sockets.sockets.get(socketId)?.join(chat._id.toString());
            }
        });
        this.io.to(chat._id.toString()).emit('chat-created', chat);
    }

    private async updateUserOnlineStatus(userId: string, isOnline: boolean) {
        try {
            await User.findByIdAndUpdate(userId, {
                isOnline,
                lastSeen: new Date()
            });
        } catch (error) {
            console.error('error updating user online', error);
        }
    }

    public getConnectedUsers(): Map<string, string> {
        return this.connectedUsers;
    }
    public getUserSocket(userId: string): string | undefined {
        return this.connectedUsers.get(userId);
    }

}


