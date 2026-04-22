import multer from "multer";
import path from "path";
import { DateTime } from "luxon";
import pool from "../db/db.js";
import fs from "fs";

/* =====================================================
   STORAGE CONFIG
===================================================== */

const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./uploads/pdf";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
export const upload = multer({ storage: pdfStorage });

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./uploads/video";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(1e9 * Math.random());
    cb(null, unique + path.extname(file.originalname));
  },
});
export const uploadVideo = multer({ storage: videoStorage });

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./uploads/images";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(1e9 * Math.random());
    cb(null, unique + path.extname(file.originalname));
  },
});
export const uploadImages = multer({ storage: imageStorage });


const topicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Always save to pdf folder
    const dir = "./uploads/pdf";
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

export const uploadTopic = multer({ storage: topicStorage });


/* =====================================================
   HELPERS
===================================================== */

function generateMediaCode() {
  return "MED" + Math.floor(1000 + Math.random() * 9000);
}

/* =====================================================
   UPLOAD MEDIA (LIBRARY ONLY – NOT PUBLISHED)
===================================================== */

export const addpdf = async (req, res) => {
  try {
    const { title, description } = req.body;
    const file = req.file;
    const createdBy = req.user?.user_code;

    // ❌ batch_code REMOVED
    if (!title || !description || !file) {
      return res.status(400).json({
        success: false,
        message: "title, description and file are required",
      });
    }

    const mediaCode = generateMediaCode();

    await pool.query(
      `INSERT INTO tbl_upload_media
       (file_name, file_type, file_path, ref_code,
        created_by, updated_by, title, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        file.filename,
        file.mimetype,
        file.path,
        mediaCode,
        createdBy,
        createdBy,
        title,
        description,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "PDF uploaded successfully",
      media_ref_code: mediaCode,
    });
  } catch (error) {
    console.error("Upload PDF Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const uplodeimage = async (req, res) => {
  try {
    const { title, description } = req.body;
    const file = req.file;
    const createdBy = req.user?.user_code;

    if (!title || !description || !file) {
      return res.status(400).json({
        success: false,
        message: "Title, description and file are required",
      });
    }

    const mediaCode = generateMediaCode();

    await pool.query(
      `INSERT INTO tbl_upload_media
       (file_name, file_type, file_path, ref_code, created_by, updated_by, title, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        file.filename,
        file.mimetype,
        file.path,
        mediaCode,
        createdBy,
        createdBy,
        title,
        description,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      media_ref_code: mediaCode,
    });
  } catch (error) {
    console.error("Upload Image Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const addvideo = async (req, res) => {
  try {
    const { title, description } = req.body;
    const file = req.file;
    const createdBy = req.user?.user_code;

    if (!title || !description || !file) {
      return res.status(400).json({
        success: false,
        message: "Title, description and file are required",
      });
    }

    const mediaCode = generateMediaCode();

    await pool.query(
      `INSERT INTO tbl_upload_media
       (file_name, file_type, file_path, ref_code, created_by, updated_by, title, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        file.filename,
        file.mimetype,
        file.path,
        mediaCode,
        createdBy,
        createdBy,
        title,
        description,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Video uploaded successfully",
      media_ref_code: mediaCode,
    });
  } catch (error) {
    console.error("Upload Video Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* =====================================================
   PUBLISH MEDIA TO BATCH (ADMIN CLICK ONLY)
===================================================== */

export const publishMediaToBatch = async (req, res) => {
  try {
    const { batch_code, media_ref_code } = req.body;
    const createdBy = req.user?.user_code;

    if (!batch_code || !media_ref_code) {
      return res.status(400).json({
        success: false,
        message: "batch_code and media_ref_code are required",
      });
    }

    const exists = await pool.query(
      `SELECT id FROM tbl_batch_media
       WHERE batch_code = $1 AND media_ref_code = $2`,
      [batch_code, media_ref_code],
    );

    if (exists.rows.length > 0) {
      return res.status(200).json({
        success: true,
        message: "Media already published",
      });
    }

    const media = await pool.query(
      `SELECT file_type FROM tbl_upload_media WHERE ref_code = $1`,
      [media_ref_code],
    );

    if (media.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    const fileType = media.rows[0].file_type;
    let media_type = "OTHER";
    if (fileType.includes("pdf")) media_type = "PDF";
    else if (fileType.includes("video")) media_type = "VIDEO";
    else if (fileType.includes("image")) media_type = "IMAGE";

    await pool.query(
      `INSERT INTO tbl_batch_media
       (batch_code, media_ref_code, media_type, created_by)
       VALUES ($1,$2,$3,$4)`,
      [batch_code, media_ref_code, media_type, createdBy],
    );

    return res.status(201).json({
      success: true,
      message: "Media published successfully",
      media_type,
    });
  } catch (error) {
    console.error("Publish Media Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* =====================================================
   ADMIN – BATCH MEDIA LIST (PUBLISHED + UNPUBLISHED)
===================================================== */

export const getBatchMediaList = async (req, res) => {
  try {
    const { batch_code } = req.body;

    if (!batch_code) {
      return res.status(400).json({
        success: false,
        message: "batch_code is required",
      });
    }

    const result = await pool.query(
      `
      SELECT
        m.ref_code AS media_ref_code,
        m.file_name,
        m.file_type,
        m.file_path,
        m.title,
        m.description,
        m.created_at AS uploaded_at,

        b.batch_code,
        b.batch_name,

        bm.media_type,
        bm.created_at AS published_at,

        CASE
          WHEN bm.id IS NULL THEN 'N'
          ELSE 'Y'
        END AS is_published

      FROM tbl_upload_media m

      CROSS JOIN tbl_batches b

      LEFT JOIN tbl_batch_media bm
        ON bm.media_ref_code = m.ref_code
       AND bm.batch_code = b.batch_code

      WHERE b.batch_code = $1
      ORDER BY m.created_at DESC
      `,
      [batch_code],
    );

    return res.status(200).json({
      success: true,
      batch_code,
      batch_name: result.rows[0]?.batch_name || null,
      total: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get Batch Media Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/* =====================================================
   STUDENT – GET PUBLISHED MEDIA ONLY
===================================================== */

export const getBatchMediaForStudent = async (req, res) => {
  try {
    const userCode = req.user?.user_code;

    const student = await pool.query(
      `SELECT batch_code
       FROM tbl_students
       WHERE user_code = $1 AND is_active = 'Y'`,
      [userCode],
    );

    if (student.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const batchCode = student.rows[0].batch_code;

    const media = await pool.query(
      `
      SELECT m.*
      FROM tbl_batch_media bm
      JOIN tbl_upload_media m
        ON bm.media_ref_code = m.ref_code
      WHERE bm.batch_code = $1
      ORDER BY m.created_at DESC
      `,
      [batchCode],
    );

    return res.status(200).json({
      success: true,
      batch_code: batchCode,
      total: media.rows.length,
      data: media.rows,
    });
  } catch (error) {
    console.error("Student Media Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const addKundaliPracticeSet = async (req, res) => {
  try {
    const { kundali_no, date_of_birth, time_of_birth, place_of_birth } =
      req.body;

    const file = req.file;
    const createdBy = req.user?.user_code || "SYSTEM";

    if (!kundali_no || !date_of_birth || !time_of_birth || !place_of_birth) {
      return res.status(400).json({
        success: false,
        message: "All kundali fields are required",
      });
    }

    await pool.query(
      `INSERT INTO tbl_kundali_practice_set
       (
         kundali_no,
         date_of_birth,
         time_of_birth,
         place_of_birth,
         file_name,
         file_type,
         file_path,
         created_by
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        kundali_no,
        date_of_birth,
        time_of_birth,
        place_of_birth,
        file?.filename || null,
        file?.mimetype || null,
        file?.path || null,
        createdBy,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Kundali practice set added successfully",
    });
  } catch (error) {
    console.error("Add Kundali Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/* =====================================================
   GET ALL KUNDALI PRACTICE SETS
===================================================== */
export const getAllKundaliPracticeSets = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM tbl_kundali_practice_set
       ORDER BY created_at DESC`,
    );

    return res.status(200).json({
      success: true,
      total: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get Kundali Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const viewMedia = async (req, res) => {
  try {
    const { ref_code } = req.params;

    const result = await pool.query(
      `SELECT file_path, file_type
       FROM tbl_upload_media
       WHERE ref_code = $1`,
      [ref_code],
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Media not found");
    }

    const { file_path, file_type } = result.rows[0];

    // ✅ ADD HEADERS HERE (THIS IS THE PLACE)
    res.setHeader("Content-Type", file_type);
    res.setHeader("Content-Disposition", "inline"); // 🔒 view only
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");

    // ✅ Stream file
    return res.sendFile(path.resolve(file_path));
  } catch (error) {
    console.error("View Media Error:", error);
    return res.status(500).send("Unable to load media");
  }
};

export const getTopicList = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        topic_name,
        topic_description,
        standard_id,
        is_active,
        created_by,
        created_at,
        updated_by,
        updated_at
      FROM tbl_astrology_topics
      WHERE is_active = TRUE
      ORDER BY created_at DESC
    `);

    console.log("Topics from DB:", result.rows); // Add this log

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error("❌ Get topics error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch topics",
      error: err.message
    });
  }
};

export const addTopic = async (req, res) => {
  try {
    const { topic_name, topic_description, standard_id } = req.body;

    // ✅ created_by from JWT middleware
    const created_by = req.user?.user_code; // adjust key if needed

    // ✅ VALIDATION
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

    if (!created_by) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Optional: Get standard name if you want to store it
    // const standardQuery = 'SELECT standard_name FROM tbl_standards WHERE standard_id = $1';
    // const standardResult = await pool.query(standardQuery, [standard_id]);
    // const standard_name = standardResult.rows[0]?.standard_name;

    const query = `
      INSERT INTO tbl_astrology_topics
      (
        topic_name,
        topic_description,
        standard_id,
        is_active,
        created_by,
        created_at
      )
      VALUES ($1, $2, $3, TRUE, $4, NOW())
      RETURNING id, topic_name, standard_id;
    `;

    const values = [topic_name, topic_description || null, standard_id, created_by];

    const result = await pool.query(query, values);

    return res.status(201).json({
      success: true,
      message: "Topic added successfully",
      data: {
        ...result.rows[0],
        standard_id: standard_id
      },
    });
  } catch (err) {
    console.error("❌ Add topic error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to add topic",
    });
  }
};

