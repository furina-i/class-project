// 全局变量
let currentData = [];
let filteredData = [];
let charts = {};
let currentPage = 1;
let pageSize = 10;
let totalPages = 1;

// 初始化函数 - 增强版本
async function init() {
    try {
        // 尝试从后端API获取真实数据
        console.log('正在从后端API加载数据...');
        const response = await fetch('http://localhost:3000/api/news');
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.news) {
                currentData = data.news;
                console.log(`✅ 成功加载 ${currentData.length} 条新闻数据`);
            } else {
                throw new Error('API返回数据格式错误');
            }
        } else {
            throw new Error(`HTTP错误: ${response.status}`);
        }
    } catch (error) {
        console.warn('无法连接到后端API，使用模拟数据:', error.message);
        // 使用模拟数据作为fallback
        currentData = typeof newsData !== 'undefined' ? newsData : [];
        console.log(`📋 使用模拟数据: ${currentData.length} 条记录`);
    }
    
    filteredData = [...currentData];
    
    // 初始化统计信息
    updateStatistics();
    
    // 初始化筛选器选项
    initFilters();
    
    // 初始化分页
    initPagination();
    
    // 渲染新闻列表（带分页）
    renderNewsList();
    
    // 初始化图表（3D地图、时间趋势、词云）
    initCharts();
    
    // 绑定事件
    bindEvents();
    
    // 显示数据状态
    showDataStatus();
}

