import express from 'express';
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { authenticate, AuthRequest } from '../middlewares/authMiddleware';

const router = express.Router();

// Register route with detailed logging
router.post('/register', [
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 2 }).withMessage('Password must be at least 6 characters')
], async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('[REGISTER] Handler started.');
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('[REGISTER] Validation failed.');
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
            return;
        }

        const { username, email, password } = req.body;
        console.log(`[REGISTER] Data received for user: ${username}`);

        console.log('[REGISTER] Step 1: Checking for existing user...');
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });
        console.log('[REGISTER] Step 2: Finished checking for existing user.');

        if (existingUser) {
            console.log('[REGISTER] User already exists. Sending error response.');
            res.status(400).json({
                success: false,
                message: 'User already exists'
            });
            return;
        }

        console.log('[REGISTER] Step 3: Creating new user instance...');
        const user = new User({ username, email, password });

        console.log('[REGISTER] Step 4: Saving user to database...');
        await user.save();
        console.log('[REGISTER] Step 5: User saved successfully.');

        console.log('[REGISTER] Step 6: Generating token...');
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET!,
            { expiresIn: '7d' }
        );

        console.log('[REGISTER] Step 7: Sending success response.');
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    isOnline: user.isOnline,
                    lastSeen: user.lastSeen,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                },
                token
            }
        });
    } catch (error) {
        console.error('[REGISTER] An error occurred in the handler:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Login route (unchanged)
router.post('/login', [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').exists().withMessage('Please enter your password')
], async (req: Request, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
            return;
        }

        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            res.status(400).json({
                success: false,
                message: 'Invalid user'
            });
            return;
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
            return;
        }

        user.isOnline = true;
        await user.save();

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET!,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                _id: user._id,
                username: user.username,
                email: user.email,
                isOnline: user.isOnline,
                lastSeen: user.lastSeen,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            },
            token
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'Unauthorized: User not found'
        });
        return;
    }

    res.json({
        success: true,
        data: {
            user: req.user
        }
    });
});

router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized: User not found'
            });
            return;
        }

        await User.findByIdAndUpdate(req.user._id, {
            isOnline: false,
            lastSeen: new Date()
        });

        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

router.get('/test', (req: Request, res: Response) => {
    res.json({ message: 'API is working' });
});

export default router;

// import express from 'express';
// import { Request, Response } from 'express';
// // Note: All other imports like User, jwt, etc., are removed for this test.
//
// const router = express.Router();
//
// // A radically simplified register route for debugging.
// // It is no longer async and has no external dependencies.
// router.post('/register', (req: Request, res: Response) => {
//
//     // This is the most important line. If you see this in your terminal, we've made a breakthrough.
//     console.log('[DEBUG] The simplified /register route was successfully reached!');
//
//     // It immediately sends back a simple JSON response.
//     res.status(200).json({ success: true, message: 'Debug route reached successfully.' });
// });
//
//
// // All other routes are commented out for this test to prevent any interference.
// /*
// import { authenticate, AuthRequest } from '../middlewares/authMiddleware';
//
// router.post('/login', async (req: Request, res: Response) => { ... });
// router.get('/me', authenticate, async (req: AuthRequest, res: Response) => { ... });
// router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => { ... });
// router.get('/test', (req: Request, res: Response) => { ... });
// */
//
// export default router;
