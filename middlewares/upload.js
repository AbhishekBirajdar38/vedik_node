const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/topic-media"); // create this folder
  },
  filename: (req, file, cb) => {
    const unique =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

// 🔥 ACCEPT ANY FILE
const uploadAny = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
}).any();

module.exports = { uploadAny };
