import pool from "../db/db.js";
import { DateTime } from "luxon";

/* ============================================
   ADD / SAVE CLASS SCHEDULE
=============================================== */
const saveClassSchedule = async (req, res) => {
  try {
    const {
      batch_code, // ✅ REQUIRED
      schedules, // ✅ REQUIRED
      from_date, // ✅ REQUIRED
      to_date, // ✅ REQUIRED
      topic, // OPTIONAL
    } = req.body;

    /* ============================
       VALIDATIONS
    ============================ */
    if (!batch_code || !Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({
        success: false,
        message: "batch_code and schedules are required",
      });
    }

    if (!from_date || !to_date) {
      return res.status(400).json({
        success: false,
        message: "from_date and to_date are required",
      });
    }

    /* ============================
       FETCH BATCH + STANDARD
    ============================ */
    const batchResult = await pool.query(
      `SELECT 
         b.batch_code,
         b.batch_name,
         b.standard_id,
         s.standard_name
       FROM tbl_batches b
       JOIN tbl_standard_master s 
         ON s.standard_id = b.standard_id
       WHERE b.batch_code = $1
         AND b.is_active = 'Y'`,
      [batch_code],
    );

    if (batchResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Batch not found or inactive",
      });
    }

    const { batch_name, standard_name } = batchResult.rows[0];

    /* ============================
       AUTO CLASS NAME
    ============================ */
    const class_name = `${standard_name} - ${batch_name}`;

    const userCode = req.user?.user_code || "SYSTEM";
    const now = DateTime.now().setZone("Asia/Kolkata").toISO();

    let totalSlotsInserted = 0;
    const scheduleIds = [];

    /* ============================
       LOOP THROUGH SCHEDULES
    ============================ */
    for (const sch of schedules) {
      const { day_name, start_time, end_time, slot_interval } = sch;

      if (!day_name || !start_time || !end_time || !slot_interval) continue;

      /* ============================
         1️⃣ INSERT CLASS SCHEDULE
      ============================ */
      const scheduleResult = await pool.query(
        `INSERT INTO tbl_class_schedule
         (
           class_name,
           batch_code,
           topic,
           day_name,
           start_time,
           end_time,
           slot_interval,
           from_date,
           to_date,
           created_by,
           created_at
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING id`,
        [
          class_name,
          batch_code,
          topic || null,
          day_name,
          start_time,
          end_time,
          slot_interval,
          from_date,
          to_date,
          userCode,
          now,
        ],
      );

      const scheduleId = scheduleResult.rows[0].id;
      scheduleIds.push(scheduleId);

      /* ============================
         2️⃣ GENERATE WEEKLY SLOTS
      ============================ */
      let currentDate = DateTime.fromISO(from_date);
      const lastDate = DateTime.fromISO(to_date);

      while (currentDate <= lastDate) {
        if (currentDate.toFormat("EEEE") === day_name) {
          let slotStart = DateTime.fromISO(
            `${currentDate.toISODate()}T${start_time}`,
          );

          const slotEnd = DateTime.fromISO(
            `${currentDate.toISODate()}T${end_time}`,
          );

          while (slotStart < slotEnd) {
            const startLabel = slotStart.toFormat("hh:mm a");
            const endLabel = slotStart
              .plus({ minutes: slot_interval })
              .toFormat("hh:mm a");

            const slotRange = `${startLabel} - ${endLabel}`;

            /* 🚫 PREVENT DUPLICATES */
            const exists = await pool.query(
              `SELECT id
               FROM tbl_class_slots
               WHERE class_date = $1
                 AND slot_range = $2
                 AND schedule_id = $3
                 AND batch_code = $4`,
              [currentDate.toISODate(), slotRange, scheduleId, batch_code],
            );

            if (exists.rows.length === 0) {
              await pool.query(
                `INSERT INTO tbl_class_slots
                 (
                   class_date,
                   slot_range,
                   day_name,
                   schedule_id,
                   batch_code,
                   is_active,
                   is_booked,
                   created_by,
                   created_at
                 )
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                [
                  currentDate.toISODate(),
                  slotRange,
                  day_name,
                  scheduleId,
                  batch_code,
                  "Y",
                  "N",
                  userCode,
                  now,
                ],
              );

              totalSlotsInserted++;
            }

            slotStart = slotStart.plus({ minutes: slot_interval });
          }
        }

        currentDate = currentDate.plus({ days: 1 });
      }
    }

    return res.status(201).json({
      success: true,
      message: "Class schedule & slots created successfully",
      class_name,
      batch_code,
      schedule_ids: scheduleIds,
      total_slots_inserted: totalSlotsInserted,
    });
  } catch (error) {
    console.error("Error saving class schedule:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/* ============================================
   GET ALL CLASS SCHEDULES
=============================================== */
const getAllClassSchedules = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM tbl_class_schedule ORDER BY id DESC`,
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching class schedules:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/* ============================================
   UPDATE CLASS SCHEDULE
=============================================== */
const updateClassSchedule = async (req, res) => {
  try {
    const {
      schedule_id,
      day_name,
      start_time,
      end_time,
      slot_interval,
      from_date,
      to_date,
      topic,
    } = req.body;

    if (!schedule_id) {
      return res.status(400).json({
        success: false,
        message: "schedule_id is required",
      });
    }

    const scheduleResult = await pool.query(
      `SELECT * FROM tbl_class_schedule WHERE id = $1`,
      [schedule_id],
    );

    if (scheduleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    const { batch_code } = scheduleResult.rows[0];

    const userCode = req.user?.user_code || "SYSTEM";
    const now = DateTime.now().setZone("Asia/Kolkata").toISO();

    /* ==============================
       UPDATE SCHEDULE TABLE
    ============================== */
    await pool.query(
      `UPDATE tbl_class_schedule
       SET day_name = $1,
           start_time = $2,
           end_time = $3,
           slot_interval = $4,
           from_date = $5,
           to_date = $6,
           topic = $7,
           updated_by = $8,
           updated_at = $9
       WHERE id = $10`,
      [
        day_name,
        start_time,
        end_time,
        slot_interval,
        from_date,
        to_date,
        topic || null,
        userCode,
        now,
        schedule_id,
      ],
    );

    /* ==============================
       DELETE ONLY FUTURE UNUSED SLOTS
    ============================== */

    await pool.query(
      `DELETE FROM tbl_class_slots
       WHERE schedule_id = $1
         AND class_date >= CURRENT_DATE
         AND is_booked = false
         AND class_link IS NULL`,
      [schedule_id],
    );

    /* ==============================
       RE-GENERATE FUTURE SLOTS
    ============================== */

    let currentDate = DateTime.fromISO(from_date);
    const lastDate = DateTime.fromISO(to_date);
    let totalInserted = 0;

    while (currentDate <= lastDate) {
      if (currentDate.toFormat("EEEE") === day_name) {
        let slotStart = DateTime.fromISO(
          `${currentDate.toISODate()}T${start_time}`,
        );

        const slotEnd = DateTime.fromISO(
          `${currentDate.toISODate()}T${end_time}`,
        );

        while (slotStart < slotEnd) {
          const startLabel = slotStart.toFormat("hh:mm a");
          const endLabel = slotStart
            .plus({ minutes: slot_interval })
            .toFormat("hh:mm a");

          const slotRange = `${startLabel} - ${endLabel}`;

          await pool.query(
            `INSERT INTO tbl_class_slots
             (
               class_date,
               slot_range,
               day_name,
               schedule_id,
               batch_code,
               is_active,
               is_booked,
               created_by,
               created_at
             )
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [
              currentDate.toISODate(),
              slotRange,
              day_name,
              schedule_id,
              batch_code,
              true,
              false,
              userCode,
              now,
            ],
          );

          totalInserted++;

          slotStart = slotStart.plus({ minutes: slot_interval });
        }
      }

      currentDate = currentDate.plus({ days: 1 });
    }

    return res.status(200).json({
      success: true,
      message: "Schedule updated safely",
      total_slots_inserted: totalInserted,
    });
  } catch (error) {
    console.error("Update schedule error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const editClassSchedule = async (req, res) => {
  try {
    const {
      schedule_id,
      day_name,
      start_time,
      end_time,
      slot_interval,
      from_date,
      to_date,
    } = req.body;

    if (!schedule_id) {
      return res.status(400).json({
        success: false,
        message: "schedule_id is required",
      });
    }

    /* ============================
       GET EXISTING SCHEDULE
    ============================ */
    const existingSchedule = await pool.query(
      `SELECT * FROM tbl_class_schedule
       WHERE id = $1`,
      [schedule_id],
    );

    if (existingSchedule.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    const { batch_code } = existingSchedule.rows[0];

    const userCode = req.user?.user_code || "SYSTEM";
    const now = DateTime.now().setZone("Asia/Kolkata").toISO();

    /* ============================
       UPDATE SCHEDULE TABLE
    ============================ */
    await pool.query(
      `UPDATE tbl_class_schedule
       SET day_name = $1,
           start_time = $2,
           end_time = $3,
           slot_interval = $4,
           from_date = $5,
           to_date = $6,
           updated_by = $7,
           updated_at = $8
       WHERE id = $9`,
      [
        day_name,
        start_time,
        end_time,
        slot_interval,
        from_date,
        to_date,
        userCode,
        now,
        schedule_id,
      ],
    );

    /* ============================
       DELETE OLD FUTURE SLOTS
    ============================ */
    await pool.query(
      `DELETE FROM tbl_class_slots
       WHERE schedule_id = $1`,
      [schedule_id],
    );

    /* ============================
       RE-GENERATE SLOTS
    ============================ */
    let totalSlotsInserted = 0;

    let currentDate = DateTime.fromISO(from_date);
    const lastDate = DateTime.fromISO(to_date);

    while (currentDate <= lastDate) {
      if (currentDate.toFormat("EEEE") === day_name) {
        let slotStart = DateTime.fromISO(
          `${currentDate.toISODate()}T${start_time}`,
        );

        const slotEnd = DateTime.fromISO(
          `${currentDate.toISODate()}T${end_time}`,
        );

        while (slotStart < slotEnd) {
          const startLabel = slotStart.toFormat("hh:mm a");
          const endLabel = slotStart
            .plus({ minutes: slot_interval })
            .toFormat("hh:mm a");

          const slotRange = `${startLabel} - ${endLabel}`;

          await pool.query(
            `INSERT INTO tbl_class_slots
             (
               class_date,
               slot_range,
               day_name,
               schedule_id,
               batch_code,
               is_active,
               is_booked,
               created_by,
               created_at
             )
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [
              currentDate.toISODate(),
              slotRange,
              day_name,
              schedule_id,
              batch_code,
              "Y",
              "N",
              userCode,
              now,
            ],
          );

          totalSlotsInserted++;

          slotStart = slotStart.plus({ minutes: slot_interval });
        }
      }

      currentDate = currentDate.plus({ days: 1 });
    }

    return res.status(200).json({
      success: true,
      message: "Class schedule updated successfully",
      total_slots_inserted: totalSlotsInserted,
    });
  } catch (error) {
    console.error("Edit class schedule error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/* ============================================
   DELETE CLASS SCHEDULE
=============================================== */
const deleteClassSchedule = async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Schedule id is required",
    });
  }

  try {
    const result = await pool.query(
      `DELETE FROM tbl_class_schedule WHERE id = $1`,
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Class schedule not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Class schedule deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting class schedule:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const deleteClassSlot = async (req, res) => {
  try {
    const { slot_id } = req.body;

    if (!slot_id) {
      return res.status(400).json({
        success: false,
        message: "slot_id is required",
      });
    }

    /* ============================
       CHECK SLOT EXISTS
    ============================ */
    const slotResult = await pool.query(
      `SELECT *
       FROM tbl_class_slots
       WHERE id = $1`,
      [slot_id],
    );

    if (slotResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Slot not found",
      });
    }

    const slot = slotResult.rows[0];

    /* ============================
       SAFETY CHECKS
    ============================ */

    if (slot.is_booked === true) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete booked slot",
      });
    }

    if (slot.class_date < new Date().toISOString().split("T")[0]) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete past slot",
      });
    }

    /* ============================
       DELETE SLOT
    ============================ */

    await pool.query(`DELETE FROM tbl_class_slots WHERE id = $1`, [slot_id]);

    return res.status(200).json({
      success: true,
      message: "Class slot deleted successfully",
      deleted_slot_id: slot_id,
    });
  } catch (error) {
    console.error("Delete class slot error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const updateTopic = async (req, res) => {
  try {
    const { 
      id, 
      topic_name, 
      topic_description, 
      level, 
      category, 
      standard_id,
      is_active 
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Topic id is required",
      });
    }

    if (!topic_name) {
      return res.status(400).json({
        success: false,
        message: "Topic name is required",
      });
    }

    if (!standard_id) {
      return res.status(400).json({
        success: false,
        message: "Standard is required",
      });
    }

    /* ============================
       CHECK IF TOPIC EXISTS
    ============================ */
    const existingTopic = await pool.query(
      `SELECT * FROM tbl_astrology_topics WHERE id = $1`,
      [id],
    );

    if (existingTopic.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Topic not found",
      });
    }

    const userCode = req.user?.user_code || "SYSTEM";
    const now = DateTime.now().setZone("Asia/Kolkata").toISO();

    /* ============================
       UPDATE TOPIC - SIMPLE VERSION
       (without standards table join)
    ============================ */
    await pool.query(
      `UPDATE tbl_astrology_topics
       SET topic_name = $1,
           topic_description = $2,
           level = $3,
           category = $4,
           standard_id = $5,
           is_active = $6,
           updated_by = $7,
           updated_at = $8
       WHERE id = $9`,
      [
        topic_name,
        topic_description || null,
        level || null,
        category || null,
        standard_id,
        is_active ?? true,
        userCode,
        now,
        id,
      ],
    );

    /* ============================
       FETCH UPDATED TOPIC
       (without the standards table join)
    ============================ */
    const updatedTopic = await pool.query(
      `SELECT 
        id,
        topic_name,
        topic_description,
        level,
        category,
        standard_id,
        is_active,
        created_by,
        created_at,
        updated_by,
        updated_at
      FROM tbl_astrology_topics
      WHERE id = $1`,
      [id]
    );

    return res.status(200).json({
      success: true,
      message: "Topic updated successfully",
      data: updatedTopic.rows[0] || { topic_id: id },
    });
  } catch (error) {
    console.error("Update topic error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getClassSlotsByDate = async (req, res) => {
  try {
    const { class_date } = req.body;

    if (!class_date) {
      return res.status(400).json({
        success: false,
        message: "class_date is required (YYYY-MM-DD)",
      });
    }

    const result = await pool.query(
      `SELECT slot_range, day_name
       FROM tbl_class_slots
       WHERE class_date = $1
         AND is_active = TRUE
         AND is_booked = FALSE
       ORDER BY slot_range ASC`,
      [class_date],
    );

    return res.status(200).json({
      success: true,
      date: class_date,
      total_available: result.rows.length,
      slots: result.rows,
    });
  } catch (error) {
    console.error("Error fetching class slots:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const deleteTopic = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Topic id is required",
      });
    }

    /* ============================
       CHECK IF TOPIC EXISTS
    ============================ */
    const topicResult = await pool.query(
      `SELECT * FROM tbl_astrology_topics WHERE id = $1`,
      [id],
    );

    if (topicResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Topic not found",
      });
    }

    const userCode = req.user?.user_code || "SYSTEM";
    const now = DateTime.now().setZone("Asia/Kolkata").toISO();

    /* ============================
       SOFT DELETE (is_active = false)
    ============================ */
    await pool.query(
      `UPDATE tbl_astrology_topics
       SET is_active = false,
           updated_by = $1,
           updated_at = $2
       WHERE id = $3`,
      [userCode, now, id],
    );

    return res.status(200).json({
      success: true,
      message: "Topic deleted successfully (soft delete)",
      deleted_topic_id: id,
    });
  } catch (error) {
    console.error("Delete topic error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const generateAttendanceForDate = async (req, res) => {
  try {
    const { slot_date } = req.body;
    const adminCode = req.user?.user_code;

    /* ===============================
       VALIDATION
    =============================== */
    if (!slot_date) {
      return res.status(400).json({
        success: false,
        message: "slot_date is required (YYYY-MM-DD)",
      });
    }

    /* ===============================
       1️⃣ GET ACTIVE CLASS SLOTS FOR DATE
    =============================== */
    const slotResult = await pool.query(
      `SELECT 
         cs.id AS slot_id,
         cs.class_date,
         cs.slot_range,
         cs.schedule_id,
         sch.batch_code
       FROM tbl_class_slots cs
       JOIN tbl_class_schedule sch 
         ON sch.id = cs.schedule_id
       WHERE cs.class_date = $1
         AND cs.is_active = 'Y'`,
      [slot_date],
    );

    if (slotResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active class slots found for this date",
      });
    }

    /* ===============================
       2️⃣ GET BATCH CODE (ASSUME ONE BATCH PER DAY)
    =============================== */
    const batch_code = slotResult.rows[0].batch_code;

    /* ===============================
       3️⃣ GET ACTIVE STUDENTS OF BATCH
    =============================== */
    const students = await pool.query(
      `SELECT stu_ref_code
       FROM tbl_students
       WHERE batch_code = $1
         AND is_active = 'Y'`,
      [batch_code],
    );

    if (students.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No students found for this batch",
      });
    }

    /* ===============================
       4️⃣ INSERT ATTENDANCE (DEFAULT ABSENT)
    =============================== */
    let inserted = 0;

    for (const slot of slotResult.rows) {
      for (const student of students.rows) {
        await pool.query(
          `INSERT INTO tbl_student_attendance
           (
             stu_ref_code,
             batch_code,
             schedule_id,
             slot_id,
             class_date,
             slot_range,
             status,
             created_by,
             created_at
           )
           VALUES ($1,$2,$3,$4,$5,$6,'ABSENT',$7,CURRENT_TIMESTAMP)
           ON CONFLICT (stu_ref_code, slot_id) DO NOTHING`,
          [
            student.stu_ref_code,
            batch_code,
            slot.schedule_id,
            slot.slot_id,
            slot.class_date,
            slot.slot_range,
            adminCode,
          ],
        );
        inserted++;
      }
    }

    return res.status(200).json({
      success: true,
      message: "Attendance generated successfully",
      slot_date,
      batch_code,
      total_students: students.rows.length,
    });
  } catch (error) {
    console.error("Generate Attendance Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const updateClassTopicByDate = async (req, res) => {
  try {
    const { class_date, topic } = req.body;

    if (!class_date || !topic) {
      return res.status(400).json({
        success: false,
        message: "class_date and topic are required",
      });
    }

    const result = await pool.query(
      `
      UPDATE tbl_class_slots
      SET topic = $1,
          topic_updated_at = NOW()
      WHERE class_date = $2::DATE
      `,
      [topic, class_date],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No class slot found for selected date",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Topic updated successfully",
    });
  } catch (error) {
    console.error("❌ Update topic error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update topic",
    });
  }
};

