import express from 'express';
import { getProjects, createProject, updateProjectStatus, deleteProject, updateProject } from '../controllers/projectController.js';

const router = express.Router();

console.log("Project Routes Loaded");

router.get('/', getProjects);
router.post('/', createProject);
router.patch('/:id/status', updateProjectStatus);
router.patch('/:id', updateProject);
router.delete('/:id', deleteProject);

export default router;
