import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { validationResult } from 'express-validator';

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', ''); // Note the space

        if (!token) {
            res.status(401).json({
                success: false,
                message: 'access denied, user not authorized'
            });
            return;
        }

        if (!process.env.JWT_SECRET) {
            throw new Error('Missing JWT secret');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            res.status(401).json({
                success: false,
                message: 'invalid token'
            });
            return;
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'invalid token'
        });
    }
};

export const socketAuthenticate = async (token: string) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const user = await User.findById(decoded.userId).select('-password');
        return user;
    } catch (error) {
        return null;
    }
};


