import dotenv from 'dotenv';
dotenv.config(); 
import express from 'express';
import { userRouter } from './Routes/user';
import { connectDB } from './db';
import cors from 'cors'

const app = express();
app.use(express.json())
app.use(cors())

// Ensure DB connection before handling any request (for serverless)
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error("DB connection error:", error);
        res.status(500).json({ "Error": "Database connection failed" });
    }
})

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
    next()
})

app.use('/api/v1', userRouter)

// Only listen locally (Vercel handles this in production)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    })
}

export default app;
