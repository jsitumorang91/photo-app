const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Critical Fix: Server static files from 'public' for the frontend
app.use(express.static(path.join(__dirname, 'public'))); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// --- NEW: Helper to get recursive folder list for Move/Copy destinations ---
const getAllFolders = (dir, rootDir, folderList = []) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    files.forEach(file => {
        if (file.isDirectory() && !file.name.startsWith('.')) {
            const fullPath = path.join(dir, file.name);
            const relativePath = path.relative(rootDir, fullPath);
            folderList.push({ name: file.name, path: relativePath });
            getAllFolders(fullPath, rootDir, folderList);
        }
    });
    return folderList;
};

// Endpoint to get all folders (destination selection)
app.get('/get-all-folders', (req, res) => {
    try {
        const folders = getAllFolders(UPLOADS_DIR, UPLOADS_DIR);
        // Add root as an option
        folders.unshift({ name: "Home (Root)", path: "" }); 
        res.json(folders);
    } catch (err) { res.status(500).send("Error"); }
});


// --- FILE MANAGEMENT LOGIC (FIXED) ---

// Create Folder (Existing, but re-verified)
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

// Rename Item (Fixed: Handles file extensions for files but not folders)
app.post('/rename', (req, res) => {
    const { oldPath, newName } = req.body;
    const source = path.join(UPLOADS_DIR, oldPath);
    
    if (!fs.existsSync(source)) return res.status(404).json({ error: "Item not found" });

    const isDir = fs.lstatSync(source).isDirectory();
    const directory = path.dirname(source);
    
    // Fix: If it's a file, preserve the extension
    const extension = isDir ? "" : path.extname(oldPath); 
    const destination = path.join(directory, newName + extension);

    if (fs.existsSync(destination)) {
        return res.status(400).json({ error: "An item with that name already exists" });
    }

    try {
        fs.renameSync(source, destination);
        res.json({ success: true });
    } catch (err) { res.status(500).send("Rename failed"); }
});

// Move Item (Fixed: Renamed from copy-item, added proper Move logic)
app.post('/move-item', (req, res) => {
    const { sourcePath, destinationFolder } = req.body;
    const oldPath = path.join(UPLOADS_DIR, sourcePath);
    const fileName = path.basename(sourcePath);
    
    // Construct new path: uploads/destinationFolder/fileName
    const newPath = path.join(UPLOADS_DIR, destinationFolder, fileName);

    if (!fs.existsSync(oldPath)) return res.status(404).send("Source not found");
    if (fs.existsSync(newPath)) return res.status(400).send("Item already exists at destination");

    try {
        fs.renameSync(oldPath, newPath); // Move means rename
        res.json({ success: true });
    } catch (err) { res.status(500).send("Move failed"); }
});

// Copy Item (Fixed: Preserves original file, renames with "copy_")
app.post('/copy-item', (req, res) => {
    const { sourcePath, destinationFolder } = req.body;
    const oldPath = path.join(UPLOADS_DIR, sourcePath);
    const fileName = path.basename(sourcePath);
    
    // Add "copy_" prefix to destination
    const newPath = path.join(UPLOADS_DIR, destinationFolder, "copy_" + fileName);

    if (!fs.existsSync(oldPath)) return res.status(404).send("Source not found");

    try {
        fs.copyFileSync(oldPath, newPath);
        res.json({ success: true });
    } catch (err) { res.status(500).send("Copy failed"); }
});

// Standard Upload and Delete Endpoints
app.post('/upload', multer({ storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOADS_DIR, req.body.folder || '')),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
})}).single('photo'), (req, res) => res.json({ success: true }));

app.delete('/delete', (req, res) => {
    const { itemPath } = req.body;
    const fullPath = path.join(UPLOADS_DIR, itemPath);
    if (fs.existsSync(fullPath)) {
        fs.lstatSync(fullPath).isDirectory() ? fs.rmSync(fullPath, { recursive: true }) : fs.unlinkSync(fullPath);
        res.json({ success: true });
    } else { res.status(404).send("Not found"); }
});

// Get Items (Fixed: Explicitly sends 'path' which is crucial for operations)
app.get('/items', (req, res) => {
    const subFolder = req.query.path || '';
    const dir = path.join(UPLOADS_DIR, subFolder);
    
    // Ensure dir exists (e.g., if someone manually types path)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    fs.readdir(dir, { withFileTypes: true }, (err, files) => {
        if (err) return res.status(500).send("Error");
        const items = files.filter(f => !f.name.startsWith('.')).map(f => ({
            name: f.name,
            isFolder: f.isDirectory(),
            url: f.isDirectory() ? null : `/uploads/${subFolder ? subFolder + '/' : ''}${f.name}`,
            path: subFolder ? `${subFolder}/${f.name}` : f.name // Crucial path relative to uploads
        }));
        res.json(items);
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`BITbyBIT Server active on ${PORT}`));