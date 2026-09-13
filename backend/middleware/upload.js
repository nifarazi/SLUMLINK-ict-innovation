import multer from "multer";

const storage = multer.memoryStorage();

// You can increase this limit if needed (example: 50MB)
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

export default upload;
