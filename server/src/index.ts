import express from 'express';
import http from 'http';
import connectDB from './config/db';
import cookieParser from 'cookie-parser';
import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import userRoutes from './routes/userRoutes';
import chatRoutes from './routes/chatRoutes';
import { SocketManager } from './sockets/socketHandlers';

dotenv.config();

const app = express();
const server = http.createServer(app);

console.log('--- Environment Variable Check ---');
console.log(`MONGO_URI read by Node: ${process.env.MONGO_URI}`);
console.log('--------------------------------');


app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    allowedHeaders: "Content-Type, Authorization"
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.method === 'POST') {
        console.log('Request Body:', req.body);
    }
    next();
});

app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);


const socketManager = new SocketManager(server);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        server.listen(PORT, () => {
            console.log(`server running on port ${PORT}`);
            console.log(`enviornment:${process.env.NODE_ENV}` || 'development');
            console.log(`accepting requests from ${process.env.CLIENT_URL}`)
        });
    } catch (error) {
        console.log('failed to start server', error);
        process.exit(1);
    }
};

startServer();

process.on('SIGTERM', () => {
    console.log('SIGTERM recieved , shutting down gracefully');
    server.close(() => {
        console.log('process terminated');
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT recieved, shutting down gracefully');
    server.close(() => {
        console.log('process terminated');
    });
});
