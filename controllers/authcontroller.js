import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../db/db.js';
import { DateTime } from 'luxon';

dotenv.config();

/* ===============================
   UTILS
================================ */
function generateUserCode(prefix = 'USR') {
  return prefix + Math.floor(1000 + Math.random() * 9000);
}

/* ===============================
   LOGIN (ADMIN + STUDENT)
================================ */
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  try {
    const result = await pool.query(
      `SELECT 
         l.email,
         l.password,
         l.user_code_ref,
         r.role_ref_code
       FROM tbl_login l
       JOIN tbl_register r
         ON r.user_code = l.user_code_ref
       WHERE LOWER(l.email) = LOWER($1)
         AND l.is_active = 'Y'
         AND r.is_active = 'Y'`,
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const user = result.rows[0];

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        user_code: user.user_code_ref,
        role: user.role_ref_code
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    await pool.query(
      `UPDATE tbl_login
       SET token = $1, last_login = $2
       WHERE user_code_ref = $3`,
      [
        token,
        DateTime.now().setZone("Asia/Kolkata").toISO(),
        user.user_code_ref
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        email: user.email,
        role: user.role_ref_code,
        user_code: user.user_code_ref,
        token
      }
    });

  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* ===============================
   REGISTER ADMIN (ONLY ADM)
================================ */
export const registerAdmin = async (req, res) => {
  try {
    const { first_name, last_name, email, password, phone_no } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const exists = await pool.query(
      `SELECT user_code FROM tbl_register WHERE email = $1`,
      [email]
    );

    if (exists.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Admin already exists"
      });
    }

    const user_code = generateUserCode('ADM');
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = DateTime.now().setZone("Asia/Kolkata").toISO();

    /* REGISTER TABLE */
    await pool.query(
      `INSERT INTO tbl_register
       (first_name, last_name, email, phone_no,
        role_ref_code, user_code, created_at, is_active)
       VALUES ($1,$2,$3,$4,'ADM',$5,$6,'Y')`,
      [first_name, last_name, email, phone_no, user_code, now]
    );

    /* LOGIN TABLE */
    await pool.query(
      `INSERT INTO tbl_login
       (email, password, user_code_ref, is_active, auto_logout)
       VALUES ($1,$2,$3,'Y','Y')`,
      [email, hashedPassword, user_code]
    );

    return res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      user_code
    });

  } catch (error) {
    console.error("Register admin error:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/* ===============================
   GET ALL ADMINS
================================ */
export const getAllAdmins = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_code, first_name, last_name, email, phone_no, created_at
       FROM tbl_register
       WHERE role_ref_code = 'ADM'
         AND is_active = 'Y'
       ORDER BY created_at DESC`
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
