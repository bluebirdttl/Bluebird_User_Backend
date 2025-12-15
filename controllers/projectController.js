import supabase from '../db/supabaseClient.js';
import { broadcastNotification } from './notificationController.js';

// Get all projects
// Get all projects with Creator Name manually mapped
export const getProjects = async (req, res) => {
    try {
        const { data: projects, error } = await supabase
            .from('projects')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        // Manual Join: Fetch creator names for these empids
        // This avoids Foreign Key errors if constraints aren't set up
        const empids = [...new Set(projects.map(p => p.empid).filter(id => id))];

        let creatorMap = {};
        if (empids.length > 0) {
            const { data: employees, error: empError } = await supabase
                .from('employees')
                .select('empid, name')
                .in('empid', empids);

            if (!empError && employees) {
                employees.forEach(e => creatorMap[e.empid] = e.name);
            }
        }

        const enrichedData = projects.map(p => ({
            ...p,
            creator_name: creatorMap[p.empid] || "Unknown"
        }));

        res.status(200).json(enrichedData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create a new project
export const createProject = async (req, res) => {
    try {
        let {
            empid,
            project_name,
            leader_name,
            required_skills,
            end_date,
            status,
            description,
            poc1,
            poc2,
            poc3
        } = req.body;





        // Ensure required_skills is an array (Supabase handles JSONB automatically if passed as array/object)
        let skillsArray = [];
        if (Array.isArray(required_skills)) {
            skillsArray = required_skills;
        } else if (typeof required_skills === 'string') {
            skillsArray = required_skills.split(',').map(s => s.trim()).filter(s => s);
        }

        const { data, error } = await supabase
            .from('projects')
            .insert([
                {
                    empid: empid || 0, // Default to 0 if not provided
                    project_name,
                    leader_name,
                    required_skills: skillsArray,
                    end_date,
                    status,
                    description,
                    poc1,
                    poc2,
                    poc3
                }
            ])
            .select();

        if (error) throw error;

        res.status(201).json(data[0]);

        // Broadcast Notification to all ICs (Non-Managers)
        // We assume "IC" or empty role_type implies non-manager.
        // broadcastNotification will handle fetching appropriate users.
        broadcastNotification("IC", {
            title: "New Activity Available",
            message: `A new activity "${project_name}" has been posted. Check it out!`,
            url: "/inline-activities"
        });
    } catch (error) {
        console.error("Error creating project:", error);
        res.status(500).json({ error: error.message });
    }
};

// Update project status
export const updateProjectStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const { data, error } = await supabase
            .from('projects')
            .update({ status })
            .eq('id', id)
            .select();

        if (error) throw error;

        res.status(200).json(data[0]);
    } catch (error) {
        console.error("Error updating project status:", error);
        res.status(500).json({ error: error.message });
    }
};

// Update entire project
export const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        let {
            user_empid,
            project_name,
            leader_name,
            required_skills,
            end_date,
            status,
            description,
            poc1,
            poc2,
            poc3
        } = req.body;

        // Verify Ownership
        const { data: existing } = await supabase
            .from('projects')
            .select('empid')
            .eq('id', id)
            .single();

        if (existing) {
            // If user_empid is provided, verify it matches
            if (user_empid && String(existing.empid) !== String(user_empid)) {
                return res.status(403).json({ error: "Unauthorized: Only the creator can edit this activity." });
            }
        }

        // Ensure required_skills is an array
        let skillsArray = [];
        if (Array.isArray(required_skills)) {
            skillsArray = required_skills;
        } else if (typeof required_skills === 'string') {
            skillsArray = required_skills.split(',').map(s => s.trim()).filter(s => s);
        }

        const updatePayload = {
            project_name,
            leader_name,
            required_skills: skillsArray,
            end_date,
            status,
            description,
            poc1,
            poc2,
            poc3
        }

        const { data, error } = await supabase
            .from('projects')
            .update(updatePayload)
            .eq('id', id)
            .select();

        if (error) throw error;

        res.status(200).json(data[0]);
    } catch (error) {
        console.error("Error updating project:", error);
        res.status(500).json({ error: error.message });
    }
};

// Delete project
export const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_empid } = req.body;

        // Verify Ownership
        const { data: existing } = await supabase
            .from('projects')
            .select('empid')
            .eq('id', id)
            .single();

        if (existing) {
            if (user_empid && String(existing.empid) !== String(user_empid)) {
                return res.status(403).json({ error: "Unauthorized: Only the creator can delete this activity." });
            }
        }

        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.status(200).json({ message: "Project deleted successfully" });
    } catch (error) {
        console.error("Error deleting project:", error);
        res.status(500).json({ error: error.message });
    }
};