export const uploadTopicMedia = async (req, res) => {
  try {
    const { topic_id, title, description } = req.body;

    console.log("📥 Received body:", { topic_id, title, description });
    console.log("📁 Received file:", req.file);
    console.log("📁 Received files (if multiple):", req.files);

    if (!topic_id) {
      return res.status(400).json({
        success: false,
        message: "topic_id is required",
      });
    }

    // Check both req.file and req.files
    const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "File is required. Make sure you're uploading with field name 'file'",
      });
    }

    /* ✅ SIMPLIFIED - Always use pdf folder for all files */
    const folder = "pdf";  // Force all files to go to pdf folder
    const filePath = `/uploads/pdf/${file.filename}`;  // Always use pdf path

    console.log(`📂 Saving file to: ${filePath}`);

    const result = await pool.query(
      `INSERT INTO tbl_topic_media
      (topic_id, title, description, file_path, file_name, mime_type, file_size)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        topic_id,
        title || null,
        description || null,
        filePath,
        file.originalname,
        file.mimetype,
        file.size,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Topic media uploaded successfully",
      data: {
        ...result.rows[0],
        file_url: filePath,
        file_type: folder,
      },
    });

  } catch (error) {
    console.error("❌ Upload error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getTopicMediaByTopic = async (req, res) => {
  try {
    const { topic_id } = req.body;  // ✅ FIXED

    console.log("📥 Fetch media for topic_id:", topic_id);

    if (!topic_id) {
      return res.status(400).json({
        success: false,
        message: "topic_id is required",
      });
    }

    const result = await pool.query(
      `SELECT 
        id,
        topic_id,
        title,
        description,
        file_path,
        file_name,
        mime_type,
        file_size,
        created_at
       FROM tbl_topic_media
       WHERE topic_id = $1
       ORDER BY created_at DESC`,
      [topic_id]
    );

    return res.status(200).json({
      success: true,
      message: "Topic media fetched successfully",
      count: result.rows.length,
      data: result.rows.map((item) => ({
        ...item,
        file_url: item.file_path,
      })),
    });

  } catch (error) {
    console.error("❌ Fetch error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateTopicMedia = async (req, res) => {
  try {
    const { id, title, description } = req.body;

    console.log("📥 Update request:", { id, title, description });

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id is required",
      });
    }

    const result = await pool.query(
      `UPDATE tbl_topic_media
       SET 
         title = $1,
         description = $2
       WHERE id = $3
       RETURNING *`,
      [
        title || null,
        description || null,
        id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Media updated successfully",
      data: result.rows[0],
    });

  } catch (error) {
    console.error("❌ Update error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const deleteTopicMedia = async (req, res) => {
  try {
    const { id } = req.body;

    console.log("🗑️ Delete request for id:", id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id is required",
      });
    }

    const result = await pool.query(
      `DELETE FROM tbl_topic_media
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Media deleted from database successfully",
      data: result.rows[0],
    });

  } catch (error) {
    console.error("❌ Delete error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getTopicMedia = async (req, res) => {
  try {
    const { topic_id } = req.body;

    if (!topic_id) {
      return res.status(400).json({
        success: false,
        message: "topic_id is required",
      });
    }

    const result = await pool.query(
      `
      SELECT
        tm.id,
        tm.topic_id,
        t.topic_name,
        tm.title,
        tm.description,
        tm.file_name,
        tm.file_path,
        tm.mime_type,
        tm.file_size,
        tm.created_at
      FROM tbl_topic_media tm
      JOIN tbl_astrology_topics t
        ON t.id = tm.topic_id
      WHERE tm.topic_id = $1
      ORDER BY tm.created_at DESC
      `,
      [topic_id],
    );

    return res.status(200).json({
      success: true,
      total: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("❌ Get topic media error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch topic media",
    });
  }
};

export const getTopicsByStandard = async (req, res) => {
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
        id,
        topic_name,
        topic_description,
        level,
        category,
        is_active,
        standard_id,
        standard_name,
        created_at
       FROM public.tbl_astrology_topics   -- ✅ FIXED NAME
       WHERE standard_id = $1
       ORDER BY created_at DESC`,
      [standard_id]
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });

  } catch (error) {
    console.error("❌ Fetch topics error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const assignTopicAndMediaToSlot = async (req, res) => {
  const client = await pool.connect();

  try {
    const { batch_code, slot_ids = [], topic_id, media_ids = [] } = req.body;

    if (!batch_code || !slot_ids.length || !topic_id) {
      return res.status(400).json({
        success: false,
        message: "batch_code, slot_ids and topic_id are required",
      });
    }

    await client.query("BEGIN");

    /* ======================================================
       1️⃣ UPDATE TOPIC IN tbl_class_slots
    ====================================================== */
    await client.query(
      `
      UPDATE tbl_class_slots
      SET
        topic_id = $1,
        batch_code = $2,
        topic_updated_at = NOW()
      WHERE id = ANY($3)
      `,
      [topic_id, batch_code, slot_ids],
    );

    /* ======================================================
       2️⃣ INSERT MEDIA (APPEND MODE – NO DELETE)
    ====================================================== */
    for (const slotId of slot_ids) {
      for (const mediaId of media_ids) {
        await client.query(
          `
          INSERT INTO tbl_class_slot_media
          (
            slot_id,
            media_id,
            batch_code,
            topic_id,
            created_at
          )
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (slot_id, media_id) DO NOTHING
          `,
          [slotId, mediaId, batch_code, topic_id],
        );
      }
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Topic and media assigned successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Assign topic/media error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to assign topic and media",
    });
  } finally {
    client.release();
  }
};

export const getAssignedDataByBatch = async (req, res) => {
  try {
    const { batch_code } = req.body;

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
    cs.class_date,
    cs.schedule_id,

    -- ✅ FIXED column
    cs.slot_range,

    cs.class_link,
    cs.topic_id,
    t.topic_name,

    COALESCE(
      json_agg(
        DISTINCT jsonb_build_object(
          'media_id', tm.id,
          'title', tm.title,
          'file_path', tm.file_path
        )
      ) FILTER (WHERE tm.id IS NOT NULL),
      '[]'
    ) AS media

  FROM tbl_class_slots cs

  LEFT JOIN tbl_astrology_topics t
    ON t.id = cs.topic_id

  LEFT JOIN tbl_class_slot_media sm
    ON sm.slot_id = cs.id

  LEFT JOIN tbl_topic_media tm
    ON tm.id = sm.media_id::INTEGER

  WHERE cs.batch_code = $1

  GROUP BY
    cs.id,
    cs.class_date,
    cs.schedule_id,
    cs.slot_range,
    cs.class_link,
    cs.topic_id,
    t.topic_name

  ORDER BY cs.class_date, cs.id
  `,
  [batch_code]
);

    return res.status(200).json({
      success: true,
      data: result.rows,
    });

  } catch (error) {
    console.error("❌ getAssignedDataByBatch error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch assigned data",
    });
  }
};



