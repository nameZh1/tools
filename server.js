const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const archiver = require('archiver');

// 使用 Node.js 内置 crypto 生成 UUID
function uuidv4() {
    return crypto.randomUUID();
}

const app = express();
const PORT = 3000;

// 目录配置
const SHARED_FILES_DIR = path.join(__dirname, 'shared_files');
const TEMP_CHUNKS_DIR = path.join(__dirname, 'temp_chunks');

// 确保目录存在
[SHARED_FILES_DIR, TEMP_CHUNKS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// 存储上传任务状态
const uploadTasks = new Map();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/files', express.static('shared_files'));

// Configure Multer for chunk uploads
const chunkStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadId = req.body.uploadId;
        const chunkDir = path.join(TEMP_CHUNKS_DIR, uploadId);
        if (!fs.existsSync(chunkDir)) {
            fs.mkdirSync(chunkDir, { recursive: true });
        }
        cb(null, chunkDir);
    },
    filename: (req, file, cb) => {
        const chunkIndex = req.body.chunkIndex;
        cb(null, `chunk_${chunkIndex}`);
    }
});
const chunkUpload = multer({ storage: chunkStorage });

// Configure Multer for simple file uploads (backward compatible)
const simpleStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, SHARED_FILES_DIR);
    },
    filename: (req, file, cb) => {
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, file.originalname);
    }
});
const simpleUpload = multer({ storage: simpleStorage });

// ==================== 分片上传 API ====================

// 初始化上传任务
app.post('/api/upload/init', (req, res) => {
    const { filename, fileSize, chunkSize, totalChunks, relativePath } = req.body;
    
    // 修复：允许空文件上传（fileSize=0, totalChunks=0 或 1）
    if (!filename || fileSize === undefined || fileSize === null || totalChunks === undefined || totalChunks === null) {
        return res.status(400).json({ error: '缺少必要参数', received: { filename, fileSize, totalChunks } });
    }
    
    const uploadId = uuidv4();
    const task = {
        uploadId,
        filename: Buffer.from(filename, 'latin1').toString('utf8'),
        fileSize,
        chunkSize: chunkSize || 5 * 1024 * 1024,
        totalChunks,
        relativePath: relativePath ? Buffer.from(relativePath, 'latin1').toString('utf8') : '',
        uploadedChunks: new Set(),
        createdAt: Date.now()
    };
    
    uploadTasks.set(uploadId, task);
    
    // 创建分片目录
    const chunkDir = path.join(TEMP_CHUNKS_DIR, uploadId);
    if (!fs.existsSync(chunkDir)) {
        fs.mkdirSync(chunkDir, { recursive: true });
    }
    
    res.json({ uploadId, existingChunks: [] });
});

// 上传分片
app.post('/api/upload/chunk', chunkUpload.single('chunk'), (req, res) => {
    const { uploadId, chunkIndex } = req.body;
    
    if (!uploadId || chunkIndex === undefined) {
        return res.status(400).json({ error: '缺少必要参数' });
    }
    
    const task = uploadTasks.get(uploadId);
    if (!task) {
        return res.status(404).json({ error: '上传任务不存在' });
    }
    
    task.uploadedChunks.add(parseInt(chunkIndex));
    
    res.json({ 
        success: true, 
        chunkIndex: parseInt(chunkIndex),
        uploadedCount: task.uploadedChunks.size,
        totalChunks: task.totalChunks
    });
});

// 查询上传状态
app.get('/api/upload/status/:uploadId', (req, res) => {
    const { uploadId } = req.params;
    const task = uploadTasks.get(uploadId);
    
    if (!task) {
        return res.status(404).json({ error: '上传任务不存在' });
    }
    
    res.json({
        uploadId,
        filename: task.filename,
        totalChunks: task.totalChunks,
        uploadedChunks: Array.from(task.uploadedChunks),
        progress: (task.uploadedChunks.size / task.totalChunks * 100).toFixed(2)
    });
});

// 完成上传，合并分片
app.post('/api/upload/complete', async (req, res) => {
    const { uploadId } = req.body;
    
    const task = uploadTasks.get(uploadId);
    if (!task) {
        return res.status(404).json({ error: '上传任务不存在' });
    }
    
    // 检查所有分片是否已上传（空文件时 totalChunks 可能为 0 或 1）
    if (task.totalChunks > 0 && task.uploadedChunks.size !== task.totalChunks) {
        return res.status(400).json({
            error: '分片未完全上传',
            uploaded: task.uploadedChunks.size,
            total: task.totalChunks
        });
    }
    
    try {
        // 确定目标路径
        let targetDir = SHARED_FILES_DIR;
        if (task.relativePath) {
            const relDir = path.dirname(task.relativePath);
            if (relDir && relDir !== '.') {
                targetDir = path.join(SHARED_FILES_DIR, relDir);
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }
            }
        }
        
        const targetPath = path.join(targetDir, task.filename);
        const chunkDir = path.join(TEMP_CHUNKS_DIR, uploadId);
        
        // 合并分片
        const writeStream = fs.createWriteStream(targetPath);
        
        for (let i = 0; i < task.totalChunks; i++) {
            const chunkPath = path.join(chunkDir, `chunk_${i}`);
            const chunkData = fs.readFileSync(chunkPath);
            writeStream.write(chunkData);
        }
        
        writeStream.end();
        
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });
        
        // 清理分片
        fs.rmSync(chunkDir, { recursive: true, force: true });
        uploadTasks.delete(uploadId);
        
        res.json({ 
            success: true, 
            filename: task.filename,
            path: task.relativePath || task.filename
        });
    } catch (error) {
        console.error('合并分片失败:', error);
        res.status(500).json({ error: '合并分片失败: ' + error.message });
    }
});

