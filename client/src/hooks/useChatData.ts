import { useState, useEffect, useRef } from "react";
import api from "@/utils/api";

interface User {
    _id: string;
    username: string;
    email: string;
    isOnline: boolean;
    lastSeen: string;
}

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
    updatedAt: string;
}

export function useChatData(user: User | null) {
    const [isLoadingMessage, setisLoadingMessage] = useState(false);
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
}
