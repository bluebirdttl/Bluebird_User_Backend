// Backend/controllers/employeeController.js
import supabase from "../db/supabaseClient.js";

/**
 * Utilities
 */

// Parse stored list-like values (stringified JSON, CSV, newline or array)
const safeJsonParse = (value) => {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "object") {
    try {
      return Object.values(value).flat().filter(Boolean);
    } catch {
      return [];
    }
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return [];
    // try JSON
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch { }
    // split by newline or comma
    return s.split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean);
  }
  return [];
};

// Normalize lists to JSON string for storage. Return undefined if input omitted.
const normalizeListForStore = (val) => {
  if (val === undefined || val === null) return undefined;
  if (Array.isArray(val)) return JSON.stringify(val.filter(Boolean));
  if (typeof val === "string") {
    const s = val.trim();
    if (s === "") return JSON.stringify([]);
    // try parse JSON string
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return JSON.stringify(parsed.filter(Boolean));
    } catch { }
    // split by newline/comma
    const arr = s.split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean);
    return JSON.stringify(arr);
  }
  // coerce other values into single-element array
  return JSON.stringify([String(val)]);
};

/**
 * Controllers
 */

// GET ALL
export const getAllEmployees = async (req, res) => {
  const { search = "", availability = "" } = req.query;
  try {
    const { data: employees, error } = await supabase
      .from('employees')
      .select('*')
      .order('empid', { ascending: true });

    if (error) throw error;

    const filtered = (employees || [])
      .filter((emp) => {
        const name = (emp.name || "").toString().toLowerCase();
        const skills = (emp.current_skills || "").toString().toLowerCase();
        const matchesSearch =
          !search ||
          name.includes(search.toLowerCase()) ||
          skills.includes(search.toLowerCase());
        const matchesAvail =
          !availability || availability === "All" || emp.availability === availability;
        return matchesSearch && matchesAvail;
      })
      .map((emp) => ({
        ...emp,
        current_skills: safeJsonParse(emp.current_skills),
        interests: safeJsonParse(emp.interests),
        previous_projects: safeJsonParse(emp.previous_projects),
      }));
    res.json(filtered);
  } catch (err) {
    console.error("Fetch employees error →", err);
    res.status(500).json({ error: "Supabase fetch error" });
  }
};

// GET by empid
export const getEmployeeById = async (req, res) => {
  const { empid } = req.params;
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('empid', empid);

    if (error) throw error;

    if (!data || data.length === 0) return res.status(404).json({ error: "Employee not found" });
    const emp = data[0];
    emp.current_skills = safeJsonParse(emp.current_skills);
    emp.interests = safeJsonParse(emp.interests);
    emp.previous_projects = safeJsonParse(emp.previous_projects);
    res.json(emp);
  } catch (err) {
    console.error("Fetch employee error →", err);
    res.status(500).json({ error: "Supabase fetch error" });
  }
};

// UPDATE (partial-safe)
export const updateEmployee = async (req, res) => {
  // console.log("updateEmployee HIT!", req.params, req.body);
  const { empid } = req.params;
  const profileFields = ["empid", "name", "email", "role", "cluster", "cluster2"];
  const detailScalarFields = ["current_project", "availability", "hours_available", "from_date", "to_date", "stars"];
  try {
    // fetch existing
    const { data: findData, error: findError } = await supabase
      .from('employees')
      .select('*')
      .eq('empid', empid);

    if (findError) throw findError;
    if (!findData || findData.length === 0) return res.status(404).json({ error: "Employee not found" });
    const existing = findData[0];

    const body = req.body || {};
    // console.log("Update Body:", body);
    const updatePayload = {};

    // NUCLEAR DEBUG: Direct Star Update
    if (body.stars !== undefined) {
      // console.log("Direct Star Update Triggered:", body.stars);
      const { data: starData, error: starError } = await supabase
        .from('employees')
        .update({ stars: body.stars })
        .eq('empid', empid)
        .select();

      if (starError) {
        console.error("Star Update Error:", starError);
        return res.status(500).json({ error: starError.message });
      }
      return res.json({ success: true, message: "Star updated directly", data: starData });
    }

    // DEBUG: ISOLATION - Only update name
    // if (body.name) updatePayload.name = body.name;

    // PROFILE fields
    profileFields.forEach((f) => {
      if (Object.prototype.hasOwnProperty.call(body, f)) {
        if (body[f] === undefined) return;
        updatePayload[f] = body[f];
        // map otherRole to role_type as well for compatibility
        // if (f === "otherRole") updatePayload["role_type"] = body[f];
      }
    });

    // DETAIL list fields -> normalize JSON strings
    if (Object.prototype.hasOwnProperty.call(body, "current_skills")) {
      const val = normalizeListForStore(body.current_skills);
      if (val !== undefined) updatePayload.current_skills = val;
    }
    if (Object.prototype.hasOwnProperty.call(body, "interests")) {
      const val = normalizeListForStore(body.interests);
      if (val !== undefined) updatePayload.interests = val;
    }
    if (Object.prototype.hasOwnProperty.call(body, "previous_projects")) {
      const val = normalizeListForStore(body.previous_projects);
      if (val !== undefined) updatePayload.previous_projects = val;
    }

    // DETAIL scalar fields (current_project kept as plain string)
    detailScalarFields.forEach((f) => {
      if (Object.prototype.hasOwnProperty.call(body, f)) {
        if (body[f] === undefined) return;
        updatePayload[f] = body[f];
      }
    });

    // handle noCurrentProject flag (clear current_project)
    if (Object.prototype.hasOwnProperty.call(body, "noCurrentProject")) {
      if (body.noCurrentProject) updatePayload.current_project = "";
    }

    // Explicitly handle stars to ensure it's captured
    if (body.stars !== undefined) {
      updatePayload.stars = body.stars;
    }

    // console.log("Final Update Payload:", updatePayload);

    if (Object.keys(updatePayload).length === 0) {
      console.warn("Update payload is empty! Body was:", body);
      // return res.status(400).json({ error: "No valid fields provided for update" });
    }

    // Validation around Partially Available
    const isAvailabilityUpdate = ["availability", "hours_available", "from_date", "to_date"].some(k => Object.prototype.hasOwnProperty.call(updatePayload, k));
    // console.log("Update Payload:", updatePayload);
    // console.log("isAvailabilityUpdate:", isAvailabilityUpdate);

    if (isAvailabilityUpdate) {
      const finalAvailability = updatePayload.availability !== undefined ? updatePayload.availability : existing.availability;
      const hoursProvided = updatePayload.hours_available !== undefined ? updatePayload.hours_available : existing.hours_available;
      const fromProvided = updatePayload.from_date !== undefined ? updatePayload.from_date : existing.from_date;
      const toProvided = updatePayload.to_date !== undefined ? updatePayload.to_date : existing.to_date;

      if (finalAvailability !== "Partially Available") {
        // Auto-cleanup: if not partial, these must be null
        if (hoursProvided || fromProvided || toProvided) {
          updatePayload.hours_available = null;
          updatePayload.from_date = null;
          updatePayload.to_date = null;
        }
      } else {
        // If Partial, ensure we have values (either in update or existing)
        if (!hoursProvided || !fromProvided || !toProvided) {
          return res.status(400).json({ error: 'Hours, from date, and to date are required for "Partially Available"' });
        }
      }
    }

    // set updated_at
    // set updated_at
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    updatePayload.updated_at = istDate.toISOString();

    // perform update
    const { data: updatedData, error: updateError } = await supabase
      .from('employees')
      .update(updatePayload)
      .eq('empid', empid)
      .select();

    if (updateError) throw updateError;

    // return refreshed row
    const updatedRow = updatedData && updatedData.length > 0 ? updatedData[0] : null;
    if (updatedRow) {
      updatedRow.current_skills = safeJsonParse(updatedRow.current_skills);
      updatedRow.interests = safeJsonParse(updatedRow.interests);
      updatedRow.previous_projects = safeJsonParse(updatedRow.previous_projects);
    }

    res.json({ success: true, message: "Employee updated", data: updatedRow || null });
  } catch (err) {
    console.error("Update employee error →", err);
    res.status(500).json({ error: "Supabase update error", details: err.message || err });
  }
};

