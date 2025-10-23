const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// 路由
app.use('/api/knowledge-graph', require('./routes/knowledge-graph'));
app.use('/api/news', require('./routes/news'));  // ← 新增新闻数据API

// 提供前端文件
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/knowledge-graph', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/knowledge-graph.html'));
});

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: '海洋新闻态势感知系统后端运行正常',
        timestamp: new Date().toISOString()
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`📊 主仪表板: http://localhost:${PORT}`);
    console.log(`🌐 知识图谱: http://localhost:${PORT}/knowledge-graph`);
    console.log(`❤️  健康检查: http://localhost:${PORT}/health`);
    console.log(`🔗 知识图谱API: http://localhost:3000/api/knowledge-graph`);
    console.log(`📰 新闻数据API: http://localhost:3000/api/news`);
});