export const getClassStudyMaterials = async (req, res) => {
  try {
    const { slot_id } = req.params;

    if (!slot_id) {
      return res.status(400).json({
        success: false,
        message: "slot_id is required",
      });
    }

    const result = await pool.query(
      `
      SELECT
        cs.id AS slot_id,
        cs.class_date,
        cs.slot_range,
        cs.topic_id,
        t.topic_name,

        tm.id AS media_id,
        tm.title,
        tm.description,
        tm.file_path,
        tm.file_name,
        tm.mime_type,
        tm.file_size

      FROM tbl_class_slots cs
      JOIN tbl_class_slot_media sm
        ON sm.slot_id = cs.id
      JOIN tbl_topic_media tm
        ON tm.id = sm.media_id::INTEGER   -- ✅ FIX
      JOIN tbl_astrology_topics t
        ON t.id = cs.topic_id

      WHERE cs.id = $1
      ORDER BY tm.created_at DESC
      `,
      [slot_id],
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        topic: null,
        media: [],
      });
    }

    return res.status(200).json({
      success: true,
      topic: {
        topic_id: result.rows[0].topic_id,
        topic_name: result.rows[0].topic_name,
      },
      media: result.rows.map((r) => ({
        media_id: r.media_id,
        title: r.title,
        description: r.description,
        file_path: r.file_path,
        file_name: r.file_name,
        mime_type: r.mime_type,
        file_size: r.file_size,
      })),
    });
  } catch (error) {
    console.error("❌ Get study materials error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch study materials",
    });
  }
};

