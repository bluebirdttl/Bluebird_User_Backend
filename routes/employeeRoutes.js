import express from 'express';
import { getAllEmployees, getEmployeeById, updateEmployee, updateEmployeeStars, getDashboardMetrics } from '../controllers/employeeController.js';

const router = express.Router();

router.get('/dashboard-metrics', getDashboardMetrics);
router.get('/', getAllEmployees);
router.get('/:empid', getEmployeeById);
router.put('/:empid', updateEmployee);
router.patch('/:empid', updateEmployee);
router.patch('/:empid/stars', updateEmployeeStars);

export default router; // ✅ ES Module export
