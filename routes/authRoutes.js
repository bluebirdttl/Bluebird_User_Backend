import express from 'express';
import { loginUser, signupUser, updatePassword } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', loginUser);
router.post('/signup', signupUser);
router.post('/update-password', updatePassword);

export default router;