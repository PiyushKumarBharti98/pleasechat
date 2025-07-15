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


const userSchema = new Schema<IUser, IUserModel>({ // Pass both DocumentType and ModelType
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
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

userSchema.pre<IUser>('save', async function(next) { // Type 'this' as IUser
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error: any) { // Explicitly type error as 'any' or 'Error'
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
