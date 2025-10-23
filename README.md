环境配置步骤
1. 安装必要的软件
Node.js 环境
# 下载安装 Node.js (LTS版本)
# https://nodejs.org/

csdn安装教程
https://blog.csdn.net/WHF__/article/details/129362462?ops_request_misc=%257B%2522request%255Fid%2522%253A%2522fb29a66944c21590d58768213454395b%2522%252C%2522scm%2522%253A%252220140713.130102334..%2522%257D&request_id=fb29a66944c21590d58768213454395b&biz_id=0&utm_medium=distribute.pc_search_result.none-task-blog-2~all~top_positive~default-1-129362462-null-null.142^v102^pc_search_result_base2&utm_term=nodejs%E5%AE%89%E8%A3%85%E5%8F%8A%E7%8E%AF%E5%A2%83%E9%85%8D%E7%BD%AE&spm=1018.2226.3001.4187
# 验证安装
node --version
npm --version

Neo4j 图数据库
# 方式1: Docker安装（推荐）
docker run --name neo4j -p 7474:7474 -p 7687:7687 -d -v neo4j_data:/data -v neo4j_logs:/logs -v neo4j_import:/var/lib/neo4j/import --env NEO4J_AUTH=neo4j/ocean123 neo4j:latest
解释参数：
--name neo4j：给容器起个名字（方便后续操作）；
-p 7474:7474：映射浏览器管理界面端口；
-p 7687:7687：映射代码连接的 Bolt 协议端口（核心，代码会用这个）；
-v：挂载数据、日志等目录到本地（防止容器删除后数据丢失）；
NEO4J_AUTH=neo4j/ocean123：设置默认账号（用户名 neo4j，密码 ocean123）

#初始化项目
# 在项目根目录执行
步骤1：npm初始化
cd backend
npm install
步骤2：启动Neo4j数据库
docker start neo4j
# 或直接运行之前docker run命令
步骤3：导入数据到Neo4j
cd backend
node import-data.js
步骤4：启动后端服务器
cd backend
npm start
步骤5：访问应用
主仪表板：http://localhost:3000
知识图谱：http://localhost:3000/knowledge-graph
