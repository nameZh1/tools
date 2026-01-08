const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON bodies
app.use(express.static('public')); // Serve frontend
app.use('/files', express.static('shared_files')); // Serve shared files

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'shared_files/');
    },
    filename: (req, file, cb) => {
        // Fix for UTF-8 filenames
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// API: Get list of files
app.get('/api/files', (req, res) => {
    const directoryPath = path.join(__dirname, 'shared_files');
    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            return res.status(500).send('Unable to scan directory: ' + err);
        }
        
        const fileList = files.map(file => {
            try {
                const stats = fs.statSync(path.join(directoryPath, file));
                return {
                    name: file,
                    size: stats.size,
                    mtime: stats.mtime
                };
            } catch (e) {
                return null;
            }
        }).filter(item => item !== null);
        
        res.json(fileList);
    });
});

// API: Upload file
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    res.send({ message: 'File uploaded successfully', filename: req.file.filename });
});

// API: Get shared text
app.get('/api/text', (req, res) => {
    const filePath = path.join(__dirname, 'shared_text.txt');
    if (fs.existsSync(filePath)) {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).send('Error reading text file');
            }
            res.send({ text: data });
        });
    } else {
        res.send({ text: '' });
    }
});

// API: Update shared text
app.post('/api/text', (req, res) => {
    const { text } = req.body;
    const filePath = path.join(__dirname, 'shared_text.txt');
    fs.writeFile(filePath, text || '', (err) => {
        if (err) {
            return res.status(500).send('Error saving text file');
        }
        res.send({ message: 'Text saved successfully' });
    });
});

// API: Delete file
app.delete('/api/files/:filename', (req, res) => {
    const filename = req.params.filename;
    // Basic security check
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).send('Invalid filename');
    }
    
    const filePath = path.join(__dirname, 'shared_files', filename);

    if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
            if (err) {
                return res.status(500).send('Error deleting file');
            }
            res.send({ message: 'File deleted successfully' });
        });
    } else {
        res.status(404).send('File not found');
    }
});

// Helper to get local IP
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal and non-IPv4 addresses
            if ('IPv4' !== iface.family || iface.internal) {
                continue;
            }
            return iface.address;
        }
    }
    return 'localhost';
}

function startServer(port) {
    const server = app.listen(port, () => {
        const ip = getLocalIp();
        console.log(`Server running at http://${ip}:${port}`);
        console.log(`On the other computer, open this URL in the browser.`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is busy, trying ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error(err);
        }
    });
}

startServer(PORT);
