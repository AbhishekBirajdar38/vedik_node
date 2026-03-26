import pool from "../db/db.js";
import { DateTime } from "luxon";

/* ============================================
   1️⃣ ADD OR UPDATE SCHEDULE (tbl_schedule)
   + INSERT SLOTS INTO tbl_slots
=============================================== */

/* ============================================
   1️⃣ SAVE SCHEDULE + GENERATE WEEKLY RECURRING SLOTS
=============================================== */
export const saveSchedule = async (req, res) => {
  try {
    const { schedules, from_date, to_date } = req.body;

    if (!schedules || schedules.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Schedules array is required"
      });
    }

    if (!from_date || !to_date) {
      return res.status(400).json({
        success: false,
        message: "from_date and to_date are required"
      });
    }

    const userCode = req.user?.user_code || "SYSTEM";
    const now = DateTime.now().setZone("Asia/Kolkata").toISO();

    let totalInserted = 0;
    const scheduleIds = [];

    for (const sch of schedules) {
      const { day_name, slots } = sch;

      if (!day_name || !Array.isArray(slots) || slots.length === 0) continue;

      // 1️⃣ Insert schedule
      const scheduleInsert = await pool.query(
        `INSERT INTO tbl_schedule
         (day_name, from_date, to_date, created_by, created_at)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id`,
        [day_name, from_date, to_date, userCode, now]
      );

      const scheduleId = scheduleInsert.rows[0].id;
      scheduleIds.push(scheduleId);

      let currentDate = DateTime.fromISO(from_date);
      const lastDate = DateTime.fromISO(to_date);

      // 2️⃣ Repeat same slot ranges on matching weekdays
      while (currentDate <= lastDate) {
        if (currentDate.toFormat("EEEE") === day_name) {
          for (const slotRange of slots) {
            const exists = await pool.query(
              `SELECT id FROM tbl_slots
               WHERE slot_date = $1 AND slot_range = $2`,
              [currentDate.toISODate(), slotRange]
            );

            if (exists.rows.length === 0) {
              await pool.query(
                `INSERT INTO tbl_slots
                 (slot_date, slot_range, day_name, schedule_id,
                  is_booked, is_active, created_by, created_at)
                 VALUES ($1,$2,$3,$4,false,true,$5,$6)`,
                [
                  currentDate.toISODate(),
                  slotRange,
                  day_name,
                  scheduleId,
                  userCode,
                  now
                ]
              );
              totalInserted++;
            }
          }
        }
        currentDate = currentDate.plus({ days: 1 });
      }
    }

    return res.status(200).json({
      success: true,
      schedule_ids: scheduleIds,
      total_slots_inserted: totalInserted,
      message: "Slots generated successfully"
    });

  } catch (error) {
    console.error("Error generating slots:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};



/* ============================================
   2️⃣ GENERATE AVAILABLE SLOTS BY DATE
=============================================== */
export const getSlotsByDate = async (req, res) => {
  try {
    const { appointment_date } = req.body;

    const result = await pool.query(
      `SELECT slot_range
       FROM tbl_slots
       WHERE slot_date = $1
         AND is_booked = FALSE
         AND is_active = TRUE
       ORDER BY slot_time ASC`,
      [appointment_date]
    );

    return res.status(200).json({
      success: true,
      date: appointment_date,
      available_slots: result.rows.map((r) => r.slot_range),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================
   3️⃣ MARK SLOT AS BOOKED (Internal Method)
=============================================== */
export const bookSlot = async (
  slot_range,
  slot_date,
  appointment_code,
  userCode
) => {
  const result = await pool.query(
    `UPDATE tbl_slots
     SET is_booked = TRUE,
         appointment_code = $1,
         updated_by = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE slot_date = $3
       AND slot_range = $4
       AND is_booked = FALSE`,
    [appointment_code, userCode, slot_date, slot_range]
  );

  if (result.rowCount === 0) {
    throw new Error("Slot already booked or not found");
  }
};


export const getSlotsBySpecificDate = async (req, res) => {
  try {
    const { slot_date } = req.body;

    if (!slot_date) {
      return res.status(400).json({
        success: false,
        message: "slot_date is required (YYYY-MM-DD)",
      });
    }

    const result = await pool.query(
      `SELECT 
         slot_date,
         slot_range,
         day_name
       FROM tbl_slots
       WHERE slot_date = $1
         AND is_active = TRUE
         AND is_booked = FALSE
       ORDER BY slot_range ASC`,
      [slot_date]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: `No available slots for date ${slot_date}`, // ✅ FIXED
        date: slot_date,
        total_available: 0,
        slots: [],
      });
    }

    return res.status(200).json({
      success: true,
      date: slot_date,
      total_available: result.rows.length,
      slots: result.rows,
    });
  } catch (error) {
    console.error("Error fetching slots:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};


export const getSlotInterval = async (req, res) => {
  try {
    const { slot_interval } = req.body;

    // Validate input
    if (!slot_interval) {
      return res.status(400).json({
        success: false,
        message: "slot_interval is required",
      });
    }

    // You can add logic here if needed
    // Example: return available time durations, validate interval, etc.

    return res.status(200).json({
      success: true,
      slot_interval: slot_interval,
      message: "Slot interval received successfully",
    });
  } catch (error) {
    console.error("Error getting slot interval:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getTodayEmptySlots = async (req, res) => {
  try {
    const today = DateTime.now().setZone("Asia/Kolkata").toISODate(); // YYYY-MM-DD

    const result = await pool.query(
      `SELECT id, slot_date, slot_range, day_name
       FROM tbl_slots
       WHERE slot_date = $1 AND is_booked = FALSE
       ORDER BY slot_range ASC`,
      [today]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No empty slots available for today",
        date: today,
        empty_slots: [],
      });
    }

    return res.status(200).json({
      success: true,
      date: today,
      total_empty_slots: result.rows.length,
      empty_slots: result.rows,
    });
  } catch (error) {
    console.error("Error fetching today's empty slots:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const updateSlotStatus = async (req, res) => {
  const { slot_date, slot_range, is_active } = req.body;

  if (!slot_date) {
    return res.status(400).json({
      success: false,
      message: "slot_date is required",
    });
  }

  if (!is_active || !["Y", "N"].includes(is_active)) {
    return res.status(400).json({
      success: false,
      message: "is_active must be 'Y' or 'N'",
    });
  }

  try {
    const activeValue = is_active === "Y"; // boolean
    let result;

    /* ===============================
       CASE 1️⃣: SINGLE SLOT
    =============================== */
    if (slot_range) {
      result = await pool.query(
        `UPDATE tbl_slots
         SET is_active = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE slot_date = $2
           AND slot_range = $3`,
        [activeValue, slot_date, slot_range]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Slot not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          is_active === "Y"
            ? "Slot activated successfully"
            : "Slot deactivated successfully",
      });
    }

    /* ===============================
       CASE 2️⃣: ENTIRE DATE
    =============================== */
    if (DateTime.fromISO(slot_date) < DateTime.now().startOf("day")) {
      return res.status(400).json({
        success: false,
        message: "Cannot update past date slots",
      });
    }

    result = await pool.query(
      `UPDATE tbl_slots
       SET is_active = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE slot_date = $2`,
      [activeValue, slot_date]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No slots found for this date",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        is_active === "Y"
          ? `All slots activated for ${slot_date}`
          : `All slots deactivated for ${slot_date}`,
      total_updated: result.rowCount,
    });

  } catch (error) {
    console.error("Error updating slot status:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};


export const deactivateSlotsByDate = async (req, res) => {
  const { slot_date } = req.body;

  if (!slot_date) {
    return res.status(400).json({
      success: false,
      message: "slot_date is required",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE tbl_slots
       SET is_active = FALSE,
           updated_at = CURRENT_TIMESTAMP
       WHERE slot_date = $1`,
      [slot_date]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No slots found for this date",
      });
    }

    return res.status(200).json({
      success: true,
      message: `All slots deactivated for ${slot_date}`,
      total_deactivated: result.rowCount,
    });
  } catch (error) {
    console.error("Error deactivating slots:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getDeactivatedSlotsByDate = async (req, res) => {
  try {
    const { slot_date } = req.body;

    if (!slot_date) {
      return res.status(400).json({
        success: false,
        message: "slot_date is required (YYYY-MM-DD)"
      });
    }

    const result = await pool.query(
      `SELECT slot_range
       FROM tbl_slots
       WHERE slot_date = $1
         AND is_active = FALSE
       ORDER BY slot_range ASC`,
      [slot_date]
    );

    return res.status(200).json({
      success: true,
      date: slot_date,
      total_deactivated: result.rows.length,
      slots: result.rows.map(r => r.slot_range)
    });

  } catch (error) {
    console.error("Error fetching deactivated slots:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

