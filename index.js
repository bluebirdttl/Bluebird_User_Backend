import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import employeeRoutes from './routes/employeeRoutes.js';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
// import sheetDB from "./db/connection.js";

dotenv.config();

const app = express();

// -----------------------------
// Middleware
// -----------------------------
app.use(cors({
    origin: [
        'http://localhost:5000',
        'http://localhost:3000',
        'http://localhost:3001'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true
}));

app.use(express.json());



// -----------------------------
// Backend Health Check
// -----------------------------
app.get('/', (req, res) => {
    res.send('Backend is running');
});

// -----------------------------
// App Routes
// -----------------------------
app.use('/api/employees', employeeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

// 404 Handler
app.use((req, res) => {

    res.status(404).send('Route not found');
});

// -----------------------------
// Start Server
// -----------------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
    console.log(`Backend running on port ${PORT}`)
);

// TEST ROUTE TO CHECK SHEETDB CONNECTION
app.get("/test-db", async (req, res) => {
    try {
        const response = await sheetDB.get("/");
        res.json({
            success: true,
            rows: response.data.length,
            sample: response.data[0]
        });
    } catch (err) {
        console.error("DB Test Error →", err.message);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

export default app;
