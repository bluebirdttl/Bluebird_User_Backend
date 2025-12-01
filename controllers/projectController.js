import supabase from '../db/supabaseClient.js';

// Get all projects
export const getProjects = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create a new project
export const createProject = async (req, res) => {
    try {
        const {
            empid,
            project_name,
            leader_name,
            required_skills,
            end_date,
            status,
            description
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
                    description
                }
            ])
            .select();

        if (error) throw error;

        res.status(201).json(data[0]);
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
        const {
            project_name,
            leader_name,
            required_skills,
            end_date,
            status,
            description
        } = req.body;

        // Ensure required_skills is an array
        let skillsArray = [];
        if (Array.isArray(required_skills)) {
            skillsArray = required_skills;
        } else if (typeof required_skills === 'string') {
            skillsArray = required_skills.split(',').map(s => s.trim()).filter(s => s);
        }

        const { data, error } = await supabase
            .from('projects')
            .update({
                project_name,
                leader_name,
                required_skills: skillsArray,
                end_date,
                status,
                description
            })
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
