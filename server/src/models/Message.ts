import mongoose, { ArrayExpressionOperatorReturningAny, Document, Schema, Types } from "mongoose";

export interface IMessage extends Document {
    _id: Types.ObjectId;
    sender: mongoose.Types.ObjectId;
    content: string;
    chat: mongoose.Types.ObjectId;
    messageType: 'text' | 'image' | 'file';
    readBy: Array<{
        user: mongoose.Types.ObjectId;
        readAt: Date;
    }>;
}

const messageSchema = new Schema<IMessage>({
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    chat: {
        type: Schema.Types.ObjectId,
        ref: 'Chat',
        required: true
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'file'],
        default: 'text'
    },
    readBy: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

export const Message = mongoose.model<IMessage>('Message', messageSchema);
