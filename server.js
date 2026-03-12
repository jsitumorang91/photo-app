const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.static('public')); // Melayani file HTML dari folder public
app.use('/uploads', express.static('uploads')); // Melayani file foto

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Endpoint Upload - Menggunakan path relatif
app.post('/upload', upload.single('photo'), (req, res) => {
    if (!req.file) return res.status(400).send("Gagal upload");
    res.json({ url: `/uploads/${req.file.filename}` });
});

// Endpoint Ambil Foto - Menggunakan path relatif
app.get('/photos', (req, res) => {
    const directoryPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath);

    fs.readdir(directoryPath, (err, files) => {
        if (err) return res.status(500).send("Gagal membaca folder");
        const fileInfos = files
            .filter(file => !file.startsWith('.'))
            .map(file => ({ url: `/uploads/${file}` }));
        res.json(fileInfos);
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));