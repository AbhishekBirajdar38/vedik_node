import pool from "../db/db.js";
import { DateTime } from "luxon";

/* ============================================
   ADD SERVICE BOOKING
=============================================== */
export const addServiceBooking = async (req, res) => {
  try {
    const {
      service_name,
      customer_name,
      mobile,
      email,
      service_date,
      amount,
      transaction_id
    } = req.body;

    if (!service_name || !customer_name || !mobile || !service_date || !amount) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing"
      });
    }

    const createdBy = req.user?.user_code || "SYSTEM";
    const createdAt = DateTime.now().setZone("Asia/Kolkata").toISO();

    const result = await pool.query(
      `INSERT INTO tbl_service_bookings
       (
         service_name,
         customer_name,
         mobile,
         email,
         service_date,
         amount,
         transaction_id,
         is_active,
         created_by,
         created_at
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Y',$8,$9)
       RETURNING id`,
      [
        service_name,
        customer_name,
        mobile,
        email,
        service_date,
        amount,
        transaction_id,
        createdBy,
        createdAt
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Service booking created successfully",
      booking_id: result.rows[0].id
    });

  } catch (error) {
    console.error("Error creating service booking:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/* ============================================
   GET ALL SERVICE BOOKINGS
=============================================== */
export const getServiceBookingsByService = async (req, res) => {
  try {
    const { service_name } = req.body;

    if (!service_name) {
      return res.status(400).json({
        success: false,
        message: "service_name is required"
      });
    }

    const result = await pool.query(
      `SELECT *
       FROM tbl_service_bookings
       WHERE service_name = $1
       ORDER BY id DESC`,
      [service_name]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: `No bookings found for service ${service_name}`,
        data: []
      });
    }

    return res.status(200).json({
      success: true,
      service: service_name,
      total: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error("Error fetching service bookings:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


/* ============================================
   UPDATE SERVICE BOOKING STATUS (Y/N)
=============================================== */
export const updateServiceBookingStatus = async (req, res) => {
  const { id, is_active } = req.body;

  if (!id || !["Y", "N"].includes(is_active)) {
    return res.status(400).json({
      success: false,
      message: "id and is_active (Y/N) are required"
    });
  }

  try {
    const updatedBy = req.user?.user_code || "SYSTEM";
    const updatedAt = DateTime.now().setZone("Asia/Kolkata").toISO();

    const result = await pool.query(
      `UPDATE tbl_service_bookings
       SET is_active = $1,
           updated_by = $2,
           updated_at = $3
       WHERE id = $4`,
      [is_active, updatedBy, updatedAt, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Service booking not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: is_active === "Y"
        ? "Service booking activated"
        : "Service booking deactivated"
    });

  } catch (error) {
    console.error("Error updating service booking status:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
