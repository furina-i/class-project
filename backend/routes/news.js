const express = require('express');
const router = express.Router();
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
    'bolt://localhost:7687',
    neo4j.auth.basic('neo4j', 'ocean123')
);

// 获取所有新闻数据的API
router.get('/', async (req, res) => {
    const session = driver.session();
    
    try {
        console.log('📡 收到新闻数据查询请求');
        
        // 查询所有主题及其相关信息
        const result = await session.run(`
            MATCH (topic:Topic)
            OPTIONAL MATCH (topic)-[:HAPPEN_IN]->(region:Region)
            OPTIONAL MATCH (topic)-[:TARGET]->(source:PollutionSource)
            OPTIONAL MATCH (topic)-[:ADOPT]->(measure:Measure)
            OPTIONAL MATCH (org:Organization)-[:IMPLEMENTED_BY]->(topic)
            RETURN topic, 
                   COLLECT(DISTINCT region.name) as regions,
                   COLLECT(DISTINCT source.name) as pollutionSources,
                   COLLECT(DISTINCT measure.name) as measures,
                   COLLECT(DISTINCT org.name) as organizations
        `);
        
        const news = result.records.map(record => {
            const topic = record.get('topic');
            const regions = record.get('regions');
            const pollutionSources = record.get('pollutionSources');
            const measures = record.get('measures');
            const organizations = record.get('organizations');
            
            return {
                主题: topic.properties.name,
                生态区域: regions.length > 0 ? regions[0] : '',
                污染来源: pollutionSources.length > 0 ? pollutionSources[0] : '',
                治理措施: measures.length > 0 ? measures.join('、') : '',
                实施主体: organizations.length > 0 ? organizations.join('、') : '',
                效果数据: topic.properties.effect || ''
            };
        });
        
        console.log(`✅ 返回 ${news.length} 条新闻数据`);
        
        res.json({ 
            success: true,
            news 
        });
        
    } catch (error) {
        console.error('❌ 新闻数据查询错误:', error);
        res.status(500).json({ 
            success: false,
            error: '查询新闻数据失败',
            message: error.message 
        });
    } finally {
        await session.close();
    }
});

module.exports = router;