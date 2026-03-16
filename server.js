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
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// Fungsi Upload yang dinamis (bisa upload ke folder tertentu)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const targetPath = path.join(UPLOADS_DIR, req.body.folder || '');
        cb(null, targetPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// API: Ambil daftar file & folder berdasarkan path
app.get('/items', (req, res) => {
    const subFolder = req.query.path || '';
    const directoryPath = path.join(UPLOADS_DIR, subFolder);
    
    fs.readdir(directoryPath, { withFileTypes: true }, (err, files) => {
        if (err) return res.status(500).send("Gagal scan folder");
        
        const items = files
            .filter(file => !file.name.startsWith('.')) // Sembunyikan .gitkeep
            .map(file => ({
                name: file.name,
                isFolder: file.isDirectory(),
                url: file.isDirectory() ? null : `/uploads/${subFolder ? subFolder + '/' : ''}${file.name}`,
                path: subFolder ? `${subFolder}/${file.name}` : file.name
            }));
        res.json(items);
    });
});

// API: Buat Folder Baru
app.post('/create-folder', (req, res) => {
    const { folderName, currentPath } = req.body;
    const newPath = path.join(UPLOADS_DIR, currentPath || '', folderName);
    if (!fs.existsSync(newPath)) {
        fs.mkdirSync(newPath, { recursive: true });
        res.json({ success: true });
    } else {
        res.status(400).json({ error: "Folder sudah ada" });
    }
});

// API: Move / Copy Item
app.post('/transfer-item', (req, res) => {
    const { action, sourcePath, destinationPath } = req.body;
    const oldFullPath = path.join(UPLOADS_DIR, sourcePath);
    const fileName = path.basename(sourcePath);
    const newFullPath = path.join(UPLOADS_DIR, destinationPath, fileName);

    try {
        if (action === 'move') {
            fs.renameSync(oldFullPath, newFullPath);
        } else if (action === 'copy') {
            fs.copyFileSync(oldFullPath, path.join(UPLOADS_DIR, destinationPath, "copy_" + fileName));
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Gagal memproses file" });
    }
});

// API: Hapus Item
app.delete('/delete', (req, res) => {
    const { itemPath } = req.body;
    const fullPath = path.join(UPLOADS_DIR, itemPath);
    if (fs.existsSync(fullPath)) {
        fs.lstatSync(fullPath).isDirectory() ? fs.rmSync(fullPath, { recursive: true }) : fs.unlinkSync(fullPath);
        res.json({ success: true });
    } else { res.status(404).send("Item tidak ditemukan"); }
});

app.post('/upload', upload.single('photo'), (req, res) => res.json({ success: true }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));