import mongoose, { Document, Schema, Types } from "mongoose";

export interface IChat extends Document {
    _id: Types.ObjectId;
    name?: string;
    isGroupChat: boolean;
    participants: mongoose.Types.ObjectId[];
    admin: mongoose.Types.ObjectId;
    lastMessage: mongoose.Types.ObjectId;
}

const chatSchema = new Schema<IChat>({
    name: {
        type: String,
        trim: true,
        maxLength: 50
    },

    isGroupChat: {
        type: Boolean,
        default: false
    },

    participants: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],

    admin: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    lastMessage: {
        type: Schema.Types.ObjectId,
        ref: 'Message'
    }
}, {
    timestamps: true

}

);

export const Chat = mongoose.model<IChat>('Chat', chatSchema);
