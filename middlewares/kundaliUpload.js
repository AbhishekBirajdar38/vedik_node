import multer from 'multer';
import fs from 'fs';
import path from 'path';

const kundaliStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/kundali';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

export const uploadKundaliFile = multer({ storage: kundaliStorage });
