const express = require('express');
const router = express.Router();
const neo4j = require('neo4j-driver');

// 创建Neo4j驱动连接
const driver = neo4j.driver(
    'bolt://localhost:7687',
    neo4j.auth.basic('neo4j', 'ocean123')
);

// 健康检查端点
router.get('/health', async (req, res) => {
    const session = driver.session();
    try {
        const result = await session.run('RETURN 1 as test');
        res.json({ 
            status: 'OK', 
            database: 'Connected',
            message: 'Neo4j数据库连接正常'
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'ERROR', 
            database: 'Disconnected',
            message: 'Neo4j数据库连接失败',
            error: error.message 
        });
    } finally {
        await session.close();
    }
});

// 获取知识图谱数据的API
router.get('/', async (req, res) => {
    const { type, search } = req.query;
    
    console.log(`📡 收到知识图谱查询请求: type=${type || 'all'}, search=${search || 'none'}`);
    
    const session = driver.session();
    
    try {
        // 构建Cypher查询
        let cypherQuery = `
            MATCH (n1)-[r]->(n2)
            WHERE 1=1
        `;
        
        const params = {};
        
        // 添加类型筛选
        if (type && type !== '') {
            cypherQuery += ` AND (labels(n1) = $type OR labels(n2) = $type)`;
            params.type = type;
        }
        
        // 添加搜索条件
        if (search && search !== '') {
            cypherQuery += ` AND (n1.name CONTAINS $search OR n2.name CONTAINS $search)`;
            params.search = search;
        }
        
        cypherQuery += `
            RETURN n1, r, n2
            LIMIT 200
        `;
        
        console.log(`🔍 执行Cypher查询: ${cypherQuery}`);
        console.log(`📊 查询参数:`, params);
        
        const result = await session.run(cypherQuery, params);
        
        const nodes = [];
        const links = [];
        const nodeMap = new Map();
        
        result.records.forEach(record => {
            const n1 = record.get('n1');
            const n2 = record.get('n2');
            const r = record.get('r');
            
            // 处理第一个节点
            const n1Id = n1.identity.toString();
            if (!nodeMap.has(n1Id)) {
                nodes.push({
                    id: n1Id,
                    name: n1.properties.name || '未知',
                    category: n1.labels[0] || 'Unknown',
                    effect: n1.properties.effect || '',
                    symbolSize: getSymbolSize(n1.labels[0])
                });
                nodeMap.set(n1Id, true);
            }
            
            // 处理第二个节点
            const n2Id = n2.identity.toString();
            if (!nodeMap.has(n2Id)) {
                nodes.push({
                    id: n2Id,
                    name: n2.properties.name || '未知',
                    category: n2.labels[0] || 'Unknown',
                    effect: n2.properties.effect || '',
                    symbolSize: getSymbolSize(n2.labels[0])
                });
                nodeMap.set(n2Id, true);
            }
            
            // 处理关系
            links.push({
                source: n1Id,
                target: n2Id,
                relationship: r.type
            });
        });
        
        console.log(`✅ 查询成功: 返回 ${nodes.length} 个节点, ${links.length} 条关系`);
        
        res.json({ 
            success: true,
            nodes, 
            links,
            summary: {
                totalNodes: nodes.length,
                totalLinks: links.length,
                nodeTypes: countNodeTypes(nodes),
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ 知识图谱查询错误:', error);
        res.status(500).json({ 
            success: false,
            error: '查询知识图谱数据失败',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    } finally {
        await session.close();
    }
});

// 获取节点统计信息
router.get('/stats', async (req, res) => {
    const session = driver.session();
    
    try {
        console.log('📊 获取知识图谱统计信息');
        
        // 查询各类型节点数量
        const nodeStats = await session.run(`
            MATCH (n)
            RETURN labels(n)[0] as type, count(*) as count
            ORDER BY count DESC
        `);
        
        // 查询关系类型统计
        const relStats = await session.run(`
            MATCH ()-[r]->()
            RETURN type(r) as relationship, count(*) as count
            ORDER BY count DESC
        `);
        
        // 查询最活跃的节点（连接最多的节点）
        const activeNodes = await session.run(`
            MATCH (n)-[r]-()
            RETURN n.name as name, labels(n)[0] as type, count(r) as connections
            ORDER BY connections DESC
            LIMIT 10
        `);
        
        const stats = {
            nodeTypes: nodeStats.records.map(record => ({
                type: record.get('type'),
                count: record.get('count').toInt()
            })),
            relationships: relStats.records.map(record => ({
                relationship: record.get('relationship'),
                count: record.get('count').toInt()
            })),
            mostConnectedNodes: activeNodes.records.map(record => ({
                name: record.get('name'),
                type: record.get('type'),
                connections: record.get('connections').toInt()
            })),
            timestamp: new Date().toISOString()
        };
        
        console.log(`✅ 统计信息获取成功`);
        
        res.json({
            success: true,
            stats
        });
        
    } catch (error) {
        console.error('❌ 获取统计信息失败:', error);
        res.status(500).json({
            success: false,
            error: '获取统计信息失败',
            message: error.message
        });
    } finally {
        await session.close();
    }
});

// 根据节点ID获取详细信息
router.get('/node/:id', async (req, res) => {
    const nodeId = req.params.id;
    const session = driver.session();
    
    try {
        console.log(`🔍 获取节点详情: ${nodeId}`);
        
        const result = await session.run(`
            MATCH (n) WHERE id(n) = $id
            OPTIONAL MATCH (n)-[r]-(related)
            RETURN n, type(r) as relType, related
            ORDER BY relType
        `, { id: neo4j.int(nodeId) });
        
        if (result.records.length === 0) {
            return res.status(404).json({
                success: false,
                error: '节点未找到'
            });
        }
        
        const node = result.records[0].get('n');
        const connections = {};
        
        result.records.forEach(record => {
            const relType = record.get('relType');
            const related = record.get('related');
            
            if (relType && related) {
                if (!connections[relType]) {
                    connections[relType] = [];
                }
                
                connections[relType].push({
                    id: related.identity.toString(),
                    name: related.properties.name || '未知',
                    type: related.labels[0] || 'Unknown'
                });
            }
        });
        
        const nodeDetails = {
            id: node.identity.toString(),
            name: node.properties.name || '未知',
            type: node.labels[0] || 'Unknown',
            properties: node.properties,
            connections: connections,
            totalConnections: Object.values(connections).reduce((sum, arr) => sum + arr.length, 0)
        };
        
        console.log(`✅ 节点详情获取成功: ${nodeDetails.name}`);
        
        res.json({
            success: true,
            node: nodeDetails
        });
        
    } catch (error) {
        console.error('❌ 获取节点详情失败:', error);
        res.status(500).json({
            success: false,
            error: '获取节点详情失败',
            message: error.message
        });
    } finally {
        await session.close();
    }
});

// 搜索节点
router.get('/search', async (req, res) => {
    const { q, limit = 10 } = req.query;
    
    if (!q) {
        return res.status(400).json({
            success: false,
            error: '缺少搜索参数 q'
        });
    }
    
    const session = driver.session();
    
    try {
        console.log(`🔍 搜索节点: ${q}`);
        
        const result = await session.run(`
            MATCH (n)
            WHERE n.name CONTAINS $query
            RETURN n
            LIMIT $limit
        `, { query: q, limit: neo4j.int(parseInt(limit)) });
        
        const nodes = result.records.map(record => {
            const n = record.get('n');
            return {
                id: n.identity.toString(),
                name: n.properties.name || '未知',
                type: n.labels[0] || 'Unknown',
                effect: n.properties.effect || ''
            };
        });
        
        console.log(`✅ 搜索完成: 找到 ${nodes.length} 个节点`);
        
        res.json({
            success: true,
            query: q,
            results: nodes,
            total: nodes.length
        });
        
    } catch (error) {
        console.error('❌ 搜索失败:', error);
        res.status(500).json({
            success: false,
            error: '搜索失败',
            message: error.message
        });
    } finally {
        await session.close();
    }
});

// 获取特定类型的所有节点
router.get('/nodes/:type', async (req, res) => {
    const nodeType = req.params.type;
    const { limit = 50 } = req.query;
    
    const session = driver.session();
    
    try {
        console.log(`🔍 获取类型为 ${nodeType} 的所有节点`);
        
        const result = await session.run(`
            MATCH (n:${nodeType})
            RETURN n
            LIMIT $limit
        `, { limit: neo4j.int(parseInt(limit)) });
        
        const nodes = result.records.map(record => {
            const n = record.get('n');
            return {
                id: n.identity.toString(),
                name: n.properties.name || '未知',
                type: nodeType,
                effect: n.properties.effect || ''
            };
        });
        
        console.log(`✅ 获取到 ${nodes.length} 个 ${nodeType} 节点`);
        
        res.json({
            success: true,
            nodeType,
            nodes,
            total: nodes.length
        });
        
    } catch (error) {
        console.error(`❌ 获取 ${nodeType} 节点失败:`, error);
        res.status(500).json({
            success: false,
            error: `获取 ${nodeType} 节点失败`,
            message: error.message
        });
    } finally {
        await session.close();
    }
});

// 辅助函数：根据节点类型确定符号大小
function getSymbolSize(nodeType) {
    const sizes = {
        'Topic': 25,
        'Region': 20,
        'Organization': 18,
        'PollutionSource': 16,
        'Measure': 14
    };
    return sizes[nodeType] || 15;
}

// 辅助函数：统计节点类型
function countNodeTypes(nodes) {
    const typeCount = {};
    nodes.forEach(node => {
        const type = node.category;
        typeCount[type] = (typeCount[type] || 0) + 1;
    });
    return typeCount;
}

// 错误处理中间件
router.use((error, req, res, next) => {
    console.error('💥 路由错误:', error);
    res.status(500).json({
        success: false,
        error: '内部服务器错误',
        message: error.message
    });
});

module.exports = router;