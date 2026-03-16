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

// Create Folder
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

// Delete Item (File or Folder)
app.delete('/delete', (req, res) => {
    const { itemPath } = req.body;
    const fullPath = path.join(UPLOADS_DIR, itemPath);
    
    if (fs.existsSync(fullPath)) {
        if (fs.lstatSync(fullPath).isDirectory()) {
            fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
            fs.unlinkSync(fullPath);
        }
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Item not found" });
    }
});

app.post('/upload', upload.single('photo'), (req, res) => {
    res.json({ success: true });
});

app.get('/items', (req, res) => {
    const subFolder = req.query.path || '';
    const directoryPath = path.join(UPLOADS_DIR, subFolder);
    
    fs.readdir(directoryPath, { withFileTypes: true }, (err, files) => {
        if (err) return res.status(500).send("Unable to scan directory");
        // FIX: Added filter to hide hidden files like .gitkeep
        const items = files
            .filter(file => !file.name.startsWith('.')) 
            .map(file => ({
                name: file.name,
                isFolder: file.isDirectory(),
                url: file.isDirectory() ? null : `/uploads/${subFolder ? subFolder + '/' : ''}${file.name}`,
                path: subFolder ? `${subFolder}/${file.name}` : file.name
            }));
        res.json(items);
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));