// 显示数据状态信息
function showDataStatus() {
    const hasBackendData = currentData.length > 0 && currentData !== newsData;
    const statusMessage = hasBackendData ? 
        `✅ 已连接后端数据库 (${currentData.length} 条记录)` : 
        '⚠️ 使用模拟数据 (后端连接失败)';
    
    console.log(statusMessage);
    
    // 可以在页面上显示状态提示
    const statusElement = document.createElement('div');
    statusElement.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        background: ${hasBackendData ? '#4CAF50' : '#FF9800'};
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 1000;
    `;
    statusElement.textContent = statusMessage;
    document.body.appendChild(statusElement);
    
    // 5秒后自动隐藏
    setTimeout(() => {
        statusElement.remove();
    }, 5000);
}

// 更新统计信息
function updateStatistics() {
    document.getElementById('total-news').textContent = currentData.length;
    
    const regions = new Set(currentData.map(item => item.生态区域).filter(region => region));
    document.getElementById('total-regions').textContent = regions.size;
    
    const topics = new Set(currentData.map(item => item.主题).filter(topic => topic));
    document.getElementById('total-topics').textContent = topics.size;
    
    const projects = new Set(currentData.map(item => item.实施主体).filter(project => project));
    document.getElementById('active-projects').textContent = projects.size;
}

// 初始化筛选器
function initFilters() {
    const regionFilter = document.getElementById('region-filter');
    const topicFilter = document.getElementById('topic-filter');
    
    // 获取所有区域和主题
    const regions = [...new Set(currentData.map(item => item.生态区域).filter(region => region))];
    const topics = [...new Set(currentData.map(item => item.主题).filter(topic => topic))];
    
    // 填充区域筛选器
    regions.forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        regionFilter.appendChild(option);
    });
    
    // 填充主题筛选器
    topics.forEach(topic => {
        const option = document.createElement('option');
        option.value = topic;
        option.textContent = topic;
        topicFilter.appendChild(option);
    });
}

// 分页相关函数
function initPagination() {
    updatePaginationInfo();
    renderPaginationControls();
}

function updatePaginationInfo() {
    const totalItems = filteredData.length;
    totalPages = Math.ceil(totalItems / pageSize);
    
    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, totalItems);
    
    document.getElementById('start-index').textContent = startIndex;
    document.getElementById('end-index').textContent = endIndex;
    document.getElementById('total-count').textContent = totalItems;
}

function renderPaginationControls() {
    const pageNumbers = document.getElementById('page-numbers');
    pageNumbers.innerHTML = '';
    
    let startPage = Math.max(1, currentPage - 3);
    let endPage = Math.min(totalPages, startPage + 6);
    
    if (endPage - startPage < 6) {
        startPage = Math.max(1, endPage - 6);
    }
    
    if (startPage > 1) {
        const firstPage = document.createElement('button');
        firstPage.className = 'page-number';
        firstPage.textContent = '1';
        firstPage.onclick = () => goToPage(1);
        pageNumbers.appendChild(firstPage);
        
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'page-ellipsis';
            ellipsis.textContent = '...';
            pageNumbers.appendChild(ellipsis);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-number ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => goToPage(i);
        pageNumbers.appendChild(pageBtn);
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'page-ellipsis';
            ellipsis.textContent = '...';
            pageNumbers.appendChild(ellipsis);
        }
        
        const lastPage = document.createElement('button');
        lastPage.className = 'page-number';
        lastPage.textContent = totalPages;
        lastPage.onclick = () => goToPage(totalPages);
        pageNumbers.appendChild(lastPage);
    }
    
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages;
}

function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    
    currentPage = page;
    renderNewsList();
    updatePaginationInfo();
    renderPaginationControls();
}

// 渲染新闻列表
function renderNewsList() {
    const newsList = document.getElementById('news-list');
    newsList.innerHTML = '';
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredData.length);
    const currentPageData = filteredData.slice(startIndex, endIndex);
    
    if (currentPageData.length === 0) {
        newsList.innerHTML = '<div class="no-data">暂无数据</div>';
        return;
    }
    
    currentPageData.forEach((item, index) => {
        const newsItem = document.createElement('div');
        newsItem.className = 'news-item';
        newsItem.onclick = () => showNewsDetail(item);
        
        newsItem.innerHTML = `
            <h4>${item.主题 || '无主题'}</h4>
            <div class="news-meta">
                <strong>区域:</strong> ${item.生态区域 || '未知'} | 
                <strong>来源:</strong> ${item.污染来源 || '未知'}
            </div>
            <div class="news-meta">
                <strong>措施:</strong> ${(item.治理措施 || '').substring(0, 80)}${item.治理措施 && item.治理措施.length > 80 ? '...' : ''}
            </div>
            <div class="news-keywords">
                <strong>主体:</strong> ${item.实施主体 || '未知'}
            </div>
        `;
        
        newsList.appendChild(newsItem);
    });
}

// 简化的中文到英文国家名称转换
function convertToEnglishCountryName(chineseName) {
    const countryMap = {
        '中国': 'China',
        '美国': 'United States',
        '日本': 'Japan',
        '澳大利亚': 'Australia',
        '英国': 'United Kingdom',
        '加拿大': 'Canada',
        '德国': 'Germany',
        '法国': 'France',
        '巴西': 'Brazil',
        '印度': 'India',
        '俄罗斯': 'Russia',
        '韩国': 'South Korea',
        '意大利': 'Italy',
        '西班牙': 'Spain',
        '墨西哥': 'Mexico',
        '印尼': 'Indonesia',
        '荷兰': 'Netherlands',
        '沙特': 'Saudi Arabia',
        '土耳其': 'Turkey',
        '泰国': 'Thailand'
    };
    
    // 查找匹配的国家
    for (const [chinese, english] of Object.entries(countryMap)) {
        if (chineseName.includes(chinese)) {
            return english;
        }
    }
    
    return null; // 无法匹配时返回null
}

// 获取国家坐标
function getCountryCoordinates(region) {
    const countryCoordinates = {
        '中国': { lat: 35.8617, lng: 104.1954, country: '中国' },
        '美国': { lat: 37.0902, lng: -95.7129, country: '美国' },
        '日本': { lat: 36.2048, lng: 138.2529, country: '日本' },
        '澳大利亚': { lat: -25.2744, lng: 133.7751, country: '澳大利亚' },
        '英国': { lat: 55.3781, lng: -3.4360, country: '英国' },
        '加拿大': { lat: 56.1304, lng: -106.3468, country: '加拿大' },
        '德国': { lat: 51.1657, lng: 10.4515, country: '德国' },
        '法国': { lat: 46.2276, lng: 2.2137, country: '法国' },
        '巴西': { lat: -14.2350, lng: -51.9253, country: '巴西' },
        '印度': { lat: 20.5937, lng: 78.9629, country: '印度' },
        '俄罗斯': { lat: 61.5240, lng: 105.3188, country: '俄罗斯' },
        '韩国': { lat: 35.9078, lng: 127.7669, country: '韩国' },
        '意大利': { lat: 41.8719, lng: 12.5674, country: '意大利' },
        '西班牙': { lat: 40.4637, lng: -3.7492, country: '西班牙' },
        '墨西哥': { lat: 23.6345, lng: -102.5528, country: '墨西哥' },
        '印尼': { lat: -0.7893, lng: 113.9213, country: '印度尼西亚' },
        '荷兰': { lat: 52.1326, lng: 5.2913, country: '荷兰' },
        '沙特': { lat: 23.8859, lng: 45.0792, country: '沙特阿拉伯' },
        '土耳其': { lat: 38.9637, lng: 35.2433, country: '土耳其' },
        '泰国': { lat: 15.8700, lng: 100.9925, country: '泰国' }
    };
    
    // 查找匹配的国家
    for (const [country, coords] of Object.entries(countryCoordinates)) {
        if (region.includes(country)) {
            return coords;
        }
    }
    
    return null;
}

// 根据新闻数量获取颜色
function getColorByCount(count) {
    if (count >= 10) return '#d73027';
    if (count >= 5) return '#fc8d59';
    if (count >= 2) return '#fee08b';
    return '#d9ef8b';
}

// 添加新闻标记点到地图
function addNewsMarkers(map) {
    const countryStats = {};
    
    // 统计每个国家的新闻数量
    currentData.forEach(item => {
        const region = item.生态区域;
        if (region && region.trim()) {
            const countryCoords = getCountryCoordinates(region);
            if (countryCoords) {
                const key = `${countryCoords.lat},${countryCoords.lng}`;
                if (!countryStats[key]) {
                    countryStats[key] = {
                        count: 0,
                        coords: [countryCoords.lat, countryCoords.lng],
                        country: countryCoords.country,
                        news: []
                    };
                }
                countryStats[key].count += 1;
                countryStats[key].news.push(item);
            }
        }
    });
    
    // 为每个国家添加标记点
    Object.values(countryStats).forEach(stat => {
        const color = getColorByCount(stat.count);
        const radius = Math.max(8, Math.min(stat.count * 3, 30));
        
        // 创建圆形标记
        const circle = L.circleMarker(stat.coords, {
            color: color,
            fillColor: color,
            fillOpacity: 0.7,
            radius: radius
        }).addTo(map);
        
        // 添加弹出窗口
        circle.bindPopup(`
            <div style="max-width: 300px;">
                <h4>${stat.country}</h4>
                <p><strong>新闻数量:</strong> ${stat.count}条</p>
                <div style="max-height: 200px; overflow-y: auto;">
                    ${stat.news.slice(0, 5).map(news => `
                        <div style="border-bottom: 1px solid #eee; padding: 5px 0;">
                            <strong>${news.主题 || '无主题'}</strong><br>
                            <small>${(news.治理措施 || '').substring(0, 50)}...</small>
                        </div>
                    `).join('')}
                    ${stat.news.length > 5 ? `<p>... 还有 ${stat.news.length - 5} 条新闻</p>` : ''}
                </div>
            </div>
        `);
        
        // 鼠标悬停效果
        circle.on('mouseover', function() {
            this.setStyle({
                fillOpacity: 0.9,
                weight: 2
            });
        });
        
        circle.on('mouseout', function() {
            this.setStyle({
                fillOpacity: 0.7,
                weight: 1
            });
        });
    });
}

// Leaflet 地图初始化 - 增强版
function initLeafletMap() {
    try {
        // 检查 Leaflet 是否已加载
        if (typeof L === 'undefined') {
            throw new Error('Leaflet 库未加载');
        }
        
        // 初始化地图
        const map = L.map('leaflet-map').setView([20, 0], 2);
        
        // 添加 OpenStreetMap 底图
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18
        }).addTo(map);
        
        // 添加国家边界数据
        addCountryBoundaries(map);
        
        // 添加新闻标记点
        addNewsMarkers(map);
        
        // 绑定地图控制事件
        bindLeafletMapControls(map);
        
        // 存储地图实例
        charts.map = map;
        
        console.log('Leaflet 地图初始化成功');
        return map;
    } catch (error) {
        console.error('Leaflet 地图初始化失败:', error);
        document.getElementById('leaflet-map').innerHTML = 
            '<div style="text-align: center; padding: 50px; color: #666;">地图加载失败: ' + error.message + '</div>';
        return null;
    }
}

// 添加国家边界
function addCountryBoundaries(map) {
    // 使用在线的简化世界国家 GeoJSON 数据
    const worldCountriesUrl = 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json';
    
    fetch(worldCountriesUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('无法加载国家边界数据');
            }
            return response.json();
        })
        .then(geoData => {
            // 添加国家边界图层
            const countriesLayer = L.geoJSON(geoData, {
                style: {
                    color: '#666',
                    weight: 1,
                    fillColor: '#f8f9fa',
                    fillOpacity: 0.3
                },
                onEachFeature: function(feature, layer) {
                    // 为每个国家添加交互
                    if (feature.properties && feature.properties.name) {
                        layer.bindPopup(`<strong>${feature.properties.name}</strong>`);
                        
                        layer.on('mouseover', function() {
                            this.setStyle({
                                fillColor: '#3498db',
                                fillOpacity: 0.5
                            });
                        });
                        
                        layer.on('mouseout', function() {
                            this.setStyle({
                                fillColor: '#f8f9fa',
                                fillOpacity: 0.3
                            });
                        });
                    }
                }
            }).addTo(map);
            
            console.log('国家边界数据加载成功');
        })
        .catch(error => {
            console.warn('无法加载国家边界数据:', error);
            // 备用方案：显示简单的网格线
            addGridLines(map);
        });
}

// 备用方案：添加网格线
function addGridLines(map) {
    // 添加经纬度网格线
    for (let lat = -90; lat <= 90; lat += 30) {
        L.polyline([[lat, -180], [lat, 180]], {
            color: '#e0e0e0',
            weight: 1,
            opacity: 0.5
        }).addTo(map);
    }
    
    for (let lng = -180; lng <= 180; lng += 30) {
        L.polyline([[-90, lng], [90, lng]], {
            color: '#e0e0e0',
            weight: 1,
            opacity: 0.5
        }).addTo(map);
    }
}

// 绑定 Leaflet 地图控制事件
function bindLeafletMapControls(map) {
    document.getElementById('map-zoom-in').addEventListener('click', function() {
        map.zoomIn();
    });
    
    document.getElementById('map-zoom-out').addEventListener('click', function() {
        map.zoomOut();
    });
    
    document.getElementById('map-reset').addEventListener('click', function() {
        map.setView([20, 0], 2);
    });
}

// 修改图表初始化函数
function initCharts() {
    try {
        // 2D世界地图
        initLeafletMap();
        
        // 时间趋势图
        initTimeChart();
        
        // 词云图
        initWordCloudChart();
    } catch (error) {
        console.error('图表初始化错误:', error);
    }
}

// 时间趋势图
function initTimeChart() {
    const timeChart = echarts.init(document.getElementById('time-chart'));
    
    // 模拟时间数据
    const timeData = [
        { month: '1月', count: 45 },
        { month: '2月', count: 52 },
        { month: '3月', count: 48 },
        { month: '4月', count: 65 },
        { month: '5月', count: 58 },
        { month: '6月', count: 72 },
        { month: '7月', count: 68 },
        { month: '8月', count: 75 },
        { month: '9月', count: 62 },
        { month: '10月', count: 55 },
        { month: '11月', count: 48 },
        { month: '12月', count: 42 }
    ];
    
    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        xAxis: {
            type: 'category',
            data: timeData.map(item => item.month),
            axisLabel: {
                color: '#333'
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                color: '#333'
            }
        },
        series: [{
            data: timeData.map(item => item.count),
            type: 'line',
            smooth: true,
            lineStyle: {
                color: '#3498db',
                width: 3
            },
            itemStyle: {
                color: '#3498db'
            },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(52, 152, 219, 0.5)' },
                    { offset: 1, color: 'rgba(52, 152, 219, 0.1)' }
                ])
            }
        }]
    };
    
    timeChart.setOption(option);
    charts.time = timeChart;
}

// 词云图 - 使用真实数据
function initWordCloudChart() {
    const wordCloudChart = echarts.init(document.getElementById('wordcloud-chart'));
    
    try {
        console.log('开始初始化词云图...');
        
        // 从新闻数据提取关键词
        const wordData = extractKeywordsFromNews();
        
        console.log('词云数据详情:', {
            数据条数: wordData.length,
            前10条数据: wordData.slice(0, 10),
            数据格式示例: wordData[0]
        });
        
        // 检查数据是否有效
        if (!wordData || wordData.length === 0) {
            console.error('词云数据为空');
            throw new Error('词云数据为空');
        }
        
        // 检查数据格式
        const isValidData = wordData.every(item => 
            item && typeof item.name === 'string' && typeof item.value === 'number'
        );
        
        if (!isValidData) {
            console.error('词云数据格式不正确:', wordData);
            throw new Error('词云数据格式不正确');
        }
        
        const option = {
            tooltip: {
                show: true,
                formatter: function(params) {
                    return `${params.name}: ${params.value}次`;
                }
            },
            series: [{
                type: 'wordCloud',
                shape: 'circle',
                left: 'center',
                top: 'center',
                width: '90%',
                height: '90%',
                sizeRange: [12, 60],
                rotationRange: [-45, 45],
                rotationStep: 45,
                gridSize: 8,
                drawOutOfBound: false,
                textStyle: {
                    fontFamily: 'Microsoft YaHei',
                    fontWeight: 'bold',
                    color: function () {
                        const colors = [
                            '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9c80e', 
                            '#f7931e', '#6c5ce7', '#a29bfe', '#00b894',
                            '#e17055', '#0984e3', '#a29bfe', '#fd79a8'
                        ];
                        return colors[Math.floor(Math.random() * colors.length)];
                    }
                },
                emphasis: {
                    focus: 'self',
                    textStyle: {
                        shadowBlur: 10,
                        shadowColor: '#333'
                    }
                },
                data: wordData
            }]
        };
        
        console.log('词云配置选项:', option);
        
        wordCloudChart.setOption(option);
        charts.wordcloud = wordCloudChart;
        
        console.log('词云图初始化完成');
        
    } catch (error) {
        console.error('词云图初始化失败:', error);
        console.error('错误堆栈:', error.stack);
        
        // 显示详细的错误信息
        document.getElementById('wordcloud-chart').innerHTML = 
            `<div style="text-align: center; padding: 50px; color: #666;">
                <h4>词云加载失败</h4>
                <p>错误信息: ${error.message}</p>
                <p>请检查控制台获取详细信息</p>
            </div>`;
    }
}

// 从新闻数据提取关键词 - 修复版
function extractKeywordsFromNews() {
    const keywordCount = {};
    
    // 常见停用词
    const stopWords = ['的', '了', '在', '是', '有', '和', '与', '及', '或', '对', '将', '等', '中', '为', '于', '以', '就', '但', '很', '都', '而', '以及', '以及', '并且', '或者', '如果', '因为', '所以', '然后', '其他', '各种', '不同', '相关', '进行', '开展', '实施', '通过', '采取', '加强', '提高', '改善', '保护', '修复', '治理', '管理', '建设', '发展', '促进', '推动', '支持', '完善', '优化', '提升', '确保', '维护', '保障', '实现', '达到', '完成', '落实', '执行', '建立', '形成', '提供', '增加', '减少', '防止', '避免', '控制', '监测', '评估', '分析', '研究', '调查', '检查', '监督', '管理', '规划', '设计', '施工', '运营', '维护', '更新', '改造', '升级', '扩展', '扩大', '缩小', '调整', '改变', '转换', '转移', '集中', '分散', '统一', '协调', '合作', '协同', '共享', '交流', '沟通', '协商', '讨论', '决定', '批准', '授权', '委托', '负责', '承担', '参与', '加入', '退出', '开始', '结束', '继续', '停止', '暂停', '恢复', '重启'];
    
    currentData.forEach(item => {
        // 从多个字段提取关键词
        const fields = ['主题', '治理措施', '污染来源', '实施主体'];
        
        fields.forEach(field => {
            if (item[field] && typeof item[field] === 'string') {
                // 更智能的分词：按常见分隔符分割，并过滤停用词
                const text = item[field];
                
                // 多种分词方式
                const separators = /[,，、。\s;；:：!！?？（）()【】\[\]""''《》]/;
                const words = text.split(separators)
                    .filter(word => {
                        const cleanWord = word.trim();
                        return cleanWord.length > 1 && 
                               !stopWords.includes(cleanWord) &&
                               !/^\d+$/.test(cleanWord); // 排除纯数字
                    });
                
                words.forEach(word => {
                    const cleanWord = word.trim();
                    if (cleanWord) {
                        keywordCount[cleanWord] = (keywordCount[cleanWord] || 0) + 1;
                    }
                });
                
                // 额外处理：提取2-4字短语
                if (text.length >= 4) {
                    for (let i = 0; i <= text.length - 2; i++) {
                        for (let len = 2; len <= 4 && i + len <= text.length; len++) {
                            const phrase = text.substring(i, i + len);
                            if (phrase.length >= 2 && 
                                !separators.test(phrase) && 
                                !stopWords.includes(phrase)) {
                                keywordCount[phrase] = (keywordCount[phrase] || 0) + 0.5; // 权重较低
                            }
                        }
                    }
                }
            }
        });
    });
    
    console.log('提取的关键词:', keywordCount);
    
    // 转换为词云数据格式，取前40个关键词
    const wordData = Object.entries(keywordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 40)
        .map(([name, value]) => ({
            name,
            value: Math.max(Math.round(value), 5) // 确保最小值并取整
        }));
    
    console.log('词云数据:', wordData);
    
    // 如果数据不足，使用默认数据
    if (wordData.length === 0) {
        return [
            { name: '海洋保护', value: 100 },
            { name: '生态修复', value: 85 },
            { name: '污染治理', value: 78 },
            { name: '可持续发展', value: 72 },
            { name: '环境保护', value: 65 },
            { name: '生态平衡', value: 58 },
            { name: '海洋生态', value: 55 },
            { name: '绿色发展', value: 50 },
            { name: '生物多样性', value: 45 },
            { name: '清洁能源', value: 42 },
            { name: '碳排放', value: 40 },
            { name: '气候变化', value: 38 }
        ];
    }
    
    return wordData;
}

// 搜索功能
function searchNews() {
    const keyword = document.getElementById('keyword-search').value.toLowerCase();
    const region = document.getElementById('region-filter').value;
    const topic = document.getElementById('topic-filter').value;
    
    filteredData = currentData.filter(item => {
        const matchKeyword = !keyword || 
            (item.主题 && item.主题.toLowerCase().includes(keyword)) ||
            (item.治理措施 && item.治理措施.toLowerCase().includes(keyword)) ||
            (item.实施主体 && item.实施主体.toLowerCase().includes(keyword));
        
        const matchRegion = !region || item.生态区域 === region;
        const matchTopic = !topic || item.主题 === topic;
        
        return matchKeyword && matchRegion && matchTopic;
    });
    
    currentPage = 1;
    renderNewsList();
    updatePaginationInfo();
    renderPaginationControls();
    updateCharts();
}

function clearFilters() {
    document.getElementById('keyword-search').value = '';
    document.getElementById('region-filter').value = '';
    document.getElementById('topic-filter').value = '';
    filteredData = [...currentData];
    
    currentPage = 1;
    renderNewsList();
    updatePaginationInfo();
    renderPaginationControls();
    updateCharts();
}

// 更新图表
function updateCharts() {
    // 这里可以根据筛选后的数据更新图表
    // 暂时重新初始化所有图表
    Object.values(charts).forEach(chart => {
        // 只对 ECharts 实例调用 dispose
        if (chart && typeof chart.dispose === 'function') {
            chart.dispose();
        }
    });
    initCharts();
}

// 显示新闻详情
function showNewsDetail(item) {
    alert(`详细信息：
主题: ${item.主题}
区域: ${item.生态区域}
污染来源: ${item.污染来源}
治理措施: ${item.治理措施}
实施主体: ${item.实施主体}
效果数据: ${item.效果数据}`);
}

// 绑定事件 - 修复版
function bindEvents() {
    document.getElementById('keyword-search').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchNews();
        }
    });
    
    // 分页事件
    document.getElementById('prev-page').addEventListener('click', () => goToPage(currentPage - 1));
    document.getElementById('next-page').addEventListener('click', () => goToPage(currentPage + 1));
    
    // 页面大小改变事件
    document.getElementById('page-size').addEventListener('change', function(e) {
        pageSize = parseInt(e.target.value);
        currentPage = 1;
        renderNewsList();
        updatePaginationInfo();
        renderPaginationControls();
    });
    
    // 导航事件
    document.getElementById('btn-knowledge-graph').addEventListener('click', function() {
        window.location.href = 'knowledge-graph.html';
    });
    
    document.getElementById('btn-dashboard').addEventListener('click', function() {
        // 已经在仪表板页面
    });
    
    // 窗口大小改变时重绘图表 - 修复版
    window.addEventListener('resize', function() {
        Object.entries(charts).forEach(([key, chart]) => {
            // 只对 ECharts 实例调用 resize，Leaflet 地图会自动调整
            if (chart && typeof chart.resize === 'function') {
                try {
                    chart.resize();
                } catch (error) {
                    console.warn(`调整 ${key} 图表大小时出错:`, error);
                }
            }
        });
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);