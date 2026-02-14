const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Ensure uploads folder exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(UPLOAD_DIR));

// Multer config: store files with unique timestamp names
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
const upload = multer({ storage });

// SSE clients for real-time update
let sseClients = [];

app.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.flushHeaders();

  sseClients.push(res);
  req.on('close', () => {
    sseClients = sseClients.filter(c => c !== res);
  });
});

function broadcastEvent(event) {
  sseClients.forEach(client => {
    client.write(`data: ${JSON.stringify(event)}\n\n`);
  });
}

// Upload multiple images route
app.post('/upload', upload.array('images', 20), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const filenames = req.files.map(file => file.filename);
  filenames.forEach(filename => broadcastEvent({ type: 'add', filename }));

  res.json({ filenames });
});

// Get list of images
app.get('/images', (req, res) => {
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) return res.status(500).json([]);
    const images = files.filter(f => /\.(jpe?g|png|gif|webp)$/i.test(f));
    res.json(images);
  });
});

// Delete an image
app.delete('/delete/:filename', (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) return res.status(404).json({ success: false, error: 'File not found' });

    fs.unlink(filePath, (err) => {
      if (err) return res.status(500).json({ success: false, error: 'Failed to delete file' });

      broadcastEvent({ type: 'delete', filename: req.params.filename });
      res.json({ success: true, filename: req.params.filename });
    });
  });
});

// Delete all images route
app.delete('/delete-all', (req, res) => {
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) return res.status(500).json({ success: false, error: 'Failed to read directory' });

    const images = files.filter(f => /\.(jpe?g|png|gif|webp)$/i.test(f));
    let deletedCount = 0;

    images.forEach((file) => {
      const filePath = path.join(UPLOAD_DIR, file);
      fs.unlink(filePath, (err) => {
        if (!err) {
          broadcastEvent({ type: 'delete', filename: file });
          deletedCount++;
        }
      });
    });

    res.json({ success: true, deletedCount });
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