const getStudentClasses = async (req, res) => {
  try {
    const { batch_code } = req.params;

    if (!batch_code) {
      return res.status(400).json({
        success: false,
        message: "batch_code is required",
      });
    }

    const result = await pool.query(
      `
      SELECT
        cs.id AS slot_id,
        TO_CHAR(cs.class_date, 'YYYY-MM-DD') AS class_date,
        cs.day_name,
        cs.slot_range AS slot_time,

        cs.topic_id,                         -- ✅ ADD topic_id
        t.topic_name,                        -- ✅ ADD topic_name

        sch.class_name,
        sch.id AS schedule_id
      FROM tbl_class_slots cs
      JOIN tbl_class_schedule sch
        ON sch.id = cs.schedule_id
      LEFT JOIN tbl_astrology_topics t
        ON t.id = cs.topic_id                -- ✅ JOIN topic table
      WHERE cs.batch_code = $1
        AND cs.is_active = TRUE
      ORDER BY cs.class_date ASC, cs.slot_range ASC
      `,
      [batch_code],
    );

    return res.status(200).json({
      success: true,
      total_slots: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("❌ Student classes error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch classes",
    });
  }
};

const getStudentClassesFromToken = async (req, res) => {
  try {
    const userCode = req.user?.user_code;

    if (!userCode) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // 🔹 Get student reference code from token
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

    // 🔹 Fetch class slots for ALL batches assigned to student
    const result = await pool.query(
      `
      SELECT
        cs.id AS slot_id,
        TO_CHAR(cs.class_date, 'YYYY-MM-DD') AS class_date,
        cs.day_name,
        cs.slot_range AS slot_time,

        cs.class_link,                 -- ✅ ADD THIS

        cs.topic_id,
        t.topic_name,

        sch.class_name,
        sch.id AS schedule_id

      FROM tbl_class_slots cs

      JOIN tbl_class_schedule sch
        ON sch.id = cs.schedule_id

      LEFT JOIN tbl_astrology_topics t
        ON t.id = cs.topic_id

      WHERE cs.batch_code IN (
        SELECT sb.batch_code
        FROM tbl_student_batches sb
        WHERE sb.stu_ref_code = $1
      )
      AND cs.is_active = TRUE

      ORDER BY
        cs.class_date ASC,
        cs.slot_range ASC
      `,
      [stuRefCode],
    );

    return res.status(200).json({
      success: true,
      total_slots: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("❌ Student classes (token) error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student classes",
    });
  }
};

const updateClassLinkBySlotId = async (req, res) => {
  try {
    const { slot_id, class_link, updated_by } = req.body;

    // 🔍 Basic validation
    if (!slot_id || !class_link || !updated_by) {
      return res.status(400).json({
        success: false,
        message: "slot_id, class_link and updated_by are required",
      });
    }

    // 🔍 Check if slot exists & is active
    const slotCheck = await pool.query(
      `
      SELECT id
      FROM tbl_class_slots
      WHERE id = $1
        AND is_active = true
      `,
      [slot_id],
    );

    if (slotCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Class slot not found or inactive",
      });
    }

    // ✅ Update class link
    const updateResult = await pool.query(
      `
  UPDATE tbl_class_slots
  SET class_link = $1
  WHERE id = $2
  RETURNING id, class_link
  `,
      [class_link, slot_id],
    );

    return res.status(200).json({
      success: true,
      message: "Class link updated successfully",
      data: updateResult.rows[0],
    });
  } catch (error) {
    console.error("Update class link error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const markAttendanceOnJoin = async (req, res) => {
  try {
    const userCode = req.user?.user_code;
    const { slot_id } = req.body;

    if (!userCode || !slot_id) {
      return res.status(400).json({
        success: false,
        message: "Invalid request",
      });
    }

    // 🔹 Get student ref code
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
        message: "Not a student account",
      });
    }

    const stuRefCode = studentRes.rows[0].stu_ref_code;

    // 🔹 Get slot + batch
    const slotRes = await pool.query(
      `
      SELECT batch_code
      FROM tbl_class_slots
      WHERE id = $1
        AND is_active = TRUE
      `,
      [slot_id],
    );

    if (slotRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Class slot not found",
      });
    }

    const batchCode = slotRes.rows[0].batch_code;

    // 🔹 Insert attendance (IGNORE if already marked)
    await pool.query(
      `
      INSERT INTO tbl_student_attendance
        (slot_id, stu_ref_code, batch_code)
      VALUES ($1, $2, $3)
      ON CONFLICT (slot_id, stu_ref_code) DO NOTHING
      `,
      [slot_id, stuRefCode, batchCode],
    );

    return res.status(200).json({
      success: true,
      message: "Attendance marked successfully",
    });
  } catch (error) {
    console.error("❌ Mark attendance error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark attendance",
    });
  }
};

