const neo4j = require('neo4j-driver');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// Neo4j连接配置
const driver = neo4j.driver(
    'bolt://localhost:7687',
    neo4j.auth.basic('neo4j', 'ocean123')
);

async function importCSVToNeo4j() {
    const session = driver.session();
    
    try {
        console.log('🚀 开始导入CSV数据到Neo4j...');
        
        const results = [];
        const csvPath = path.join(__dirname, '../data/out1.csv');
        
        console.log(`📂 读取文件: ${csvPath}`);
        
        // 检查文件是否存在
        if (!fs.existsSync(csvPath)) {
            console.error('❌ CSV文件不存在:', csvPath);
            console.log('💡 请确保在项目根目录创建了 data/out1.csv 文件');
            process.exit(1);
        }
        
        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (data) => {
                results.push(data);
            })
            .on('end', async () => {
                console.log(`✅ 读取到 ${results.length} 条记录`);
                
                let successCount = 0;
                let errorCount = 0;
                
                for (const [index, row] of results.entries()) {
                    try {
                        console.log(`📝 处理第 ${index + 1}/${results.length} 条: ${row.主题 || '无主题'}`);
                        
                        const topicName = row.主题 || `未知主题_${index}`;
                        
                        // 1. 创建主题节点
                        await session.run(`
                            MERGE (topic:Topic {name: $topic})
                            SET topic.effect = $effect
                        `, {
                            topic: topicName,
                            effect: row.效果数据 || ''
                        });
                        
                        // 2. 创建区域关系
                        if (row.生态区域 && row.生态区域.trim()) {
                            await session.run(`
                                MERGE (region:Region {name: $region})
                                MERGE (topic:Topic {name: $topic})
                                MERGE (topic)-[:HAPPEN_IN]->(region)
                            `, {
                                region: row.生态区域.trim(),
                                topic: topicName
                            });
                        }
                        
                        // 3. 创建实施主体关系
                        if (row.实施主体 && row.实施主体.trim()) {
                            const orgs = row.实施主体.split('、');
                            for (const org of orgs) {
                                const orgName = org.trim();
                                if (orgName) {
                                    await session.run(`
                                        MERGE (org:Organization {name: $org})
                                        MERGE (topic:Topic {name: $topic})
                                        MERGE (org)-[:IMPLEMENTED_BY]->(topic)
                                    `, {
                                        org: orgName,
                                        topic: topicName
                                    });
                                }
                            }
                        }
                        
                        // 4. 创建污染来源关系
                        if (row.污染来源 && row.污染来源.trim()) {
                            await session.run(`
                                MERGE (source:PollutionSource {name: $source})
                                MERGE (topic:Topic {name: $topic})
                                MERGE (topic)-[:TARGET]->(source)
                            `, {
                                source: row.污染来源.trim(),
                                topic: topicName
                            });
                        }
                        
                        // 5. 创建治理措施关系
                        if (row.治理措施 && row.治理措施.trim()) {
                            const measures = row.治理措施.split('、');
                            for (const measure of measures) {
                                const measureName = measure.trim();
                                if (measureName) {
                                    await session.run(`
                                        MERGE (measure:Measure {name: $measure})
                                        MERGE (topic:Topic {name: $topic})
                                        MERGE (topic)-[:ADOPT]->(measure)
                                    `, {
                                        measure: measureName,
                                        topic: topicName
                                    });
                                }
                            }
                        }
                        
                        successCount++;
                        
                    } catch (error) {
                        errorCount++;
                        console.error(`❌ 处理第 ${index + 1} 条记录时出错:`, error.message);
                    }
                }
                
                console.log('\n🎉 数据导入完成！');
                console.log(`✅ 成功: ${successCount} 条`);
                console.log(`❌ 失败: ${errorCount} 条`);
                
                await session.close();
                await driver.close();
                process.exit(0);
            });
            
    } catch (error) {
        console.error('💥 导入数据时发生严重错误:', error);
        process.exit(1);
    }
}

// 运行导入
importCSVToNeo4j();