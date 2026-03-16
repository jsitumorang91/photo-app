const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Melayani file statis dari folder 'public'
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// Konfigurasi Upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const folder = req.body.folder || '';
        const targetPath = path.join(UPLOADS_DIR, folder);
        if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });
        cb(null, targetPath);
    },
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// API: Ambil Daftar Item
app.get('/items', (req, res) => {
    const subPath = req.query.path || '';
    const dir = path.join(UPLOADS_DIR, subPath);
    
    if (!fs.existsSync(dir)) return res.json([]);

    fs.readdir(dir, { withFileTypes: true }, (err, files) => {
        if (err) return res.status(500).json({ error: "Gagal membaca folder" });
        const items = files.filter(f => !f.name.startsWith('.')).map(f => ({
            name: f.name,
            isFolder: f.isDirectory(),
            url: f.isDirectory() ? null : `/uploads/${subPath ? subPath + '/' : ''}${f.name}`,
            path: subPath ? `${subPath}/${f.name}` : f.name
        }));
        res.json(items);
    });
});

// API: Rename
app.post('/rename', (req, res) => {
    const { oldPath, newName } = req.body;
    const fullOldPath = path.join(UPLOADS_DIR, oldPath);
    const ext = path.extname(oldPath);
    const directory = path.dirname(fullOldPath);
    const fullNewPath = path.join(directory, newName + (fs.lstatSync(fullOldPath).isDirectory() ? '' : ext));

    try {
        fs.renameSync(fullOldPath, fullNewPath);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Gagal rename" }); }
});

// API: Move / Copy
app.post('/transfer', (req, res) => {
    const { action, source, destFolder } = req.body;
    const oldPath = path.join(UPLOADS_DIR, source);
    const fileName = path.basename(source);
    const newPath = path.join(UPLOADS_DIR, destFolder, (action === 'copy' ? 'copy_' : '') + fileName);

    try {
        if (action === 'copy') {
            fs.copyFileSync(oldPath, newPath);
        } else {
            fs.renameSync(oldPath, newPath);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Gagal proses file" }); }
});

// API: Create Folder & Delete
app.post('/create-folder', (req, res) => {
    const target = path.join(UPLOADS_DIR, req.body.path || '', req.body.name);
    if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
    res.json({ success: true });
});

app.delete('/delete', (req, res) => {
    const target = path.join(UPLOADS_DIR, req.body.path);
    fs.lstatSync(target).isDirectory() ? fs.rmSync(target, { recursive: true }) : fs.unlinkSync(target);
    res.json({ success: true });
});

app.post('/upload', upload.single('photo'), (req, res) => res.json({ success: true }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));