const getMyAttendanceFromToken = async (req, res) => {
  try {
    const userCode = req.user?.user_code;

    if (!userCode) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // 🔹 Get student reference code
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

    // 🔹 Fetch attendance for this student
    const result = await pool.query(
      `
      SELECT
        a.slot_id,
        TO_CHAR(cs.class_date, 'YYYY-MM-DD') AS class_date,
        cs.day_name,
        cs.slot_range AS slot_time,
        cs.batch_code,
        a.attendance_status,
        TO_CHAR(a.marked_at, 'YYYY-MM-DD HH24:MI:SS') AS marked_at
      FROM tbl_student_attendance a
      JOIN tbl_class_slots cs
        ON cs.id = a.slot_id
      WHERE a.stu_ref_code = $1
      ORDER BY cs.class_date DESC
      `,
      [stuRefCode],
    );

    return res.status(200).json({
      success: true,
      total_classes: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("❌ Get my attendance error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance",
    });
  }
};

const getAttendanceByBatch = async (req, res) => {
  try {
    const { batch_code } = req.body;

    if (!batch_code) {
      return res.status(400).json({
        success: false,
        message: "batch_code is required",
      });
    }

    /* =====================================================
       🔁 STEP 1: AUTO-MARK ABSENT FOR COMPLETED CLASSES
       ===================================================== */
    await pool.query(
      `
      INSERT INTO tbl_student_attendance (
        slot_id,
        stu_ref_code,
        batch_code,
        attendance_status,
        marked_at
      )
      SELECT
        cs.id AS slot_id,
        sb.stu_ref_code,
        cs.batch_code,
        'ABSENT',
        NOW()
      FROM tbl_class_slots cs
      JOIN tbl_student_batches sb
        ON sb.batch_code = cs.batch_code
      WHERE cs.batch_code = $1
        AND cs.is_active = TRUE
        AND (
          cs.class_date < CURRENT_DATE
          OR (
            cs.class_date = CURRENT_DATE
            AND CURRENT_TIME >
              split_part(cs.slot_range, ' - ', 2)::time
          )
        )
        AND NOT EXISTS (
          SELECT 1
          FROM tbl_student_attendance a
          WHERE a.slot_id = cs.id
            AND a.stu_ref_code = sb.stu_ref_code
        );
      `,
      [batch_code],
    );

    /* =====================================================
       📊 STEP 2: FETCH ATTENDANCE (UPDATED DATA)
       ===================================================== */
    const result = await pool.query(
      `
      SELECT
        a.slot_id,
        TO_CHAR(cs.class_date, 'YYYY-MM-DD') AS class_date,
        cs.day_name,
        cs.slot_range AS slot_time,

        a.stu_ref_code,
        s.first_name,
        s.last_name,
        s.email,

        a.attendance_status,
        TO_CHAR(a.marked_at, 'YYYY-MM-DD HH24:MI:SS') AS marked_at

      FROM tbl_student_attendance a

      JOIN tbl_students s
        ON s.stu_ref_code = a.stu_ref_code

      JOIN tbl_class_slots cs
        ON cs.id = a.slot_id

      WHERE a.batch_code = $1
        AND cs.is_active = TRUE

      ORDER BY
        cs.class_date DESC,
        cs.slot_range ASC,
        s.first_name ASC
      `,
      [batch_code],
    );

    return res.status(200).json({
      success: true,
      batch_code,
      total_records: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("❌ Admin getAttendanceByBatch error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance",
    });
  }
};

const getStandards = async (req, res) => {
  try {
    const query = `
      SELECT
        standard_id,
        standard_name,
        standard_description
      FROM tbl_standard_master
      WHERE is_active = true
      ORDER BY standard_id ASC
    `;

    const { rows } = await pool.query(query);

    return res.status(200).json({
      success: true,
      message: "Standards fetched successfully",
      data: rows,
    });
  } catch (error) {
    console.error("Get Standards Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch standards",
    });
  }
};


export const getScheduleForAdmin = async (req, res) => {
  try {

   const result = await pool.query(`
  SELECT 
    "batch_code",
    "batch_name",
    "class_name",
    "topic",
    "day_name",
    "start_time",
    "end_time",
    "from_date",
    "to_date"
  FROM tbl_class_schedule
  ORDER BY "from_date" ASC
`);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error("Error fetching schedule:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch schedule"
    });
  }
};

/* ============================================
   EXPORT ALL FUNCTIONS
=============================================== */
export {
  saveClassSchedule,
  getAllClassSchedules,
  deleteClassSchedule,
  getClassSlotsByDate,
  generateAttendanceForDate,
  markAttendanceOnJoin,
  updateClassTopicByDate,
  getStudentClasses,
  getStudentClassesFromToken,
  updateClassLinkBySlotId,
  getMyAttendanceFromToken,
  getAttendanceByBatch,
  getStandards,
  updateClassSchedule,
  editClassSchedule,
  deleteClassSlot,
  updateTopic,
  deleteTopic,
  
};