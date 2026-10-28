import express from 'express';
import { getAllEmployees, getEmployeeById, updateEmployee, updateEmployeeStars, getEmployeeStarsHistory, getDashboardMetrics } from '../controllers/employeeController.js';

const router = express.Router();

router.get('/dashboard-metrics', getDashboardMetrics);
router.get('/', getAllEmployees);
router.get('/:empid/stars', getEmployeeStarsHistory);
router.patch('/:empid/stars', updateEmployeeStars);
router.get('/:empid', getEmployeeById);
router.put('/:empid', updateEmployee);
router.patch('/:empid', updateEmployee);

export default router; // ✅ ES Module export
