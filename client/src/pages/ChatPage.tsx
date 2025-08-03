import React, { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth, type User } from '../hooks/useAuth';
import { api } from '../utils/api'; // Make sure you have this api utility
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Send, User as UserIcon, MessageSquarePlus } from 'lucide-react';
import { Toaster, toast } from 'sonner';


// Define interfaces for our chat data structures
// Ensure these match your backend models
interface Message {
    _id: string;
    sender: User;
    content: string;
    chat: string;
    createdAt: string;
}

interface Chat {
    _id: string;
    participants: User[];
    isGroupChat: boolean;
    name?: string;
    lastMessage?: Message;
}

const ChatPage: React.FC = () => {
    const { user, logout } = useAuth();
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingChats, setLoadingChats] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);


    // --- DATA FETCHING EFFECTS ---

    // Effect 1: Fetch all user chats on component mount
    useEffect(() => {
        if (!user) return;

        const fetchChats = async () => {
            setLoadingChats(true);
            try {
                const token = localStorage.getItem('token');
                const res = await api.get('/', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setChats(res.data);
            } catch (error) {
                console.error("Failed to fetch chats", error);
                toast.error("Failed to load your chats.");
            } finally {
                setLoadingChats(false);
            }
        };

        fetchChats();
    }, [user]);

    // Effect 2: Fetch messages for the selected chat
    useEffect(() => {
        if (!selectedChat) return;

        const fetchMessages = async () => {
            setLoadingMessages(true);
            setMessages([]); // Clear previous messages
            try {
                const token = localStorage.getItem('token');
                const res = await api.get(`/chat/${selectedChat._id}/messages`, {
                     headers: { Authorization: `Bearer ${token}` }
                });
                setMessages(res.data);
            } catch (error) {
                console.error("Failed to fetch messages", error);
                toast.error("Failed to load messages for this chat.");
            } finally {
                setLoadingMessages(false);
            }
        };

        fetchMessages();
    }, [selectedChat]);


    // --- SOCKET.IO EFFECT ---

    useEffect(() => {
        if (!user) return;

        const token = localStorage.getItem('token');
        if (!token) {
            logout();
            return;
        }

        // Establish socket connection
        const socket = io('http://localhost:5000', {
            auth: { token },
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
        });

        // Listen for new messages
        socket.on('message-recieved', (message: Message) => {
            // Check if the message belongs to the currently selected chat
            if (selectedChat && message.chat === selectedChat._id) {
                setMessages((prevMessages) => [...prevMessages, message]);
            }
            
            // Update the last message in the chat list for real-time feedback
            setChats(prevChats => prevChats.map(chat => 
                chat._id === message.chat ? { ...chat, lastMessage: message } : chat
            ));
        });

        // Listen for newly created chats
        socket.on('chat-created', (newChat: Chat) => {
            setChats(prevChats => [newChat, ...prevChats]);
            toast.success(`You've been added to a new chat: ${getChatName(newChat)}`);
        });
        
        socket.on('connect_error', (err: Error) => {
            console.error('Socket connection error:', err.message);
            if (err.message === 'authentication error') {
                logout();
            }
        });

        // Cleanup on component unmount
        return () => {
            socket.disconnect();
            console.log('Socket disconnected');
        };

    }, [user, logout, selectedChat]); // selectedChat is needed to update messages in real-time

    // --- UTILITY & HANDLER FUNCTIONS ---

     const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);


    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() && selectedChat && socketRef.current && user) {
            const messageData = {
                chatId: selectedChat._id,
                content: newMessage,
            };
            
            socketRef.current.emit('send-message', messageData);
            
            // Optimistic UI update
            const optimisticMessage: Message = {
                _id: new Date().toISOString(), // Temporary ID
                sender: user,
                content: newMessage,
                chat: selectedChat._id,
                createdAt: new Date().toISOString()
            };
            setMessages(prev => [...prev, optimisticMessage]);
            setNewMessage('');
        }
    };

    const getChatName = (chat: Chat) => {
        if (chat.isGroupChat) {
            return chat.name;
        }
        // For 1-on-1 chats, find the other participant's name
        const otherParticipant = chat.participants.find(p => p._id !== user?._id);
        return otherParticipant?.username || 'Chat';
    };

    const getChatAvatar = (chat: Chat) => {
        const name = getChatName(chat);
        return `https://api.dicebear.com/8.x/lorelei/svg?seed=${name}`;
    }

    // --- RENDER LOGIC ---

    if (!user) {
        return <div className="flex items-center justify-center h-screen">Loading user...</div>;
    }

    return (
        <>
        <Toaster position="top-right" richColors />
        <div className="flex h-screen w-full bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {/* Sidebar */}
            <aside className="w-full md:w-1/3 lg:w-1/4 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col">
                <header className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <Avatar>
                            <AvatarImage src={`https://api.dicebear.com/8.x/lorelei/svg?seed=${user.username}`} />
                            <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <h2 className="font-bold text-lg">{user.username}</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out">
                        <LogOut className="h-5 w-5" />
                    </Button>
                </header>
                <div className="p-2">
                    <Button className="w-full justify-start">
                        <MessageSquarePlus className="mr-2 h-4 w-4"/>
                        New Chat
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loadingChats ? (
                        <p className="p-4 text-center text-gray-500">Loading chats...</p>
                    ) : (
                        chats
                        .sort((a, b) => new Date(b.lastMessage?.createdAt || b.createdAt).getTime() - new Date(a.lastMessage?.createdAt || a.createdAt).getTime())
                        .map((chat) => (
                        <div
                            key={chat._id}
                            className={`p-3 m-2 rounded-lg cursor-pointer flex items-center space-x-3 transition-colors ${selectedChat?._id === chat._id ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            onClick={() => setSelectedChat(chat)}
                        >
                            <Avatar>
                                <AvatarImage src={getChatAvatar(chat)} />
                                <AvatarFallback>{getChatName(chat)?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 overflow-hidden">
                                <p className="font-semibold truncate">{getChatName(chat)}</p>
                                <p className={`text-sm truncate ${selectedChat?._id === chat._id ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {chat.lastMessage?.content || "No messages yet"}
                                </p>
                            </div>
                        </div>
                    )))}
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col">
                {selectedChat ? (
                    <>
                        <header className="p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center space-x-3">
                             <Avatar>
                                <AvatarImage src={getChatAvatar(selectedChat)} />
                                <AvatarFallback>{getChatName(selectedChat)?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <h2 className="font-bold text-xl">{getChatName(selectedChat)}</h2>
                        </header>
                        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                            {loadingMessages ? (
                                <p className="text-center text-gray-500">Loading messages...</p>
                            ) : (
                                messages.map((msg) => (
                                    <div key={msg._id} className={`flex ${msg.sender._id === user._id ? 'justify-end' : 'justify-start'} mb-4`}>
                                        <div className={`rounded-lg p-3 max-w-lg ${msg.sender._id === user._id ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-700'}`}>
                                            <p>{msg.content}</p>
                                            <p className={`text-xs mt-1 ${msg.sender._id === user._id ? 'text-blue-200' : 'text-gray-400'}`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                             <div ref={messagesEndRef} />
                        </div>
                        <footer className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
                            <form onSubmit={handleSendMessage} className="flex space-x-2">
                                <Input
                                    type="text"
                                    placeholder="Type a message..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    className="flex-1 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                    autoComplete="off"
                                />
                                <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                                    <Send className="h-5 w-5" />
                                </Button>
                            </form>
                        </footer>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <UserIcon className="h-16 w-16 mb-4" />
                        <h2 className="text-2xl font-semibold">Welcome, {user.username}!</h2>
                        <p className="text-xl">Select a chat to start messaging</p>
                    </div>
                )}
            </main>
        </div>
        </>
    );
};

export default ChatPage;
