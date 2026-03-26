import bcrypt from "bcryptjs";
import pool from "../db/db.js";
import { DateTime } from "luxon";

/* ===============================
   UTILITIES
================================ */
function generateStudentCode() {
  return "STD" + Math.floor(1000 + Math.random() * 9000);
}

function generateUserCode() {
  return "USR" + Math.floor(1000 + Math.random() * 9000);
}

/* ===============================================
      ADMIN → ADD STUDENT (WITH BATCH)
================================================ */
export const addstudent = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      password,
      phone_no,
      is_in_batch, // 'Y' | 'N'
    } = req.body;

    /* =====================
       FORCE ROLE (SECURITY)
    ===================== */
    const role = "STD"; // 🔒 NEVER accept role from frontend

    const stu_ref_code = generateStudentCode();
    const createdBy = req.user?.user_code || "SYSTEM";
    const createdAt = DateTime.now().setZone("Asia/Kolkata").toISO();

    /* =====================
       VALIDATION
    ===================== */
    if (!first_name || !last_name || !email || !password || !is_in_batch) {
      return res.status(400).json({
        success: false,
        message:
          "first_name, last_name, email, password, is_in_batch are required",
      });
    }

    if (!["Y", "N"].includes(is_in_batch)) {
      return res.status(400).json({
        success: false,
        message: "is_in_batch must be 'Y' or 'N'",
      });
    }

    /* =====================
       CHECK USER (REGISTER)
    ===================== */
    const existingUser = await pool.query(
      `SELECT user_code FROM tbl_register WHERE email = $1`,
      [email],
    );

    let user_code;

    if (existingUser.rows.length > 0) {
      user_code = existingUser.rows[0].user_code;
    } else {
      user_code = generateUserCode();

      // 🔐 AUTH TABLE
      await pool.query(
        `INSERT INTO tbl_register
         (email, role_ref_code, user_code, created_at, created_by, is_active)
         VALUES ($1,$2,$3,$4,$5,'Y')`,
        [email, role, user_code, createdAt, createdBy],
      );

      const hashedPassword = await bcrypt.hash(password, 10);

      await pool.query(
        `INSERT INTO tbl_login
         (email, password, user_code_ref, is_active, auto_logout)
         VALUES ($1,$2,$3,'Y','Y')`,
        [email, hashedPassword, user_code],
      );
    }

    /* =====================
       CHECK STUDENT PROFILE
    ===================== */
    const existingStudent = await pool.query(
      `SELECT stu_ref_code FROM tbl_students WHERE email = $1`,
      [email],
    );

    if (existingStudent.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Student already exists",
      });
    }

    /* =====================
       INSERT STUDENT PROFILE
    ===================== */
    await pool.query(
      `INSERT INTO tbl_students
       (
         first_name,
         last_name,
         email,
         phone_no,
         stu_ref_code,
         user_code,
         is_in_batch,
         batch_code,
         created_at,
         created_by,
         is_active
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Y')`,
      [
        first_name,
        last_name,
        email,
        phone_no || null,
        stu_ref_code,
        user_code,
        is_in_batch,
        null, // batch assigned later
        createdAt,
        createdBy,
      ],
    );

    /* =====================
       SUCCESS RESPONSE
    ===================== */
    return res.status(201).json({
      success: true,
      message: "Student added successfully",
      stu_ref_code,
      is_in_batch,
    });
  } catch (error) {
    console.error("Add student error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};


export const editStudent = async (req, res) => {
  try {
    const {
      stu_ref_code,
      first_name,
      last_name,
      email,
      phone_no,
      is_in_batch,
      password,
    } = req.body;

    const updatedBy = req.user?.user_code || "SYSTEM";
    const updatedAt = DateTime.now().setZone("Asia/Kolkata").toISO();

    /* =====================
       VALIDATION
    ===================== */

    if (!stu_ref_code) {
      return res.status(400).json({
        success: false,
        message: "stu_ref_code is required",
      });
    }

    if (is_in_batch && !["Y", "N"].includes(is_in_batch)) {
      return res.status(400).json({
        success: false,
        message: "is_in_batch must be 'Y' or 'N'",
      });
    }

    /* =====================
       CHECK STUDENT EXISTS
    ===================== */

    const student = await pool.query(
      `SELECT * FROM tbl_students WHERE stu_ref_code = $1`,
      [stu_ref_code]
    );

    if (student.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const user_code = student.rows[0].user_code;

    /* =====================
       UPDATE STUDENT
    ===================== */

    await pool.query(
      `UPDATE tbl_students
       SET
         first_name = COALESCE($1, first_name),
         last_name = COALESCE($2, last_name),
         email = COALESCE($3, email),
         phone_no = COALESCE($4, phone_no),
         is_in_batch = COALESCE($5, is_in_batch),
         updated_at = $6,
         updated_by = $7
       WHERE stu_ref_code = $8`,
      [
        first_name,
        last_name,
        email,
        phone_no,
        is_in_batch,
        updatedAt,
        updatedBy,
        stu_ref_code,
      ]
    );

    /* =====================
       UPDATE EMAIL IN AUTH TABLES
    ===================== */

    if (email) {
      await pool.query(
        `UPDATE tbl_register SET email = $1 WHERE user_code = $2`,
        [email, user_code]
      );

      await pool.query(
        `UPDATE tbl_login SET email = $1 WHERE user_code_ref = $2`,
        [email, user_code]
      );
    }

    /* =====================
       UPDATE PASSWORD
    ===================== */

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);

      await pool.query(
        `UPDATE tbl_login 
         SET password = $1 
         WHERE user_code_ref = $2`,
        [hashedPassword, user_code]
      );
    }

    /* =====================
       SUCCESS RESPONSE
    ===================== */

    return res.status(200).json({
      success: true,
      message: "Student updated successfully",
      stu_ref_code,
    });

  } catch (error) {
    console.error("Edit student error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/* ===============================================
      GET ALL STUDENTS
================================================ */
export const getAllStudents = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM tbl_students WHERE is_active = 'Y' ORDER BY created_at DESC`,
    );

    return res.status(200).json({
      success: true,
      total: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get All Students Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ===============================================
      GET STUDENT BY USER CODE
================================================ */
export const getStudentById = async (req, res) => {
  const { user_code } = req.body;

  if (!user_code) {
    return res.status(400).json({
      success: false,
      message: "user_code is required",
    });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM tbl_students
       WHERE user_code = $1 AND is_active = 'Y'`,
      [user_code],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Get Student Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ===============================================
      STUDENT → UPDATE EXTRA DETAILS
================================================ */
export const updatestudentdetails = async (req, res) => {
  try {
    const user_code = req.user?.user_code;

    if (!user_code) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized student",
      });
    }

    // 🔥 Match frontend payload
    const {
      full_name: name,
      phone_no: contact_number,
      email,
      address,
      birth_date,
      birth_time,
      whatsapp_group,
      qualification,
      studied_astrology,
      computer_knowledge,
      class_mode,
    } = req.body;

    const now = DateTime.now().setZone("Asia/Kolkata").toISO();

    await pool.query(
      `INSERT INTO student_details (
        user_ref_code,
        name,
        email,
        contact_number,
        address,
        birth_date,
        birth_time,
        whatsapp_group,
        qualification,
        studied_astrology,
        computer_knowledge,
        class_mode,
        created_by,
        created_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
      )
      ON CONFLICT (user_ref_code)
      DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        contact_number = EXCLUDED.contact_number,
        address = EXCLUDED.address,
        birth_date = EXCLUDED.birth_date,
        birth_time = EXCLUDED.birth_time,
        whatsapp_group = EXCLUDED.whatsapp_group,
        qualification = EXCLUDED.qualification,
        studied_astrology = EXCLUDED.studied_astrology,
        computer_knowledge = EXCLUDED.computer_knowledge,
        class_mode = EXCLUDED.class_mode,
        updated_by = $13,
        updated_at = $14`,
      [
        user_code,
        name ?? null,
        email ?? null,
        contact_number ?? null,
        address ?? null,
        birth_date ?? null,
        birth_time ?? null,
        whatsapp_group ?? null,
        qualification ?? null,
        studied_astrology ?? null,
        computer_knowledge ?? null,
        class_mode ?? null,
        user_code,
        now,
      ],
    );

    return res.status(200).json({
      success: true,
      message: "Student details saved successfully",
    });
  } catch (error) {
    console.error("Update Student Details Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAllStudentDetails = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        id,
        user_ref_code,
        name,
        email,
        contact_number,
        address,
        birth_date,
        birth_time,
        whatsapp_group,
        qualification,
        studied_astrology,
        computer_knowledge,
        class_mode,
        created_by,
        created_at,
        updated_by,
        updated_at
      FROM student_details
      ORDER BY created_at DESC
      `,
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get All Student Details Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getStudentDetails = async (req, res) => {
  try {
    const role = req.user?.role;

    // 🔐 ADMIN ONLY
    if (role !== "ADM") {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    // Optional: fetch single student
    const user_code = req.params?.user_code || req.query?.user_code;

    let query = `
      SELECT
        id,
        user_ref_code,
        name,
        email,
        contact_number,
        batch_name,
        fees,
        certificate_marksheet_code,
        marks_obtained,
        address,
        birth_date,
        birth_time,
        whatsapp_group,
        qualification,
        studied_astrology,
        computer_knowledge,
        class_mode,
        created_at,
        updated_at
      FROM student_details
    `;

    const values = [];

    // 🧠 If admin wants a specific student
    if (user_code) {
      query += ` WHERE user_ref_code = $1`;
      values.push(user_code);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student details not found",
      });
    }

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: user_code ? result.rows[0] : result.rows,
    });
  } catch (error) {
    console.error("Get Student Details Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* ===============================================
      STUDENT → GET FULL PROFILE
================================================ */
export const getStudentFullDetails = async (req, res) => {
  const user_code = req.user?.user_code;

  if (!user_code) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const student = await pool.query(
      `SELECT first_name, last_name, email, phone_no, stu_ref_code, batch_name
       FROM tbl_students
       WHERE user_code = $1`,
      [user_code],
    );

    const details = await pool.query(
      `SELECT fees, certificate_marksheet_code, marks_obtained
       FROM student_details
       WHERE user_ref_code = $1`,
      [user_code],
    );

    return res.status(200).json({
      success: true,
      data: {
        basic_details: student.rows[0] || {},
        extra_details: details.rows[0] || {},
      },
    });
  } catch (error) {
    console.error("Get Student Full Details Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getStudentClassSchedule = async (req, res) => {
  try {
    const user_code = req.user?.user_code;
    const role = req.user?.role;

    if (!user_code || role !== "STD") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized student",
      });
    }

    /* 1️⃣ Get student batch */
    const { rows: studentRows } = await pool.query(
      `SELECT batch_code
        FROM tbl_students
        WHERE user_code = $1`,
      [user_code],
    );

    if (studentRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student batch not found",
      });
    }

    const batch_code = studentRows[0].batch_code;

    /* 2️⃣ Fetch ONLY required fields */
    const { rows: schedule } = await pool.query(
      `SELECT
          class_name,
          topic,
          day_name,
          start_time,
          end_time,
          slot_interval,
          from_date,
          to_date
        FROM tbl_class_schedule
        WHERE batch_code = $1
        ORDER BY from_date, day_name`,
      [batch_code],
    );

    return res.status(200).json({
      success: true,
      schedule,
    });
  } catch (error) {
    console.error("Get Student Schedule Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const checkStudentRegistration = async (req, res) => {
  try {
    const user_code = req.user?.user_code;

    if (!user_code) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // 🔍 Just check existence
    const result = await pool.query(
      `SELECT 1 FROM student_details WHERE user_ref_code = $1 LIMIT 1`,
      [user_code],
    );

    return res.status(200).json({
      success: true,
      isRegistered: result.rows.length > 0,
    });
  } catch (error) {
    console.error("Check Student Registration Error:", error);
    return res.status(500).json({
      success: false,
      message: "Hi abhi server error",
    });
  }
};

export const deleteStudentDetails = async (req, res) => {
  const client = await pool.connect();

  try {
    const role = req.user?.role;

    if (role !== "ADM") {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const { user_ref_code } = req.body;

    if (!user_ref_code) {
      return res.status(400).json({
        success: false,
        message: "user_ref_code is required",
      });
    }

    await client.query("BEGIN");

    // 🔹 Delete from student_details
    const detailsDelete = await client.query(
      `DELETE FROM student_details
       WHERE user_ref_code = $1
       RETURNING user_ref_code`,
      [user_ref_code],
    );

    // 🔹 Delete from tbl_students
    const studentDelete = await client.query(
      `DELETE FROM tbl_students
       WHERE user_code = $1
       RETURNING user_code`,
      [user_ref_code],
    );

    // If both tables have no record
    if (detailsDelete.rows.length === 0 && studentDelete.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Student not found in database",
      });
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Student deleted successfully from all records",
      deleted_user_ref_code: user_ref_code,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Delete Student Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
};

export const getStudentsByBatch = async (req, res) => {
  try {
    const { batch_code } = req.body;

    if (!batch_code) {
      return res.status(400).json({
        success: false,
        message: "Batch code is required",
      });
    }

    const result = await pool.query(
      `
      SELECT 
          s."stu_ref_code",
          CONCAT(s."first_name", ' ', s."last_name") AS student_name,
          s."email",
          s."phone_no",
          sb."joined_at"
      FROM tbl_student_batches sb
      JOIN tbl_students s 
        ON sb."stu_ref_code" = s."stu_ref_code"
      WHERE sb."batch_code" = $1
      ORDER BY sb."joined_at" DESC
      `,
      [batch_code],
    );

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching students by batch:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }


};


