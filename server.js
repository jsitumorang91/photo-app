const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

const UPLOADS_DIR = path.join(__dirname, 'uploads');

// --- NEW: Copy & Move Logic ---

// Copy File
app.post('/copy-item', (req, res) => {
    const { sourcePath, destinationFolder } = req.body;
    const oldPath = path.join(UPLOADS_DIR, sourcePath);
    const fileName = path.basename(sourcePath);
    const newPath = path.join(UPLOADS_DIR, destinationFolder, "copy_" + fileName);

    if (fs.existsSync(oldPath)) {
        fs.copyFileSync(oldPath, newPath);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Source not found" });
    }
});

// Move File
app.post('/move-item', (req, res) => {
    const { sourcePath, destinationFolder } = req.body;
    const oldPath = path.join(UPLOADS_DIR, sourcePath);
    const fileName = path.basename(sourcePath);
    const newPath = path.join(UPLOADS_DIR, destinationFolder, fileName);

    if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Source not found" });
    }
});

// --- Existing Endpoints ---
app.post('/create-folder', (req, res) => {
    const { folderName, currentPath } = req.body;
    const newPath = path.join(UPLOADS_DIR, currentPath || '', folderName);
    if (!fs.existsSync(newPath)) {
        fs.mkdirSync(newPath, { recursive: true });
        res.json({ success: true });
    } else {
        res.status(400).json({ error: "Folder already exists" });
    }
});

app.delete('/delete', (req, res) => {
    const { itemPath } = req.body;
    const fullPath = path.join(UPLOADS_DIR, itemPath);
    if (fs.existsSync(fullPath)) {
        fs.lstatSync(fullPath).isDirectory() ? fs.rmSync(fullPath, { recursive: true }) : fs.unlinkSync(fullPath);
        res.json({ success: true });
    } else { res.status(404).send("Not found"); }
});

app.post('/upload', multer({ storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOADS_DIR, req.body.folder || '')),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
})}).single('photo'), (req, res) => res.json({ success: true }));

app.get('/items', (req, res) => {
    const subFolder = req.query.path || '';
    const directoryPath = path.join(UPLOADS_DIR, subFolder);
    fs.readdir(directoryPath, { withFileTypes: true }, (err, files) => {
        if (err) return res.status(500).send("Error");
        const items = files.filter(f => !f.name.startsWith('.')).map(f => ({
            name: f.name,
            isFolder: f.isDirectory(),
            url: f.isDirectory() ? null : `/uploads/${subFolder ? subFolder + '/' : ''}${f.name}`,
            path: subFolder ? `${subFolder}/${f.name}` : f.name
        }));
        res.json(items);
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));