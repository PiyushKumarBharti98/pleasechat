import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';

export interface IUserSchema {
    _id: Types.ObjectId;
    username: string;
    email: string;
    password: string;
    isOnline: boolean;
    lastSeen: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface IUserMethods {
    comparePassword(candidatePassword: string): Promise<boolean>;
}

export type IUser = IUserSchema & IUserMethods & Document;

export interface IUserModel extends Model<IUser> {
}


const userSchema = new Schema<IUser, IUserModel>({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
}, {
    timestamps: true
});

userSchema.pre<IUser>('save', async function(next) {
    console.log('[User.ts PRE-SAVE] Hook started.');

    if (!this.isModified('password')) {
        console.log('[User.ts PRE-SAVE] Password not modified, skipping hash.');
        return next();
    }

    try {
        console.log('[User.ts PRE-SAVE] Generating salt...');
        const salt = await bcrypt.genSalt(10);
        console.log('[User.ts PRE-SAVE] Salt generated. Hashing password...');
        this.password = await bcrypt.hash(this.password, salt);
        console.log('[User.ts PRE-SAVE] Password hashed successfully.');
        next();
    } catch (error: any) {
        console.error('[User.ts PRE-SAVE] Error during password hashing:', error);
        next(error);
    }
});

userSchema.method<IUser>('comparePassword', async function(candidatePassword: string): Promise<boolean> {
    if (!this.password) {
        console.warn('Attempted to compare password on a document without a password.');
        return false;
    }
    return bcrypt.compare(candidatePassword, this.password);
});


export const User = mongoose.model<IUser, IUserModel>('User', userSchema);
