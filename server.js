const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.static('public')); 
app.use('/uploads', express.static('uploads')); [cite: 1]

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
}); [cite: 1]

const upload = multer({ storage: storage }); [cite: 1]

app.post('/upload', upload.single('photo'), (req, res) => {
    res.json({ url: `/uploads/${req.file.filename}` }); [cite: 1]
});

app.get('/photos', (req, res) => {
    const directoryPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath);

    fs.readdir(directoryPath, (err, files) => {
        if (err) return res.status(500).send("Unable to scan files"); [cite: 1]
        const fileInfos = files
            .filter(file => !file.startsWith('.'))
            .map(file => ({ url: `/uploads/${file}` })); [cite: 1]
        res.json(fileInfos);
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); [cite: 1]