// UPDATE STARS ONLY
export const updateEmployeeStars = async (req, res) => {
  const { empid } = req.params;
  const { stars } = req.body;

  // console.log(`updateEmployeeStars HIT! empid: ${empid}, stars: ${stars}`);

  if (stars === undefined) {
    return res.status(400).json({ error: "Stars value is required" });
  }

  try {
    const { data, error } = await supabase
      .from('employees')
      .update({ stars })
      .eq('empid', empid)
      .select();

    if (error) throw error;

    res.json({ success: true, message: "Stars updated successfully", data });
  } catch (err) {
    console.error("Star update error →", err);
    res.status(500).json({ error: "Failed to update stars" });
  }
};
// GET DASHBOARD METRICS
export const getDashboardMetrics = async (req, res) => {
  // console.log("getDashboardMetrics HIT!");
  try {
    // Fetch only necessary fields to minimize data transfer
    const { data: employees, error } = await supabase
      .from('employees')
      .select('cluster, cluster2, role, availability, hours_available');

    if (error) throw error;

    // Initialize metrics
    const metrics = {
      partialHoursDistribution: {},
      clusters: { "MEBM": 0, "M&T": 0, "S&PS Insitu": 0, "S&PS Exsitu": 0 },
      roles: {},
      totalPartialHours: 0,
      totalAvailableHours: 0
    };

    employees.forEach(emp => {
      // 1. Partial Hours
      if (emp.availability === "Partially Available" && emp.hours_available) {
        const label = String(emp.hours_available).trim();
        metrics.partialHoursDistribution[label] = (metrics.partialHoursDistribution[label] || 0) + 1;
      }

      // 2. Clusters (Check both cluster and cluster2)
      const clustersToCheck = [emp.cluster, emp.cluster2];

      clustersToCheck.forEach(c => {
        const empCluster = (c || "").trim();
        if (!empCluster) return;

        if (metrics.clusters.hasOwnProperty(empCluster)) {
          metrics.clusters[empCluster]++;
        } else {
          // Case-insensitive match
          const key = Object.keys(metrics.clusters).find(k => k.toLowerCase() === empCluster.toLowerCase());
          if (key) {
            metrics.clusters[key]++;
          }
        }
      });

      // 3. Roles
      const r = (emp.role || "Unknown").trim();
      metrics.roles[r] = (metrics.roles[r] || 0) + 1;

      // 4. Total Capacity Calculation
      const avail = (emp.availability || "").toLowerCase();
      // console.log(`Emp: ${emp.cluster} | Avail: ${emp.availability} | Hours: ${emp.hours_available}`);

      if (avail === "partially available" && emp.hours_available) {
        const h = parseFloat(emp.hours_available);
        if (!isNaN(h)) {
          metrics.totalPartialHours = (metrics.totalPartialHours || 0) + h;
        }
      } else if (avail === "available") {
        // Assuming 8 hours/day for full availability
        metrics.totalAvailableHours = (metrics.totalAvailableHours || 0) + 8;
      }
    });
    // console.log("Calculated Metrics:", metrics);

    res.json(metrics);
  } catch (err) {
    console.error("Dashboard metrics error →", err);
    res.status(500).json({ error: "Failed to fetch dashboard metrics" });
  }
};
