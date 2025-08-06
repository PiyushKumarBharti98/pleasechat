import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { validationResult } from 'express-validator';
import redis from '../config/redis';

export interface AuthRequest extends Request {
    user?: any;
}

const CACHE_EXPIRATION_SECONDS = 3600;

export const authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    console.log('Starting authentication process...');
    try {
        const authHeader = req.header('Authorization');
        console.log(`verification starts .....`);
        let token;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
            console.log(`Extracted token: ${token ? 'exists' : 'missing'}`);
            console.log(`the token while verification is  ${token}`);
        } else {
            console.log('No token found - access denied');
            res.status(200).json({
                success: false,
                message: 'access denied , user not authorized'
            });
            return;
        }


        if (!token) {
            console.log('No token provided - access denied');
            res.status(401).json({
                success: false,
                message: 'access denied, user not authorized'
            });
            return;
        }

        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is missing in environment variables');
            throw new Error('Missing JWT secret');
        }

        console.log('Verifying JWT token...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
        console.log(`Token decoded successfully for user ID: ${decoded.userId}`);

        console.log(`Looking up user in database for ID: ${decoded.userId}`);
        const userId = decoded.userId;

        const cachedUser = await redis.get(`user:${userId}`);

        if (cachedUser) {
            console.log(`[AUTH] Cache hit for user id ${userId}`);
            req.user = JSON.parse(cachedUser);
            return next();
        } else {
            console.log(`[AUTH] Cache missed for ${userId} now moving forward with database queries`);
        }

        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            console.log('No user found for the provided token');
            res.status(401).json({
                success: false,
                message: 'invalid token'
            });
            return;
        }
        await redis.setex(
            `user:${user._id}`,
            CACHE_EXPIRATION_SECONDS,
            JSON.stringify(user),
        )

        console.log(`User authenticated successfully: ${user._id}`);
        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({
            success: false,
            message: 'invalid token'
        });
    }
};

export const socketAuthenticate = async (token: string) => {
    console.log('Starting socket authentication...');
    try {
        console.log(`Verifying socket token: ${token}`);
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        console.log(`Socket token decoded for user ID: ${decoded.userId}`);

        const userId = decoded.userId;

        const cachedUser = await redis.get(`user:${userId}`);

        if (cachedUser) {
            console.log(`[SOCKET-AUTH] Cache HIT for user ID: ${userId}`);
            return JSON.parse(cachedUser);
        }

        console.log(`[SOCKET-AUTH] Cache MISS for user ID: ${userId}. Querying database...`);

        console.log(`Looking up socket user in database for ID: ${decoded.userId}`);
        const user = await User.findById(decoded.userId).select('-password');

        if (user) {
            await redis.setex(
                `user:${userId}`,
                CACHE_EXPIRATION_SECONDS,
                JSON.stringify(user)
            );
            console.log(`[SOCKET-AUTH] User ${user.username} (ID: ${userId}) stored in cache.`);
        }



        if (!user) {
            console.log('No user found for socket token');
        } else {
            console.log(`Socket user authenticated: ${user._id}`);
        }

        return user;
    } catch (error) {
        console.error('Socket authentication error:', error);
        return null;
    }
};
