// routes/tasks.js
const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const taskController = require('../controllers/taskController');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

router.get('/',           verifyToken,           taskController.getAllTasks);
router.get('/:id',        verifyToken,           taskController.getTaskById);
router.post('/',          verifyToken, isAdmin,  taskController.createTask);
router.put('/:id',        verifyToken,           taskController.updateTask);
router.delete('/:id',     verifyToken, isAdmin,  taskController.deleteTask);
router.post('/:id/submit',verifyToken, upload.single('file'), taskController.submitTask);
router.put('/:id/grade',  verifyToken, isAdmin,  taskController.gradeSubmission);

module.exports = router;
