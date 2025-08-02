import React, { useState, useEffect, useRef } from 'react';
// Corrected import for io and Socket
import io from 'socket.io-client';
//import type { Socket } from 'socket.io-client';
import { useAuth, type User } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Send, User as UserIcon } from 'lucide-react';


type SocketType = ReturnType<typeof io>;
// Define interfaces for our chat data structures
interface Message {
    _id: string;
    sender: User;
    content: string;
    createdAt: string;
}

interface Chat {
    _id: string;
    participants: User[];
    isGroupChat: boolean;
    name?: string;
}

const ChatPage: React.FC = () => {
    const { user, logout } = useAuth();
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    //const socketRef = useRef<import('socket.io-client').Socket | null>(null);
    const socketRef = useRef<SocketType | null>(null);

    //const socketRef = useRef<Socket | null>(null);


    // Effect for handling Socket.IO connection and events
    useEffect(() => {
        if (!user) return;

        // Retrieve token from local storage for authentication
        const token = localStorage.getItem('token');
        if (!token) {
            logout(); // Logout if no token is found
            return;
        }

        // Connect to the Socket.IO server
        // Make sure the URL matches your server's address
        const socket = io('http://localhost:5000', {
            auth: {
                token: token,
            },
        });
        socketRef.current = socket;

        // --- Socket Event Listeners ---

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
        });

        // Example listener for receiving messages
        socket.on('message-received', (message: Message) => {
            // Add the new message only if it belongs to the currently selected chat
            if (selectedChat && message.sender.email !== user.email) {
                 setMessages((prevMessages) => [...prevMessages, message]);
            }
        });
        
        socket.on('connect_error', (err:any) => {
            console.error('Socket connection error:', err.message);
            // Handle auth errors, e.g., by logging out the user
            if (err.message === 'authentication error') {
                logout();
            }
        });

        // Clean up the socket connection when the component unmounts
        return () => {
            socket.disconnect();
            console.log('Socket disconnected');
        };

    }, [user, logout, selectedChat]);

    // Function to handle sending a message
    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() && selectedChat && socketRef.current) {
            const messageData = {
                chatId: selectedChat._id,
                content: newMessage,
            };
            // Emit the message to the server
            socketRef.current.emit('send-message', messageData);
            
            // Optimistically update the UI
            const myMessage: Message = {
                _id: new Date().toISOString(),
                sender: user!,
                content: newMessage,
                createdAt: new Date().toISOString()
            }
            setMessages(prev => [...prev, myMessage]);
            setNewMessage('');
        }
    };

    // --- Mock Data (replace with API calls) ---
    useEffect(() => {
        // In a real app, you would fetch the user's chats from your API
        setChats([
            { _id: '1', participants: [{_id: '2', username: 'Jane Doe', email: 'jane@example.com', isOnline: true, lastSeen: ''}], isGroupChat: false },
            { _id: '2', participants: [{_id: '3', username: 'John Smith', email: 'john@example.com', isOnline: false, lastSeen: ''}], isGroupChat: false },
        ]);
    }, []);

    if (!user) {
        return <div>Loading...</div>;
    }

    return (
        <div className="flex h-screen w-full bg-gray-100">
            {/* Sidebar for Chats */}
            <aside className="w-1/4 bg-white border-r flex flex-col">
                <header className="p-4 border-b flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <Avatar>
                            <AvatarImage src={`https://api.dicebear.com/8.x/lorelei/svg?seed=${user.username}`} />
                            <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <h2 className="font-bold">{user.username}</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={logout}>
                        <LogOut className="h-5 w-5" />
                    </Button>
                </header>
                <div className="flex-1 overflow-y-auto">
                    {chats.map((chat) => (
                        <div
                            key={chat._id}
                            className={`p-4 cursor-pointer hover:bg-gray-100 ${selectedChat?._id === chat._id ? 'bg-blue-100' : ''}`}
                            onClick={() => setSelectedChat(chat)}
                        >
                            <p className="font-semibold">{chat.isGroupChat ? chat.name : chat.participants[0].username}</p>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col">
                {selectedChat ? (
                    <>
                        <header className="p-4 border-b bg-white flex items-center space-x-3">
                             <Avatar>
                                <AvatarImage src={`https://api.dicebear.com/8.x/lorelei/svg?seed=${selectedChat.participants[0].username}`} />
                                <AvatarFallback>{selectedChat.participants[0].username.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <h2 className="font-bold text-xl">{selectedChat.participants[0].username}</h2>
                        </header>
                        <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                            {messages.map((msg) => (
                                <div key={msg._id} className={`flex ${msg.sender.email === user.email ? 'justify-end' : 'justify-start'} mb-4`}>
                                    <div className={`rounded-lg p-3 max-w-lg ${msg.sender.email === user.email ? 'bg-blue-500 text-white' : 'bg-white'}`}>
                                        <p>{msg.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <footer className="p-4 bg-white border-t">
                            <form onSubmit={handleSendMessage} className="flex space-x-2">
                                <Input
                                    type="text"
                                    placeholder="Type a message..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    className="flex-1"
                                />
                                <Button type="submit" size="icon">
                                    <Send className="h-5 w-5" />
                                </Button>
                            </form>
                        </footer>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        <UserIcon className="h-16 w-16 mb-4" />
                        <p className="text-xl">Select a chat to start messaging</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ChatPage;