export const getStudentStudyMaterialsFromToken = async (req, res) => {
  try {
    const userCode = req.user?.user_code;
    const { slot_id } = req.body;

    /* ===============================
       VALIDATION
    =============================== */
    if (!userCode) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    if (!slot_id) {
      return res.status(400).json({
        success: false,
        message: "slot_id is required",
      });
    }

    /* ===============================
       1️⃣ GET STUDENT REF CODE
    =============================== */
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

    /* ===============================
       2️⃣ VERIFY SLOT BELONGS TO STUDENT
    =============================== */
    const slotAccess = await pool.query(
      `
      SELECT cs.id
      FROM tbl_class_slots cs
      JOIN tbl_student_batches sb
        ON sb.batch_code = cs.batch_code
      WHERE sb.stu_ref_code = $1
        AND cs.id = $2
        AND cs.is_active = TRUE
      `,
      [stuRefCode, slot_id],
    );

    if (slotAccess.rowCount === 0) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access this slot",
      });
    }

    /* ===============================
       3️⃣ FETCH SLOT-WISE TOPIC + MEDIA
    =============================== */
    const result = await pool.query(
      `
      SELECT
        cs.id AS slot_id,

        cs.topic_id,
        t.topic_name,

        tm.id AS media_id,
        tm.title,
        tm.description,
        tm.file_path,
        tm.file_name,
        tm.mime_type,
        tm.file_size,
        tm.created_at

      FROM tbl_class_slots cs

      LEFT JOIN tbl_class_slot_media sm
        ON sm.slot_id = cs.id

      LEFT JOIN tbl_topic_media tm
        ON tm.id = sm.media_id::INTEGER

      LEFT JOIN tbl_astrology_topics t
        ON t.id = cs.topic_id

      WHERE cs.id = $1
        AND cs.is_active = TRUE

      ORDER BY tm.created_at DESC
      `,
      [slot_id],
    );

    /* ===============================
       4️⃣ NO DATA
    =============================== */
    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        topic: null,
        media: [],
      });
    }

    /* ===============================
       5️⃣ FORMAT RESPONSE
    =============================== */
    const topic = result.rows[0].topic_id
      ? {
          topic_id: result.rows[0].topic_id,
          topic_name: result.rows[0].topic_name,
        }
      : null;

    const media = result.rows
      .filter((r) => r.media_id !== null)
      .map((r) => ({
        slot_id: r.slot_id, // 🔥 CRITICAL
        media_id: r.media_id,
        title: r.title,
        description: r.description,
        file_path: r.file_path,
        file_name: r.file_name,
        mime_type: r.mime_type,
        file_size: r.file_size,
      }));

    return res.status(200).json({
      success: true,
      topic,
      media,
    });
  } catch (error) {
    console.error("❌ Student study materials error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch study materials",
    });
  }
};

