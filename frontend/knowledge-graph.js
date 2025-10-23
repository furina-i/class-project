// 知识图谱可视化逻辑
let kgChart = null;
let currentGraphData = { nodes: [], links: [] };

// 初始化知识图谱
function initKnowledgeGraph() {
    kgChart = echarts.init(document.getElementById('knowledge-graph'));
    
    // 加载初始数据
    loadGraphData();
    
    // 绑定搜索事件
    document.getElementById('search-entity').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchGraph();
        }
    });
}

// 加载图谱数据 - 修改后的版本
async function loadGraphData(entityType = '', searchTerm = '') {
    try {
        showLoading(true);
        
        // 直接调用后端API获取真实数据
        const params = new URLSearchParams();
        if (entityType) params.append('type', entityType);
        if (searchTerm) params.append('search', searchTerm);
        
        const response = await fetch(`http://localhost:3000/api/knowledge-graph?${params}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const graphData = await response.json();
        
        // 检查API返回的数据结构
        if (!graphData.success) {
            throw new Error(graphData.error || 'API返回错误');
        }
        
        currentGraphData = graphData;
        renderKnowledgeGraph(graphData);
        
        showLoading(false);
        
    } catch (error) {
        console.error('加载知识图谱数据失败:', error);
        showLoading(false);
        
        // 显示更友好的错误信息
        const errorMessage = `无法连接到后端服务器或获取数据失败。
        
可能的原因：
1. 后端服务器未启动（请运行: cd backend && npm start）
2. Neo4j数据库未运行（请启动Docker容器）
3. 网络连接问题

错误详情: ${error.message}`;
        
        alert(errorMessage);
    }
}

// 渲染知识图谱
function renderKnowledgeGraph(graphData) {
    const option = {
        tooltip: {
            formatter: function(params) {
                if (params.dataType === 'node') {
                    let html = `<div style="padding: 10px; max-width: 300px;">
                        <strong style="color: ${getNodeColor(params.data.category)}">${params.data.name}</strong>
                        <br/><em>${getCategoryName(params.data.category)}</em>`;
                    
                    if (params.data.effect) {
                        html += `<br/><br/><strong>效果:</strong> ${params.data.effect}`;
                    }
                    
                    html += `</div>`;
                    return html;
                } else {
                    return `<div style="padding: 8px;">
                        <strong>关系:</strong> ${params.data.relationship}
                    </div>`;
                }
            }
        },
        legend: {
            data: ['主题', '区域', '实施主体', '污染来源', '治理措施'],
            textStyle: { color: '#fff' },
            top: 20,
            right: 20
        },
        series: [{
            type: 'graph',
            layout: 'force',
            data: graphData.nodes,
            links: graphData.links,
            categories: [
                { name: 'Topic' },
                { name: 'Region' },
                { name: 'Organization' },
                { name: 'PollutionSource' },
                { name: 'Measure' }
            ],
            roam: true,
            label: {
                show: true,
                position: 'right',
                formatter: '{b}',
                color: '#fff',
                fontSize: 12
            },
            lineStyle: {
                color: 'source',
                curveness: 0.2,
                width: 2
            },
            emphasis: {
                focus: 'adjacency',
                lineStyle: {
                    width: 3
                }
            },
            force: {
                repulsion: 500,
                gravity: 0.1,
                edgeLength: 100
            },
            itemStyle: {
                borderColor: '#fff',
                borderWidth: 1
            }
        }]
    };
    
    kgChart.setOption(option);
}

// 获取节点颜色
function getNodeColor(category) {
    const colors = {
        'Topic': '#ff6b6b',
        'Region': '#4ecdc4', 
        'Organization': '#45b7d1',
        'PollutionSource': '#f9c80e',
        'Measure': '#f7931e'
    };
    return colors[category] || '#999';
}

// 获取分类名称
function getCategoryName(category) {
    const names = {
        'Topic': '主题',
        'Region': '区域',
        'Organization': '实施主体',
        'PollutionSource': '污染来源',
        'Measure': '治理措施'
    };
    return names[category] || category;
}

// 搜索图谱
function searchGraph() {
    const entityType = document.getElementById('entity-type').value;
    const searchTerm = document.getElementById('search-entity').value;
    loadGraphData(entityType, searchTerm);
}

// 重置图谱
function resetGraph() {
    document.getElementById('entity-type').value = '';
    document.getElementById('search-entity').value = '';
    loadGraphData();
}

// 导出图谱
function exportGraph() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentGraphData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "knowledge-graph.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

// 显示加载状态
function showLoading(show) {
    if (show) {
        kgChart.showLoading('default', {
            text: '加载知识图谱数据...',
            color: '#4bcffa',
            textColor: '#fff',
            maskColor: 'rgba(0, 0, 0, 0.3)'
        });
    } else {
        kgChart.hideLoading();
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initKnowledgeGraph);

// 窗口大小改变时重绘图表
window.addEventListener('resize', function() {
    if (kgChart) {
        kgChart.resize();
    }
});