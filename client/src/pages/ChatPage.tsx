import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth, type User } from '../hooks/useAuth';
import { api } from '../utils/api'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Send, User as UserIcon, MessageSquarePlus } from 'lucide-react';
import { Toaster, toast } from 'sonner';

type SocketType = ReturnType<typeof io>;

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
    createdAt: string;
t: string;
}

const ChatPage: React.FC = () => {
    const { user, logout } = useAuth();
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingChats, setLoadingChats] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const socketRef = useRef<SocketType | null>(null);

    const getChatName = useCallback((chat: Chat) => {
        if (!user) return 'Chat';
        if (chat.isGroupChat) {
            return chat.name || 'Group Chat';
        }
        const otherParticipant = chat.participants.find(p => p._id !== user._id);
        return otherParticipant?.username || 'Chat';
    }, [user]);

    const getChatAvatar = useCallback((chat: Chat) => {
        const name = getChatName(chat);
        return `https://api.dicebear.com/8.x/lorelei/svg?seed=${name}`;
    }, [getChatName]);


    useEffect(() => {
        if (!user) return;

        const fetchChats = async () => {
            setLoadingChats(true);
            try {
                // No need for manual headers, Axios interceptor handles it.
                const res = await api.get('/chat');
                // The API returns the array directly now.
                if (Array.isArray(res.data)) {
                    setChats(res.data);
                } else {
                    console.error("Chat data from server was not in the expected format.", res.data);
                    toast.error("Could not understand chat data from server.");
                    setChats([]); 
                }
            } catch (error) {
                console.error("Failed to fetch chats", error);
                toast.error("Failed to load your chats.");
            } finally {
                setLoadingChats(false);
            }
        };

        fetchChats();
    }, [user]);


    useEffect(() => {
        if (!selectedChat) return;

        const fetchMessages = async () => {
            setLoadingMessages(true);
            setMessages([]); // Clear previous messages
            try {
                // No need for manual headers, Axios interceptor handles it.
                const res = await api.get(`/chat/${selectedChat._id}/messages`);
                // Assuming the API returns messages in the format: { success, data: { messages: [...] } }
                setMessages(res.data.data.messages);
            } catch (error) {
                console.error("Failed to fetch messages", error);
                toast.error("Failed to load messages for this chat.");
            } finally {
                setLoadingMessages(false);
            }
        };

        fetchMessages();
    }, [selectedChat]);

    // --- MAJOR FIX: Split useEffect for sockets ---

    // HOOK 1: Manages the socket connection itself.
    // This runs only when the user logs in or out, creating a single, stable connection.
    useEffect(() => {
        if (!user) return;

        const token = localStorage.getItem('token');
        if (!token) {
            logout();
            return;
        }

        const socket = io('http://localhost:5000', {
            auth: { token },
        });
        socketRef.current = socket;

        socket.on('connect', () => console.log('Socket connected:', socket.id));
        socket.on('connect_error', (err: Error) => {
            console.error('Socket connection error:', err.message);
            if (err.message === 'authentication error') {
                logout();
            }
        });

        // Clean up the connection when the component unmounts or user logs out
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                console.log('Socket disconnected');
            }
        };
    }, [user, logout]);


    // HOOK 2: Manages the socket event listeners.
    // This hook re-applies listeners when dependencies like `selectedChat` change.
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const messageListener = (message: Message) => {
            if (selectedChat && message.chat === selectedChat._id) {
                setMessages((prevMessages) => [...prevMessages, message]);
            }
            setChats(prevChats => prevChats.map(chat => 
                chat._id === message.chat ? { ...chat, lastMessage: message } : chat
            ));
        };

        const chatCreatedListener = (newChat: Chat) => {
            setChats(prevChats => [newChat, ...prevChats]);
            toast.success(`You've been added to a new chat: ${getChatName(newChat)}`);
        };
        
        socket.on('message-recieved', messageListener);
        socket.on('chat-created', chatCreatedListener);

        // Clean up listeners to prevent duplicates on re-render
        return () => {
            socket.off('message-recieved', messageListener);
            socket.off('chat-created', chatCreatedListener);
        };
    }, [selectedChat, getChatName]); // Dependency array is now correct


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
// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import io from 'socket.io-client';
// import { useAuth, type User } from '../hooks/useAuth';
// import { api } from '../utils/api'; 
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// import { LogOut, Send, User as UserIcon, MessageSquarePlus } from 'lucide-react';
// import { Toaster, toast } from 'sonner';
//
// type SocketType = ReturnType<typeof io>;
//
// // const getChatName = (chat: Chat, currentUser: User | null): string => {
// //     if (!currentUser) return 'Chat';
// //     if (chat.isGroupChat) {
// //         return chat.name || 'Group Chat';
// //     }
// //     const otherParticipant = chat.participants.find(p => p._id !== currentUser._id);
// //     return otherParticipant?.username || 'Chat';
// // };
// //
// // /**
// //  * Generates an avatar URL based on the chat name.
// //  */
// // const getChatAvatar = (chat: Chat, currentUser: User | null): string => {
// //     const name = getChatName(chat, currentUser);
// //     return `https://api.dicebear.com/8.x/lorelei/svg?seed=${name}`;
// // };
//
// interface Message {
//     _id: string;
//     sender: User;
//     content: string;
//     chat: string;
//     createdAt: string;
// }
//
// interface Chat {
//     _id: string;
//     participants: User[];
//     isGroupChat: boolean;
//     name?: string;
//     lastMessage?: Message;
//     createdAt: string;
//     updatedAt: string;
// }
//
// const ChatPage: React.FC = () => {
//     const { user, logout } = useAuth();
//     const [chats, setChats] = useState<Chat[]>([]);
//     const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
//     const [messages, setMessages] = useState<Message[]>([]);
//     const [newMessage, setNewMessage] = useState('');
//     const [loadingChats, setLoadingChats] = useState(true);
//     const [loadingMessages, setLoadingMessages] = useState(false);
//     const messagesEndRef = useRef<HTMLDivElement | null>(null);
//     const socketRef = useRef<SocketType | null>(null);
//
//
//     useEffect(() => {
//         if (!user) return;
//
//         const fetchChats = async () => {
//             setLoadingChats(true);
//             try {
//                 const token = localStorage.getItem('token');
//                 const res = await api.get('/chat', {
//                     headers: { Authorization: `Bearer ${token}` }
//                 });
//
//                 if (res.data && res.data.data && Array.isArray(res.data.data.chats)) {
//                     setChats(res.data.data.chats);
//                 } else {
//                     console.error("Chat data from server was not in the expected format.", res.data);
//                     toast.error("Could not understand chat data from server.");
//                     setChats([]); 
//                 }
//
//             } catch (error) {
//                 console.error("Failed to fetch chats", error);
//                 toast.error("Failed to load your chats.");
//             } finally {
//                 setLoadingChats(false);
//             }
//         };
//
//         fetchChats();
//     }, [user]);
//
//
//     useEffect(() => {
//         if (!selectedChat) return;
//
//         const fetchMessages = async () => {
//             setLoadingMessages(true);
//             setMessages([]); // Clear previous messages
//             try {
//                 const token = localStorage.getItem('token');
//                 const res = await api.get(`/chat/${selectedChat._id}/messages`, {
//                      headers: { Authorization: `Bearer ${token}` }
//                 });
//                 setMessages(res.data);
//             } catch (error) {
//                 console.error("Failed to fetch messages", error);
//                 toast.error("Failed to load messages for this chat.");
//             } finally {
//                 setLoadingMessages(false);
//             }
//         };
//
//         fetchMessages();
//     }, [selectedChat]);
//
//
//     useEffect(() => {
//         if (!user) return;
//
//         const token = localStorage.getItem('token');
//         if (!token) {
//             logout();
//             return;
//         }
//
//         // Establish socket connection
//         const socket = io('http://localhost:5000', {
//             auth: { token },
//         });
//         socketRef.current = socket;
//
//         socket.on('connect', () => {
//             console.log('Socket connected:', socket.id);
//         });
//
//         socket.on('message-recieved', (message: Message) => {
//             if (selectedChat && message.chat === selectedChat._id) {
//                 setMessages((prevMessages) => [...prevMessages, message]);
//             }
//
//             setChats(prevChats => prevChats.map(chat => 
//                 chat._id === message.chat ? { ...chat, lastMessage: message } : chat
//             ));
//         });
//
//         socket.on('chat-created', (newChat: Chat) => {
//             setChats(prevChats => [newChat, ...prevChats]);
//             toast.success(`You've been added to a new chat: ${getChatName(newChat)}`);
//         });
//
//         socket.on('connect_error', (err: Error) => {
//             console.error('Socket connection error:', err.message);
//             if (err.message === 'authentication error') {
//                 logout();
//             }
//         });
//
//         return () => {
//             socket.disconnect();
//             console.log('Socket disconnected');
//         };
//
//     }, [user, logout, selectedChat]); 
//
//
//      const scrollToBottom = () => {
//         messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//     };
//
//     useEffect(scrollToBottom, [messages]);
//
//
//     const handleSendMessage = (e: React.FormEvent) => {
//         e.preventDefault();
//         if (newMessage.trim() && selectedChat && socketRef.current && user) {
//             const messageData = {
//                 chatId: selectedChat._id,
//                 content: newMessage,
//             };
//
//             socketRef.current.emit('send-message', messageData);
//
//             // Optimistic UI update
//             const optimisticMessage: Message = {
//                 _id: new Date().toISOString(), // Temporary ID
//                 sender: user,
//                 content: newMessage,
//                 chat: selectedChat._id,
//                 createdAt: new Date().toISOString()
//             };
//             setMessages(prev => [...prev, optimisticMessage]);
//             setNewMessage('');
//         }
//     };
//
//     const getChatName = (chat: Chat) => {
//         if (chat.isGroupChat) {
//             return chat.name;
//         }
//         // For 1-on-1 chats, find the other participant's name
//         const otherParticipant = chat.participants.find(p => p._id !== user?._id);
//         return otherParticipant?.username || 'Chat';
//     };
//
//     const getChatAvatar = (chat: Chat) => {
//         const name = getChatName(chat);
//         return `https://api.dicebear.com/8.x/lorelei/svg?seed=${name}`;
//     }
//
//     // --- RENDER LOGIC ---
//
//     if (!user) {
//         return <div className="flex items-center justify-center h-screen">Loading user...</div>;
//     }
//
//     return (
//         <>
//         <Toaster position="top-right" richColors />
//         <div className="flex h-screen w-full bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
//             {/* Sidebar */}
//             <aside className="w-full md:w-1/3 lg:w-1/4 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col">
//                 <header className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
//                     <div className="flex items-center space-x-3">
//                         <Avatar>
//                             <AvatarImage src={`https://api.dicebear.com/8.x/lorelei/svg?seed=${user.username}`} />
//                             <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
//                         </Avatar>
//                         <h2 className="font-bold text-lg">{user.username}</h2>
//                     </div>
//                     <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out">
//                         <LogOut className="h-5 w-5" />
//                     </Button>
//                 </header>
//                 <div className="p-2">
//                     <Button className="w-full justify-start">
//                         <MessageSquarePlus className="mr-2 h-4 w-4"/>
//                         New Chat
//                     </Button>
//                 </div>
//                 <div className="flex-1 overflow-y-auto">
//                     {loadingChats ? (
//                         <p className="p-4 text-center text-gray-500">Loading chats...</p>
//                     ) : (
//                         chats
//                         .sort((a, b) => new Date(b.lastMessage?.createdAt || b.createdAt).getTime() - new Date(a.lastMessage?.createdAt || a.createdAt).getTime())
//                         .map((chat) => (
//                         <div
//                             key={chat._id}
//                             className={`p-3 m-2 rounded-lg cursor-pointer flex items-center space-x-3 transition-colors ${selectedChat?._id === chat._id ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
//                             onClick={() => setSelectedChat(chat)}
//                         >
//                             <Avatar>
//                                 <AvatarImage src={getChatAvatar(chat)} />
//                                 <AvatarFallback>{getChatName(chat)?.charAt(0).toUpperCase()}</AvatarFallback>
//                             </Avatar>
//                             <div className="flex-1 overflow-hidden">
//                                 <p className="font-semibold truncate">{getChatName(chat)}</p>
//                                 <p className={`text-sm truncate ${selectedChat?._id === chat._id ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
//                                     {chat.lastMessage?.content || "No messages yet"}
//                                 </p>
//                             </div>
//                         </div>
//                     )))}
//                 </div>
//             </aside>
//
//             {/* Main Chat Area */}
//             <main className="flex-1 flex flex-col">
//                 {selectedChat ? (
//                     <>
//                         <header className="p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center space-x-3">
//                              <Avatar>
//                                 <AvatarImage src={getChatAvatar(selectedChat)} />
//                                 <AvatarFallback>{getChatName(selectedChat)?.charAt(0).toUpperCase()}</AvatarFallback>
//                             </Avatar>
//                             <h2 className="font-bold text-xl">{getChatName(selectedChat)}</h2>
//                         </header>
//                         <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
//                             {loadingMessages ? (
//                                 <p className="text-center text-gray-500">Loading messages...</p>
//                             ) : (
//                                 messages.map((msg) => (
//                                     <div key={msg._id} className={`flex ${msg.sender._id === user._id ? 'justify-end' : 'justify-start'} mb-4`}>
//                                         <div className={`rounded-lg p-3 max-w-lg ${msg.sender._id === user._id ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-700'}`}>
//                                             <p>{msg.content}</p>
//                                             <p className={`text-xs mt-1 ${msg.sender._id === user._id ? 'text-blue-200' : 'text-gray-400'}`}>
//                                                 {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//                                             </p>
//                                         </div>
//                                     </div>
//                                 ))
//                             )}
//                              <div ref={messagesEndRef} />
//                         </div>
//                         <footer className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
//                             <form onSubmit={handleSendMessage} className="flex space-x-2">
//                                 <Input
//                                     type="text"
//                                     placeholder="Type a message..."
//                                     value={newMessage}
//                                     onChange={(e) => setNewMessage(e.target.value)}
//                                     className="flex-1 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
//                                     autoComplete="off"
//                                 />
//                                 <Button type="submit" size="icon" disabled={!newMessage.trim()}>
//                                     <Send className="h-5 w-5" />
//                                 </Button>
//                             </form>
//                         </footer>
//                     </>
//                 ) : (
//                     <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
//                         <UserIcon className="h-16 w-16 mb-4" />
//                         <h2 className="text-2xl font-semibold">Welcome, {user.username}!</h2>
//                         <p className="text-xl">Select a chat to start messaging</p>
//                     </div>
//                 )}
//             </main>
//         </div>
//         </>
//     );
// };
//
// export default ChatPage;