export const uploadStudentCertificate = async (req, res) => {
  try {
    console.log("BODY 👉", req.body);
    console.log("FILE 👉", req.file);

    // 🔒 SAFE destructuring
    const { user_code, course_name, batch_code, certificate_no } =
      req.body || {};
    const file = req.file;

    if (!user_code || !certificate_no || !file) {
      return res.status(400).json({
        success: false,
        message: "user_code, certificate_no and file are required",
      });
    }

    const certificateId = "CERT" + Date.now();
    const filePath = `/uploads/certificates/${file.filename}`;

    await pool.query(
      `
      INSERT INTO tbl_certificate
      (
        certificate_id,
        certificate_no,
        user_code,
        course_name,
        batch_code,
        issue_date,
        file_path,
        issued_by
      )
      VALUES ($1,$2,$3,$4,$5,CURRENT_DATE,$6,$7)
      `,
      [
        certificateId,
        certificate_no,
        user_code,
        course_name || null,
        batch_code || null,
        filePath,
        req.user.user_code, // ✅ from JWT
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Certificate uploaded successfully",
      certificate_id: certificateId,
    });
  } catch (error) {
    console.error("❌ Upload certificate error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const publishStudentCertificate = async (req, res) => {
  try {
    const { certificate_id } = req.body;

    if (!certificate_id) {
      return res.status(400).json({
        success: false,
        message: "certificate_id is required",
      });
    }

    await pool.query(
      `
      UPDATE tbl_certificate
      SET is_published = 'Y'
      WHERE certificate_id = $1
      `,
      [certificate_id],
    );

    return res.status(200).json({
      success: true,
      message: "Certificate published successfully",
    });
  } catch (error) {
    console.error("❌ Publish certificate error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyCertificates = async (req, res) => {
  try {
    const userCode = req.user?.user_code;

    const result = await pool.query(
      `
      SELECT
        certificate_id,
        certificate_no,
        course_name,
        issue_date,
        file_path
      FROM tbl_certificate
      WHERE user_code = $1
        AND is_published = 'Y'
      ORDER BY issue_date DESC
      `,
      [userCode],
    );

    return res.status(200).json({
      success: true,
      total: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("❌ Get certificates error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const uploadPaymentReceipt = async (req, res) => {
  try {
    console.log("BODY 👉", req.body);
    console.log("FILE 👉", req.file);

    const { user_code, receipt_no, amount, payment_mode, transaction_id } =
      req.body || {};

    const file = req.file;
    const createdBy = req.user?.user_code;

    if (!user_code || !receipt_no || !amount || !file) {
      return res.status(400).json({
        success: false,
        message: "user_code, receipt_no, amount and file are required",
      });
    }

    /* 🔒 VERIFY STUDENT EXISTS (FIXED TABLE NAME) */
    const student = await pool.query(
      `SELECT user_code FROM tbl_students WHERE user_code = $1`,
      [user_code],
    );

    if (student.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const receiptId = "REC" + Date.now();
    const filePath = `/uploads/pdf/${file.filename}`; // using existing pdfStorage

    await pool.query(
      `
      INSERT INTO tbl_payment_receipt
      (
        receipt_id,
        receipt_no,
        user_code,
        amount,
        payment_mode,
        transaction_id,
        payment_date,
        file_path,
        is_published,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,CURRENT_DATE,$7,'N',$8)
      `,
      [
        receiptId,
        receipt_no,
        user_code,
        amount,
        payment_mode || null,
        transaction_id || null,
        filePath,
        createdBy,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Payment receipt uploaded successfully",
      receipt_id: receiptId,
    });
  } catch (error) {
    console.error("❌ Upload receipt error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const publishPaymentReceipt = async (req, res) => {
  try {
    const { receipt_id } = req.body || {};

    if (!receipt_id) {
      return res.status(400).json({
        success: false,
        message: "receipt_id is required",
      });
    }

    await pool.query(
      `
      UPDATE tbl_payment_receipt
      SET is_published = 'Y'
      WHERE receipt_id = $1
      `,
      [receipt_id],
    );

    return res.status(200).json({
      success: true,
      message: "Payment receipt published successfully",
    });
  } catch (error) {
    console.error("❌ Publish receipt error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyReceipts = async (req, res) => {
  try {
    const userCode = req.user?.user_code;

    const result = await pool.query(
      `
      SELECT
        receipt_id,
        receipt_no,
        amount,
        payment_mode,
        payment_date,
        file_path
      FROM tbl_payment_receipt
      WHERE user_code = $1
        AND is_published = 'Y'
      ORDER BY payment_date DESC
      `,
      [userCode],
    );

    return res.status(200).json({
      success: true,
      total: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("❌ Get receipts error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
