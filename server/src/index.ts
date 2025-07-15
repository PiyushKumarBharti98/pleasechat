import express from 'express';
import http from 'http';
import connectDB from './config/db';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import userRoutes from './routes/userRoutes';
import chatRoutes from './routes/chatRoutes';
import { SocketManager } from './sockets/socketHandlers';

dotenv.config();

const app = express();
const server = http.createServer();

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/routes/user', userRoutes);
app.use('/routes/chat', chatRoutes);

connectDB()

const socketManager = new SocketManager(server);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();

    server.listen(PORT, () => {
        console.log(`server running on port ${PORT}`);
        console.log(`enviornment:${process.env.NODE_ENV}` || 'development');

    });
};

startServer().catch(error => {
    console.error('failed to start server', error);
    process.exit();
});

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





