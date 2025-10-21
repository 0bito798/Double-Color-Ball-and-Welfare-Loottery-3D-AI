/**
 * UI 组件模块
 * 负责生成和渲染各种 UI 组件
 */

const Components = {
    /**
     * 创建号码球元素
     * @param {string} number - 号码
     * @param {string} type - 类型 ('red' 或 'blue')
     * @param {boolean} isHit - 是否命中
     * @returns {HTMLElement} 号码球元素
     */
    createBall(number, type, isHit = false) {
        const ball = document.createElement('div');
        ball.className = `ball ${type}${isHit ? ' hit' : ''}`;
        ball.textContent = number;
        return ball;
    },

    /**
     * 创建球分隔符
     * @returns {HTMLElement} 分隔符元素
     */
    createBallDivider() {
        const divider = document.createElement('div');
        divider.className = 'ball-divider';
        return divider;
    },

    /**
     * 创建号码球容器
     * @param {Array<string>} redBalls - 红球数组
     * @param {string} blueBall - 蓝球
     * @param {Object} hitInfo - 命中信息 (可选)
     * @returns {HTMLElement} 号码球容器
     */
    createBallsContainer(redBalls, blueBall, hitInfo = null) {
        const container = document.createElement('div');
        container.className = 'balls-container';

        // 添加红球
        redBalls.forEach(ball => {
            const isHit = hitInfo && hitInfo.redHits && hitInfo.redHits.includes(ball);
            container.appendChild(this.createBall(ball, 'red', isHit));
        });

        // 添加分隔符
        container.appendChild(this.createBallDivider());

        // 添加蓝球
        const blueHit = hitInfo && hitInfo.blueHit;
        container.appendChild(this.createBall(blueBall, 'blue', blueHit));

        return container;
    },

    /**
     * 比较预测号码与实际开奖结果
     * @param {Object} prediction - 预测数据
     * @param {Object} actualResult - 实际开奖结果
     * @returns {Object} 命中信息
     */
    compareNumbers(prediction, actualResult) {
        if (!actualResult) {
            return null;
        }

        const redHits = prediction.red_balls.filter(ball =>
            actualResult.red_balls.includes(ball)
        );

        const blueHit = prediction.blue_ball === actualResult.blue_ball;

        return {
            redHits: redHits,
            redHitCount: redHits.length,
            blueHit: blueHit,
            totalHits: redHits.length + (blueHit ? 1 : 0)
        };
    },

    /**
     * 创建预测卡片
     * @param {Object} prediction - 预测数据
     * @param {Object} latestResult - 最新开奖结果 (可选)
     * @returns {HTMLElement} 预测卡片元素
     */
    createPredictionCard(prediction, latestResult = null) {
        const card = document.createElement('div');
        card.className = 'prediction-card';

        // 卡片头部
        const header = document.createElement('div');
        header.className = 'prediction-header';

        const strategyName = document.createElement('span');
        strategyName.className = 'strategy-name';
        strategyName.textContent = prediction.strategy;

        const groupBadge = document.createElement('span');
        groupBadge.className = 'badge badge-secondary';
        groupBadge.textContent = `组 ${prediction.group_id}`;

        header.appendChild(strategyName);
        header.appendChild(groupBadge);
        card.appendChild(header);

        // 策略描述
        if (prediction.description) {
            const desc = document.createElement('div');
            desc.className = 'strategy-desc';
            desc.textContent = prediction.description;
            card.appendChild(desc);
        }

        // 号码展示
        const ballsDiv = document.createElement('div');
        ballsDiv.className = 'prediction-balls';

        // 计算命中情况
        const hitInfo = latestResult ? this.compareNumbers(prediction, latestResult) : null;

        ballsDiv.appendChild(
            this.createBallsContainer(prediction.red_balls, prediction.blue_ball, hitInfo)
        );

        card.appendChild(ballsDiv);

        // 显示命中信息
        if (hitInfo && hitInfo.totalHits > 0) {
            const hitInfoDiv = document.createElement('div');
            hitInfoDiv.className = 'hit-info';
            hitInfoDiv.innerHTML = `<span class="badge badge-hit">命中 ${hitInfo.totalHits} 个号码</span>`;
            card.appendChild(hitInfoDiv);
        }

        return card;
    },

    /**
     * 创建历史记录项
     * @param {Object} record - 历史记录数据
     * @returns {HTMLElement} 历史记录项元素
     */
    createHistoryItem(record) {
        const item = document.createElement('div');
        item.className = 'history-item';

        // 期号和日期信息
        const info = document.createElement('div');
        info.className = 'history-info';

        const period = document.createElement('div');
        period.className = 'history-period';
        period.textContent = `第 ${record.period} 期`;

        const date = document.createElement('div');
        date.className = 'history-date';
        date.textContent = record.date;

        info.appendChild(period);
        info.appendChild(date);

        // 号码展示
        const balls = document.createElement('div');
        balls.className = 'history-balls';
        balls.appendChild(this.createBallsContainer(record.red_balls, record.blue_ball));

        item.appendChild(info);
        item.appendChild(balls);

        return item;
    },

    /**
     * 格式化日期时间
     * @param {string} isoString - ISO 格式日期字符串
     * @returns {string} 格式化后的日期时间
     */
    formatDateTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
};

// 导出到全局作用域
window.Components = Components;
