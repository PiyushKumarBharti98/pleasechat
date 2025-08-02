import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

export interface User {
    _id: string;
    username: string;
    email: string;
    isOnline: boolean;
    lastSeen: string;
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                setUser({
                    _id: decoded.userId,
                    username: decoded.username,
                    email: decoded.email,
                    isOnline: true,
                    lastSeen: "",
                });
            } catch {
                setUser(null);
            }
        }
        setIsLoading(false)
    }, []);

    const login = (token: string, user: User) => {
        localStorage.setItem("token", token);
        setUser(user);
    };

    const logout = () => {
        localStorage.removeItem("token");
        setUser(null);
    };

    return { user, login, logout, isLoading };
}
