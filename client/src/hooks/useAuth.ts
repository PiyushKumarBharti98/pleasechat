import { useState, useEffect } from "react";
import { api } from '../utils/api';

export interface User {
    _id: string;
    username: string;
    email: string;
    isOnline: boolean;
    lastSeen: string;
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkLoggedIn = async () => {
            console.log('[useAuth] useEffect running...');
            const token = localStorage.getItem("token");
            console.log(`[useAuth] token == ${token}`);

            if (token) {
                console.log('[useAuth] Token found in localStorage. Attempting to verify...');
                try {
                    console.log('[useAuth] Calling /api/user/me...');
                    const response = await api.get('/user/me');
                    // const response = await api.get('/user/test');
                    console.log(`[useAuth] the actual response ${response}`);
                    console.log('[useAuth] /me request successful. Response:', response.data);
                    setUser(response.data.data.user);
                } catch (error) {
                    console.error('[useAuth] CRITICAL ERROR in checkLoggedIn:', error);
                    localStorage.removeItem("token");
                    setUser(null);
                }
            } else {
                console.log('[useAuth] No token found in localStorage.');
            }

            console.log('[useAuth] Finished check. Setting isLoading to false.');
            setIsLoading(false);
        };

        checkLoggedIn();
    }, []);

    const login = (token: string, user: User) => {
        console.log('[useAuth] login function called.');
        localStorage.setItem("token", token);
        setUser(user);
        setIsLoading(false);
    };

    const logout = () => {
        console.log('[useAuth] logout function called.');
        localStorage.removeItem("token");
        setUser(null);
    };

    return { user, login, logout, isLoading };
}
