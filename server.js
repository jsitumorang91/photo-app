const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Critical Fix: Serve static files from 'public' for the frontend
app.use(express.static(path.join(__dirname, 'public'))); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// Rename Functionality
app.post('/rename', (req, res) => {
    const { oldPath, newName } = req.body;
    const source = path.join(UPLOADS_DIR, oldPath);
    const isDir = fs.lstatSync(source).isDirectory();
    const extension = isDir ? "" : path.extname(oldPath);
    const destination = path.join(path.dirname(source), newName + extension);

    if (fs.existsSync(source)) {
        fs.renameSync(source, destination);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Item not found" });
    }
});

// Copy Functionality
app.post('/copy-item', (req, res) => {
    const { sourcePath, destinationFolder } = req.body;
    const oldPath = path.join(UPLOADS_DIR, sourcePath);
    const newPath = path.join(UPLOADS_DIR, destinationFolder, "copy_" + path.basename(sourcePath));
    if (fs.existsSync(oldPath)) {
        fs.copyFileSync(oldPath, newPath);
        res.json({ success: true });
    } else { res.status(404).send("Source not found"); }
});

// Move Functionality
app.post('/move-item', (req, res) => {
    const { sourcePath, destinationFolder } = req.body;
    const oldPath = path.join(UPLOADS_DIR, sourcePath);
    const newPath = path.join(UPLOADS_DIR, destinationFolder, path.basename(sourcePath));
    if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        res.json({ success: true });
    } else { res.status(404).send("Source not found"); }
});

// Existing logic for upload and items
app.post('/upload', multer({ storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOADS_DIR, req.body.folder || '')),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
})}).single('photo'), (req, res) => res.json({ success: true }));

app.get('/items', (req, res) => {
    const subFolder = req.query.path || '';
    const dir = path.join(UPLOADS_DIR, subFolder);
    fs.readdir(dir, { withFileTypes: true }, (err, files) => {
        if (err) return res.status(500).send("Error scanning directory");
        const items = files.filter(f => !f.name.startsWith('.')).map(f => ({
            name: f.name, isFolder: f.isDirectory(),
            url: f.isDirectory() ? null : `/uploads/${subFolder ? subFolder + '/' : ''}${f.name}`,
            path: subFolder ? `${subFolder}/${f.name}` : f.name
        }));
        res.json(items);
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server live on ${PORT}`));