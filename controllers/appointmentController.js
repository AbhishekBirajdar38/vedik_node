import pool from "../db/db.js";
import { DateTime } from "luxon";
import { sendMail } from "../config/mailer.js";
/* ================================
    FUNCTION → Generate Appointment Code
================================ */
function generateAppointmentCode(lastId) {
  const newId = lastId + 1;
  return "AP" + String(newId).padStart(3, "0"); // AP001, AP002...
}

/* ================================
    BOOK APPOINTMENT
================================ */
export const bookAppointment = async (req, res) => {
  try {
    const {
      name,
      email,
      mobile_number,
      gender,
      marital_status,
      is_twins,
      appointment_type,
      consultation_mode,
      date_of_birth,
      time_of_birth,
      country,
      state,
      city,
      subjects,
      source,
      friend_name,
      transaction_id,
      appointment_date,
      slot_range,
      partner_details,
    } = req.body;

    /* ================= VALIDATIONS ================= */

    if (!appointment_date || !slot_range) {
      return res.status(400).json({
        success: false,
        message: "appointment_date and slot_range are required",
      });
    }

    if (appointment_type === "Online" && !consultation_mode) {
      return res.status(400).json({
        success: false,
        message: "consultation_mode is required for Online appointments",
      });
    }

    if (source === "Friend" && !friend_name) {
      return res.status(400).json({
        success: false,
        message: "friend_name is required when source is Friend",
      });
    }

    const createdBy = req.user?.user_code || "SYSTEM";
    const createdAt = DateTime.now().setZone("Asia/Kolkata").toISO();

    /* ================= DATE FIX ================= */

    // ✅ IMPORTANT: remove any timezone part
    const safeAppointmentDate = appointment_date.split("T")[0];
    const safeDob = date_of_birth ? date_of_birth.split("T")[0] : null;

    /* ================= SLOT BOOK ================= */

    const slotResult = await pool.query(
      `UPDATE tbl_slots
       SET is_booked = TRUE,
           updated_by = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE slot_date = $2
         AND slot_range = $3
         AND is_active = TRUE
         AND is_booked = FALSE
       RETURNING id`,
      [createdBy, safeAppointmentDate, slot_range],
    );

    if (slotResult.rowCount === 0) {
      return res.status(409).json({
        success: false,
        message: "Selected slot is already booked or inactive",
      });
    }

    /* ================= GENERATE CODE ================= */

    const lastIdResult = await pool.query(
      `SELECT id FROM tbl_appointments ORDER BY id DESC LIMIT 1`,
    );

    const lastId = lastIdResult.rows.length ? lastIdResult.rows[0].id : 0;
    const appointment_code = generateAppointmentCode(lastId);

    /* ================= INSERT ================= */

    const insertQuery = `
      INSERT INTO tbl_appointments (
        appointment_code,
        name, email, mobile_number, gender, marital_status, is_twins,
        appointment_type, consultation_mode,
        date_of_birth, time_of_birth,
        country, state, city,
        subjects,
        source, friend_name,
        transaction_id,
        appointment_date,
        slot_range,
        partner_details,
        is_appointment_conducted,
        appointment_status,
        created_by,
        created_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,
        $10,$11,
        $12,$13,$14,
        $15,
        $16,$17,
        $18,
        $19,
        $20,
        $21,
        $22,
        $23,
        $24,
        $25
      )
      RETURNING appointment_code
    `;

    const values = [
      appointment_code,
      name,
      email,
      mobile_number,
      gender,
      marital_status,
      is_twins,
      appointment_type,
      consultation_mode || null,
      safeDob,
      time_of_birth || null,
      country,
      state,
      city,
      subjects,
      source,
      friend_name || null,
      transaction_id,
      safeAppointmentDate, // ✅ FIXED
      slot_range,
      JSON.stringify(partner_details || []),
      false,
      "pending",
      createdBy,
      createdAt,
    ];

    const result = await pool.query(insertQuery, values);

    /* ================= EMAIL FORMAT FIX ================= */

    const formatDateToDDMMYYYY = (dateStr) => {
      if (!dateStr) return "N/A";

      // ✅ NO new Date() → no timezone issue
      const [year, month, day] = dateStr.split("-");
      return `${day}/${month}/${year}`;
    };

    const formattedAppointmentDate =
      formatDateToDDMMYYYY(safeAppointmentDate);
    const formattedDob = formatDateToDDMMYYYY(safeDob);

    /* ================= EMAIL ================= */

    try {
      const adminEmail = "mrunal@vedikastrologer.com";

      let partnerHtml = "";

      if (partner_details && partner_details.length > 0) {
        partner_details.forEach((partner, index) => {
          partnerHtml += `
            <hr/>
            <h4>Partner ${index + 1}</h4>
            <p><strong>Name :</strong> ${partner.name || "N/A"}</p>
            <p><strong>Date of Birth :</strong> ${formatDateToDDMMYYYY(partner.date_of_birth)}</p>
            <p><strong>Time of Birth :</strong> ${partner.time_of_birth || "N/A"}</p>
            <p><strong>Place :</strong> ${partner.place_of_birth || "N/A"}</p>
          `;
        });
      }

      await sendMail(
        adminEmail,
        "New Appointment",
        `
        <p><strong>Date:</strong> ${formattedAppointmentDate}</p>
        <p><strong>Time:</strong> ${slot_range}</p>
        <p><strong>Name:</strong> ${name}</p>
        ${partnerHtml}
        `
      );

      await sendMail(
        email,
        "Appointment Confirmed",
        `
        <p>Your appointment is booked.</p>
        <p>Date: ${formattedAppointmentDate}</p>
        <p>Time: ${slot_range}</p>
        `
      );

    } catch (mailError) {
      console.error("Email error:", mailError);
    }

    return res.status(201).json({
      success: true,
      message: "Appointment booked successfully",
      appointment_code: result.rows[0].appointment_code,
    });

  } catch (error) {
    console.error("Error booking appointment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* ================================
    GET ALL APPOINTMENTS
================================ */
export const getAllAppointments = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM tbl_appointments ORDER BY id DESC
    `);

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getAppointmentByCode = async (req, res) => {
  const { appointment_code } = req.body;

  if (!appointment_code) {
    return res.status(400).json({
      success: false,
      message: "appointment_code is required",
    });
  }

  try {
    const result = await pool.query(
      `SELECT *
       FROM tbl_appointments
       WHERE appointment_code = $1
         AND is_appointment_conducted = false`,
      [appointment_code],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found or already conducted",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching appointment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* ================================
    GET APPOINTMENT BY ID
================================ */
export const getAppointmentById = async (req, res) => {
  const { id } = req.body;

  try {
    const result = await pool.query(
      `SELECT * FROM tbl_appointments WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error getting appointment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/* ================================
    UPDATE APPOINTMENT
================================ */
export const updateAppointment = async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Appointment ID is required",
    });
  }

  const updatedBy = req.user?.user_code || "SYSTEM";
  const updatedAt = DateTime.now().setZone("Asia/Kolkata").toISO();

  const fields = [];
  const values = [];
  let index = 1;

  // Add fields dynamically
  for (const [key, value] of Object.entries(req.body)) {
    if (key !== "id" && value !== undefined) {
      fields.push(`${key} = $${index++}`);
      values.push(value);
    }
  }

  // Add audit fields
  fields.push(`updated_by = $${index++}`);
  values.push(updatedBy);

  fields.push(`updated_at = $${index++}`);
  values.push(updatedAt);

  values.push(id);

  const query = `
    UPDATE tbl_appointments
    SET ${fields.join(", ")}
    WHERE id = $${index}
  `;

  try {
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Appointment updated successfully",
    });
  } catch (error) {
    console.error("Error updating appointment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/* ================================
    DELETE APPOINTMENT
================================ */
export const deleteAppointment = async (req, res) => {
  const { id } = req.body;

  try {
    const result = await pool.query(
      `DELETE FROM tbl_appointments WHERE id = $1`,
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Appointment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const updateConductStatus = async (req, res) => {
  const { appointment_code, is_active, price } = req.body;

  if (!appointment_code) {
    return res.status(400).json({
      success: false,
      message: "Appointment code is required",
    });
  }

  if (!is_active || !["Y", "N"].includes(is_active)) {
    return res.status(400).json({
      success: false,
      message: "is_active must be 'Y' or 'N'",
    });
  }

  // ✅ If conducting, price is mandatory
  if (is_active === "Y" && (price === undefined || price === null)) {
    return res.status(400).json({
      success: false,
      message: "Price is required when conducting appointment",
    });
  }

  try {
    const updatedBy = req.user?.user_code || "SYSTEM";
    const updatedAt = DateTime.now().setZone("Asia/Kolkata").toISO();

    const isConducted = is_active === "Y";
    const status = isConducted ? "conducted" : "not_conducted";

    const result = await pool.query(
      `UPDATE tbl_appointments
       SET 
         is_appointment_conducted = $1,
         appointment_status = $2,
         price = $3,
         updated_by = $4,
         updated_at = $5
       WHERE appointment_code = $6`,
      [
        isConducted,
        status,
        isConducted ? price : null, // 👈 store price only if conducted
        updatedBy,
        updatedAt,
        appointment_code,
      ],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: isConducted
        ? "Appointment conducted and price saved"
        : "Appointment marked as NOT conducted",
    });
  } catch (error) {
    console.error("Error updating appointment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getAppointmentsByConductStatus = async (req, res) => {
  try {
    const { is_active } = req.body;

    if (!is_active || !["Y", "N"].includes(is_active)) {
      return res.status(400).json({
        success: false,
        message: "is_active must be 'Y' or 'N'",
      });
    }

    const isConducted = is_active === "Y";

    const result = await pool.query(
      `SELECT *
       FROM tbl_appointments
       WHERE is_appointment_conducted = $1
       ORDER BY id DESC`,
      [isConducted],
    );

    return res.status(200).json({
      success: true,
      status: isConducted ? "conducted" : "not_conducted",
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getTodayAppointments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
FROM tbl_appointments
WHERE appointment_date = CURRENT_DATE
  AND is_appointment_conducted = false
ORDER BY id DESC;
`,
    );

    // If no records found
    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No appointments for today",
        data: [],
      });
    }

    // If records found
    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching today's appointments:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getFutureAppointments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM tbl_appointments
       WHERE appointment_date > CURRENT_DATE
       ORDER BY appointment_date ASC`,
    );

    // If no future appointments
    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No future appointments",
        data: [],
      });
    }

    // Return future appointments
    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching future appointments:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
export const getPendingAppointments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM tbl_appointments
       WHERE is_appointment_conducted = false
       ORDER BY appointment_date ASC, slot_range ASC`,
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No pending appointments",
        data: [],
      });
    }

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching pending appointments:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const rescheduleAppointment = async (req, res) => {
  const { appointment_code, new_date, new_slot_range } = req.body;

  if (!appointment_code || !new_date || !new_slot_range) {
    return res.status(400).json({
      success: false,
      message: "appointment_code, new_date and new_slot_range are required",
    });
  }

  const userCode = req.user?.user_code || "SYSTEM";

  try {
    /* 1️⃣ Fetch existing pending appointment */
    const apptResult = await pool.query(
      `SELECT *
       FROM tbl_appointments
       WHERE appointment_code = $1
         AND is_appointment_conducted = false`,
      [appointment_code],
    );

    if (apptResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pending appointment not found",
      });
    }

    const appointment = apptResult.rows[0];

    const oldDate = appointment.appointment_date;
    const oldSlotRange = appointment.slot_range;

    /* 2️⃣ Check new slot availability */
    const slotCheck = await pool.query(
      `SELECT id FROM tbl_slots
       WHERE slot_date = $1
         AND slot_range = $2
         AND is_booked = false
         AND is_active = true`,
      [new_date, new_slot_range],
    );

    if (slotCheck.rows.length === 0) {
      return res.status(409).json({
        success: false,
        message: "Selected slot is not available",
      });
    }

    /* 3️⃣ Free old slot */
    await pool.query(
      `UPDATE tbl_slots
       SET is_booked = false,
           appointment_code = NULL,
           updated_by = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE slot_date = $2
         AND slot_range = $3`,
      [userCode, oldDate, oldSlotRange],
    );

    /* 4️⃣ Book new slot */
    await pool.query(
      `UPDATE tbl_slots
       SET is_booked = true,
           appointment_code = $1,
           updated_by = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE slot_date = $3
         AND slot_range = $4`,
      [appointment_code, userCode, new_date, new_slot_range],
    );

    /* 5️⃣ Update appointment */
    await pool.query(
      `UPDATE tbl_appointments
       SET appointment_date = $1,
           slot_range = $2,
           updated_by = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE appointment_code = $4`,
      [new_date, new_slot_range, userCode, appointment_code],
    );

    /* 6️⃣ Format date to DD/MM/YYYY */
    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const formattedDate = formatDate(new_date);

    /* 7️⃣ Send Updated Email */

    const adminEmail = "mrunal@vedikastrologer.com";

    await sendMail(
      appointment.email?.trim(),
      "Appointment Rescheduled - Vedik Astrologer",
      `
      <div style="font-family: Arial, sans-serif; background:#f5f5f5; padding:30px;">
        <div style="max-width:600px; margin:0 auto; background:#ffffff; padding:30px; border-radius:6px;">
          
          <h1 style="margin-top:0; color:#000;">Vedik Astrologer</h1>

          <p>Hi ${appointment.name},</p>

          <p>
            Your appointment has been successfully <strong>rescheduled</strong>.
          </p>

          <p>
            <strong>New Date:</strong> ${formattedDate}<br/>
            <strong>New Time:</strong> ${new_slot_range}
          </p>


          <p><strong>Appointment Type:</strong> ${appointment.appointment_type || ""}</p>

          <div style="margin-top:50px;">
            <a href="http://localhost:4200/customer-appointment?code=${appointment_code}"
              style="
                background:#ffe600;
                color:#000;
                padding:12px 20px;
                text-decoration:none;
                border-radius:5px;
                font-weight:bold;
                display:inline-block;
              ">
              Reschedule Again
            </a>
          </div>

        </div>
      </div>
      `,
      adminEmail, // CC to admin
    );

    return res.status(200).json({
      success: true,
      message: "Appointment rescheduled successfully",
    });
  } catch (error) {
    console.error("Reschedule error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const cancelAppointment = async (req, res) => {
  const { appointment_code, cancel_reason } = req.body;

  if (!appointment_code) {
    return res.status(400).json({
      success: false,
      message: "appointment_code is required",
    });
  }

  const userCode = req.user?.user_code || "SYSTEM";
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* =========================
       1️⃣ GET APPOINTMENT
    ========================== */
    const appointmentResult = await client.query(
      `SELECT appointment_date, slot_range, is_appointment_conducted
       FROM tbl_appointments
       WHERE appointment_code = $1`,
      [appointment_code],
    );

    if (appointmentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    const appointment = appointmentResult.rows[0];

    // ❌ Cannot cancel conducted appointment
    if (appointment.is_appointment_conducted === true) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a conducted appointment",
      });
    }

    /* =========================
       2️⃣ RELEASE SLOT (FIXED)
    ========================== */
    await client.query(
      `UPDATE tbl_slots
       SET is_booked = FALSE,
           updated_by = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE slot_date = $2
         AND slot_range = $3`,
      [
        userCode,
        appointment.appointment_date,
        appointment.slot_range, // ← this stores slot_range
      ],
    );

    /* =========================
       3️⃣ UPDATE APPOINTMENT
    ========================== */
    await client.query(
      `UPDATE tbl_appointments
       SET appointment_status = 'cancelled',
           updated_by = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE appointment_code = $2`,
      [userCode, appointment_code],
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Cancel appointment error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  } finally {
    client.release();
  }
};
