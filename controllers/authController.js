import supabase from "../db/supabaseClient.js";
import { sendNotificationToUser } from "./notificationController.js";

// ---------------------------
// LOGIN USER
// ---------------------------
export const loginUser = async (req, res) => {
  const { username, password } = req.body;
  const identifier = (username || "").trim();

  if (!identifier || !password)
    return res.status(400).json({ error: "Username and password required" });

  try {
    // Supabase search filter: match by username
    const { data: users, error } = await supabase
      .from('employees')
      .select('*, role_type')
      .eq('username', identifier);

    if (error) throw error;

    if (!users || users.length === 0)
      return res.status(401).json({ error: "Invalid credentials" });

    const user = users[0];

    if (user.password !== password)
      return res.status(401).json({ error: "Invalid credentials" });

    const safeUser = {
      empid: user.empid,
      name: user.name,
      username: user.username,
      role: user.role,
      role_type: user.role_type,
      ...user // Include all fields
    };

    // Send Notification
    sendNotificationToUser(user.empid, {
      title: "New Login Detected",
      message: `Login detected for ${user.username || user.name} at ${new Date().toLocaleTimeString()}`,
      url: "/"
    });

    // Update last_login
    await supabase.from('employees').update({ last_login: new Date().toISOString() }).eq('empid', user.empid);

    res.json({ success: true, user: safeUser });

  } catch (err) {
    console.error("Login error →", err);
    res.status(500).json({ error: "Supabase login error" });
  }
};

// ---------------------------
// SIGNUP USER
// ---------------------------
export const signupUser = async (req, res) => {
  const { username, password, name } = req.body;

  if (!username || !password || !name)
    return res.status(400).json({ error: "All fields required" });

  try {
    const { data: existing, error: findError } = await supabase
      .from('employees')
      .select('*')
      .eq('username', username.trim());

    if (findError) throw findError;

    if (existing.length > 0)
      return res.status(409).json({ error: "Username already registered" });

    const empid = `E${String(Date.now()).slice(-6)}`;

    // Supabase insert
    const { error: insertError } = await supabase
      .from('employees')
      .insert([
        {
          empid,
          name,
          username: username.trim(),
          password,
          availability: "Occupied",
          hours_available: "",
          from_date: "",
          to_date: "",
          current_skills: "[]",
          interests: "[]",
          previous_projects: "[]",
          role: "Employee",
        }
      ]);

    if (insertError) throw insertError;

    res.json({ success: true, message: "Account created successfully" });
  } catch (err) {
    console.error("Signup error →", err);
    res.status(500).json({ error: "Supabase signup error" });
  }
};

// ---------------------------
// UPDATE PASSWORD
// ---------------------------
export const updatePassword = async (req, res) => {
  const { empid, currentPassword, newPassword } = req.body;

  if (!empid || !currentPassword || !newPassword) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // 1. Fetch current user to verify password
    const { data: users, error: fetchError } = await supabase
      .from('employees')
      .select('password')
      .eq('empid', empid)
      .single();

    if (fetchError || !users) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2. Verify current password
    console.log(`[UpdatePassword] Verifying: DB=${users.password} vs Input=${currentPassword}`);
    if (users.password !== currentPassword) {
      console.log("[UpdatePassword] Password mismatch!");
      return res.status(401).json({ error: "Incorrect current password" });
    }

    // 3. Update to new password
    const { error: updateError } = await supabase
      .from('employees')
      .update({ password: newPassword })
      .eq('empid', empid);

    if (updateError) throw updateError;

    // Send Notification
    sendNotificationToUser(empid, {
      title: "Password Changed",
      message: "Your password has been successfully updated.",
      url: "/profile"
    });

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Update password error →", err);
    res.status(500).json({ error: "Failed to update password" });
  }
};
