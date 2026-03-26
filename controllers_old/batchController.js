import pool from "../db/db.js";
import { DateTime } from "luxon";

/* ===============================
   UTIL
================================ */
function generateBatchCode() {
  return "BAT" + Math.floor(1000 + Math.random() * 9000);
}

/* =====================================================
   1️⃣ CREATE EMPTY BATCH (ADMIN)
===================================================== */
export const createBatch = async (req, res) => {
  try {
    const { batch_name, standard_id } = req.body; // ✅ READ IT
    const createdBy = req.user?.user_code || "SYSTEM";
    const now = DateTime.now().setZone("Asia/Kolkata").toISO();

    if (!batch_name || !standard_id) {
      return res.status(400).json({
        success: false,
        message: "batch_name and standard_id are required",
      });
    }

    const batch_code = generateBatchCode();

    await pool.query(
      `INSERT INTO tbl_batches
       (batch_code, batch_name, standard_id, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [batch_code, batch_name, standard_id, createdBy, now],
    );

    return res.status(201).json({
      success: true,
      message: "Batch created successfully",
      data: {
        batch_code,
        batch_name,
        standard_id,
      },
    });
  } catch (error) {
    console.error("Create batch error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const updateBatch = async (req, res) => {
  try {
    const { batch_code, batch_name, standard_id, is_active } = req.body;

    const updatedBy = req.user?.user_code || "SYSTEM";
    const now = DateTime.now().setZone("Asia/Kolkata").toISO();

    if (!batch_code) {
      return res.status(400).json({
        success: false,
        message: "batch_code is required",
      });
    }

    if (!batch_name || !standard_id) {
      return res.status(400).json({
        success: false,
        message: "batch_name and standard_id are required",
      });
    }

    const existingBatch = await pool.query(
      `SELECT * FROM tbl_batches WHERE batch_code = $1`,
      [batch_code],
    );

    if (existingBatch.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    await pool.query(
      `UPDATE tbl_batches
       SET batch_name = $1,
           standard_id = $2,
           is_active = $3,
           updated_by = $4,
           updated_at = $5
       WHERE batch_code = $6`,
      [batch_name, standard_id, is_active || "Y", updatedBy, now, batch_code],
    );

    return res.status(200).json({
      success: true,
      message: "Batch updated successfully",
    });
  } catch (error) {
    console.error("Update batch error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};



/* =====================================================
   2️⃣ GET STUDENTS ELIGIBLE FOR BATCH
   (is_in_batch = 'Y' AND batch_code IS NULL)
===================================================== */
export const getEligibleBatchStudents = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        s.stu_ref_code,
        s.first_name,
        s.last_name,
        s.email,
        s.phone_no
      FROM tbl_students s
      WHERE s.is_in_batch = 'Y'
        AND s.batch_code IS NULL
        AND s.is_active = 'Y'
        AND NOT EXISTS (
          SELECT 1
          FROM tbl_student_batches sb
          WHERE sb.stu_ref_code = s.stu_ref_code
        )
      ORDER BY s.created_at DESC
      `,
    );

    return res.status(200).json({
      success: true,
      total: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Eligible batch students error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/* =====================================================
   3️⃣ ASSIGN STUDENTS TO EXISTING BATCH
===================================================== */
export const assignStudentsToBatch = async (req, res) => {
  try {
    const { batch_code, student_ref_codes } = req.body;

    if (
      !batch_code ||
      !Array.isArray(student_ref_codes) ||
      student_ref_codes.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "batch_code and student_ref_codes array are required"
      });
    }

    const now = DateTime.now().setZone("Asia/Kolkata").toISO();
    const updatedBy = req.user?.user_code || "SYSTEM";

    const result = await pool.query(
      `UPDATE tbl_students
       SET batch_code = $1,
           updated_by = $2,
           updated_at = $3
       WHERE stu_ref_code = ANY($4::varchar[])
         AND is_active = 'Y'`,
      [
        batch_code,
        updatedBy,
        now,
        student_ref_codes
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Students assigned to batch successfully",
      total_assigned: result.rowCount
    });

  } catch (error) {
    console.error("Assign batch error:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


/* =====================================================
   4️⃣ GET ALL BATCHES
===================================================== */
export const getAllBatches = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         b.batch_code,
         b.batch_name,
         b.is_active,
         b.created_at,
         b.standard_id,
         s.standard_name
       FROM tbl_batches b
       LEFT JOIN tbl_standard_master s
         ON b.standard_id = s.standard_id
       ORDER BY b.created_at DESC`,
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get batches error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};


/* =====================================================
   5️⃣ GET STUDENTS OF A BATCH
===================================================== */
export const getStudentsByBatch = async (req, res) => {
  try {
    const { batch_code } = req.body;

    if (!batch_code) {
      return res.status(400).json({
        success: false,
        message: "batch_code is required"
      });
    }

    const result = await pool.query(
      `SELECT 
         stu_ref_code,
         first_name,
         last_name,
         email,
         phone_no
       FROM tbl_students
       WHERE batch_code = $1
         AND is_active = 'Y'
       ORDER BY first_name`,
      [batch_code]
    );

    return res.status(200).json({
      success: true,
      total: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error("Get students by batch error:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};



/* =====================================================
   6️⃣ UPGRADE STUDENT TO NEW BATCH (MULTI-BATCH SUPPORT)
===================================================== */
export const upgradeStudentBatch = async (req, res) => {
  const client = await pool.connect();

  try {
    const { stu_ref_code, batch_code } = req.body;

    if (!stu_ref_code || !batch_code) {
      return res.status(400).json({
        success: false,
        message: "stu_ref_code and batch_code are required",
      });
    }

    await client.query("BEGIN");

    // 1️⃣ Check student
    const studentCheck = await client.query(
      `SELECT 1 FROM tbl_students
       WHERE stu_ref_code = $1 AND is_active = 'Y'`,
      [stu_ref_code],
    );

    if (studentCheck.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // 2️⃣ Check batch
    const batchCheck = await client.query(
      `SELECT 1 FROM tbl_batches
       WHERE batch_code = $1 AND is_active = 'Y'`,
      [batch_code],
    );

    if (batchCheck.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Batch not found or inactive",
      });
    }

    // 3️⃣ Check duplicate
    const alreadyExists = await client.query(
      `SELECT 1 FROM tbl_student_batches
       WHERE stu_ref_code = $1 AND batch_code = $2`,
      [stu_ref_code, batch_code],
    );

    if (alreadyExists.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Student already assigned to this batch",
      });
    }

    // 4️⃣ Insert mapping
    await client.query(
      `INSERT INTO tbl_student_batches (stu_ref_code, batch_code)
       VALUES ($1, $2)`,
      [stu_ref_code, batch_code],
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Student upgraded to new batch successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Upgrade batch error:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  } finally {
    client.release();
  }
};

export const getAssignedBatches = async (req, res) => {
  try {
    const userCode = req.user?.user_code;

    if (!userCode) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // ✅ Identify student from DB (NOT role)
    const studentRes = await pool.query(
      `
      SELECT stu_ref_code
      FROM tbl_students
      WHERE user_code = $1
        AND is_active = 'Y'
      `,
      [userCode],
    );

    if (studentRes.rowCount === 0) {
      return res.status(403).json({
        success: false,
        message: "This account is not a student",
      });
    }

    const stuRefCode = studentRes.rows[0].stu_ref_code;

    // ✅ Fetch assigned batches
    const result = await pool.query(
      `
      SELECT 
        b.batch_code,
        b.batch_name
      FROM tbl_student_batches sb
      JOIN tbl_batches b
        ON b.batch_code = sb.batch_code
      WHERE sb.stu_ref_code = $1
        AND b.is_active = 'Y'
      ORDER BY b.created_at
      `,
      [stuRefCode],
    );

    return res.status(200).json({
      success: true,
      student_code: stuRefCode,
      total_batches: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get assigned batches error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};



export const getStudentDashboardClasses = async (req, res) => {
  try {
    const userCode = req.user?.user_code;

    if (!userCode) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // 🔹 Identify student
    const studentRes = await pool.query(
      `
      SELECT stu_ref_code
      FROM tbl_students
      WHERE user_code = $1 AND is_active = 'Y'
      `,
      [userCode],
    );

    if (studentRes.rowCount === 0) {
      return res.status(403).json({
        success: false,
        message: "This account is not a student",
      });
    }

    const stuRefCode = studentRes.rows[0].stu_ref_code;

    // 🔹 Fetch dashboard classes (old + upgraded batches)
    const result = await pool.query(
      `
      SELECT
        cs.id AS slot_id,
        cs.batch_code,
        b.batch_name,
        cs.from_date,
        cs.to_date,
        cs.start_time,
        cs.class_name AS topic_name,
        CASE
          WHEN CURRENT_DATE < cs.from_date THEN 'UPCOMING'
          WHEN CURRENT_DATE > cs.to_date THEN 'COMPLETED'
          ELSE 'TODAY'
        END AS class_status
      FROM tbl_student_batches sb
      JOIN tbl_class_schedule cs
        ON cs.batch_code = sb.batch_code
      JOIN tbl_batches b
        ON b.batch_code = cs.batch_code
      WHERE sb.stu_ref_code = $1
      ORDER BY
        CASE
          WHEN CURRENT_DATE > cs.to_date THEN 3
          WHEN CURRENT_DATE BETWEEN cs.from_date AND cs.to_date THEN 1
          ELSE 2
        END,
        cs.from_date DESC,
        cs.start_time
      `,
      [stuRefCode],
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Dashboard classes error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getBatchesByStandard = async (req, res) => {
  try {
    const { standard_id } = req.body;

    if (!standard_id) {
      return res.status(400).json({
        success: false,
        message: "standard_id is required",
      });
    }

    const result = await pool.query(
      `SELECT
         b.batch_code,
         b.batch_name,
         b.is_active,
         b.created_at,
         b.standard_id,
         s.standard_name
       FROM tbl_batches b
       INNER JOIN tbl_standard_master s
         ON b.standard_id = s.standard_id
       WHERE b.standard_id = $1
         AND b.is_active = 'Y'   -- ✅ ONLY ACTIVE
       ORDER BY b.created_at DESC`,
      [standard_id],
    );

    return res.status(200).json({
      success: true,
      total: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get batches by standard error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};



export const deleteBatch = async (req, res) => {
  try {
    const { batch_code } = req.body;
    const updated_by = req.user?.user_code || null;

    if (!batch_code) {
      return res.status(400).json({
        success: false,
        message: "Batch code is required",
      });
    }

    const result = await pool.query(
      `
      UPDATE tbl_batches
      SET is_active = 'N',
          updated_by = $1,
          updated_at = NOW()
      WHERE batch_code = $2
      RETURNING *
      `,
      [updated_by, batch_code],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Batch deleted successfully",
    });
  } catch (error) {
    console.error("Delete Batch Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};