// ==================== 简单文件上传 API（向后兼容）====================

app.post('/api/upload', simpleUpload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    res.send({ message: 'File uploaded successfully', filename: req.file.filename });
});

// ==================== 文件列表 API（支持目录树）====================

// 递归构建目录树
function buildDirectoryTree(dirPath, basePath = '') {
    const items = [];
    
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            // 跳过 .gitkeep 文件
            if (entry.name === '.gitkeep') continue;
            
            const fullPath = path.join(dirPath, entry.name);
            const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;
            
            if (entry.isDirectory()) {
                const children = buildDirectoryTree(fullPath, relativePath);
                const stats = fs.statSync(fullPath);
                items.push({
                    name: entry.name,
                    path: relativePath.replace(/\\/g, '/'),
                    isDirectory: true,
                    size: 0,
                    mtime: stats.mtime,
                    children: children
                });
            } else {
                const stats = fs.statSync(fullPath);
                items.push({
                    name: entry.name,
                    path: relativePath.replace(/\\/g, '/'),
                    isDirectory: false,
                    size: stats.size,
                    mtime: stats.mtime
                });
            }
        }
    } catch (e) {
        console.error('读取目录失败:', e);
    }
    
    return items;
}

// 获取文件列表（目录树结构）
app.get('/api/files', (req, res) => {
    try {
        const tree = buildDirectoryTree(SHARED_FILES_DIR);
        res.json(tree);
    } catch (error) {
        console.error('获取文件列表失败:', error);
        res.status(500).json({ error: '获取文件列表失败' });
    }
});

// ==================== 文件夹下载 API ====================

app.get('/api/download-folder/*', (req, res) => {
    const folderPath = req.params[0];
    
    // 安全检查
    if (folderPath.includes('..')) {
        return res.status(400).json({ error: '无效的路径' });
    }
    
    const fullPath = path.join(SHARED_FILES_DIR, folderPath);
    
    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: '文件夹不存在' });
    }
    
    const stats = fs.statSync(fullPath);
    if (!stats.isDirectory()) {
        return res.status(400).json({ error: '指定路径不是文件夹' });
    }
    
    const folderName = path.basename(folderPath);
    const zipFilename = `${folderName}.zip`;
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(zipFilename)}`);
    
    const archive = archiver('zip', { zlib: { level: 5 } });
    
    archive.on('error', (err) => {
        console.error('打包失败:', err);
        res.status(500).json({ error: '打包失败' });
    });
    
    archive.pipe(res);
    archive.directory(fullPath, folderName);
    archive.finalize();
});

// ==================== 删除 API（支持文件和文件夹）====================

app.delete('/api/files/*', (req, res) => {
    const targetPath = req.params[0];
    
    // 安全检查
    if (targetPath.includes('..')) {
        return res.status(400).json({ error: '无效的路径' });
    }
    
    const fullPath = path.join(SHARED_FILES_DIR, targetPath);
    
    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: '文件或文件夹不存在' });
    }
    
    try {
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
            fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
            fs.unlinkSync(fullPath);
        }
        
        res.json({ message: '删除成功' });
    } catch (error) {
        console.error('删除失败:', error);
        res.status(500).json({ error: '删除失败: ' + error.message });
    }
});

// ==================== 文本共享 API ====================

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

// ==================== 服务器启动 ====================

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
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

// 定期清理过期的上传任务（超过 24 小时）
setInterval(() => {
    const now = Date.now();
    const expireTime = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [uploadId, task] of uploadTasks.entries()) {
        if (now - task.createdAt > expireTime) {
            const chunkDir = path.join(TEMP_CHUNKS_DIR, uploadId);
            if (fs.existsSync(chunkDir)) {
                fs.rmSync(chunkDir, { recursive: true, force: true });
            }
            uploadTasks.delete(uploadId);
            console.log(`清理过期上传任务: ${uploadId}`);
        }
    }
}, 60 * 60 * 1000); // 每小时检查一次

startServer(PORT);
