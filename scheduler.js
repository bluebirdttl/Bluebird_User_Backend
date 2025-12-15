import cron from 'node-cron';
import supabase from './db/supabaseClient.js';
import { sendNotificationToUser } from './controllers/notificationController.js';

const startScheduler = () => {
    console.log("Starting Inactivity Scheduler...");

    // Run every day at 10:00 AM
    cron.schedule('0 10 * * *', async () => {
        console.log("Running Inactivity Check...");
        try {
            const fifteenDaysAgo = new Date();
            fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
            const cutoff = fifteenDaysAgo.toISOString();

            // Fetch users with:
            // 1. role_type != Manager (so ICs/Employees)
            // 2. last_login < 15 days ago OR null
            // 3. updated_at < 15 days ago OR null
            // Supabase doesn't support complex OR filters easily in one query for different fields
            // So we'll fetch all ICs and filter in JS (assuming dataset isn't massive)
            // Or better: fetch ICs where updated_at < cutoff AND last_login < cutoff

            // NOTE: We assume 'Manager' is the role to exclude.
            const { data: employees, error } = await supabase
                .from('employees')
                .select('empid, name, last_login, updated_at, role_type')
                .neq('role_type', 'Manager');

            if (error) throw error;

            let count = 0;
            for (const emp of employees) {
                const lastLogin = emp.last_login ? new Date(emp.last_login) : new Date(0); // If never logged in, treat as old
                const lastUpdate = emp.updated_at ? new Date(emp.updated_at) : new Date(0); // If never updated, treat as old

                const cutoffDate = new Date(cutoff);

                // Conditions:
                // last_login < cutoff AND last_login < cutoff
                // Inactive on app (>15 days) AND Not updated details (>15 days)

                if (lastLogin < cutoffDate && lastUpdate < cutoffDate) {
                    // Send Notification
                    sendNotificationToUser(emp.empid, {
                        title: "Update Your Details",
                        message: "It's been 15 days! Please update your Skills and Availability in the Details screen.",
                        url: "/details",
                        icon: '/Logo/taking-off.png',
                        image: '/Logo/MainLogo.png'
                    });
                    count++;
                }
            }
            console.log(`Inactivity Check Complete. Sent ${count} notifications.`);

        } catch (err) {
            console.error("Scheduler Error:", err);
        }
    });
};

export default startScheduler;
