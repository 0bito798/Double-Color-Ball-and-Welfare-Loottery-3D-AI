/**
 * 主应用逻辑
 * 负责页面初始化、事件处理和数据展示协调
 */

class LotteryApp {
    constructor() {
        this.lotteryData = null;
        this.predictionData = null;
        this.selectedModel = null;
        this.currentTheme = 'light';

        // DOM 元素引用
        this.elements = {
            loadingScreen: document.getElementById('loadingScreen'),
            mainApp: document.getElementById('mainApp'),
            btnRefresh: document.getElementById('btnRefresh'),
            btnTheme: document.getElementById('btnTheme'),
            tabTriggers: document.querySelectorAll('.tab-trigger'),
            tabContents: document.querySelectorAll('.tab-content'),
            latestPeriod: document.getElementById('latestPeriod'),
            latestDate: document.getElementById('latestDate'),
            latestBalls: document.getElementById('latestBalls'),
            modelSelector: document.getElementById('modelSelector'),
            currentModelName: document.getElementById('currentModelName'),
            targetPeriod: document.getElementById('targetPeriod'),
            predictionsGrid: document.getElementById('predictionsGrid'),
            historyLastUpdate: document.getElementById('historyLastUpdate'),
            historyList: document.getElementById('historyList')
        };

        this.init();
    }

    /**
     * 初始化应用
     */
    async init() {
        console.log('初始化双色球数据展示应用...');

        // 绑定事件
        this.bindEvents();

        // 加载数据
        await this.loadAllData();

        // 隐藏加载屏幕，显示主应用
        this.hideLoading();
    }

    /**
     * 绑定事件处理器
     */
    bindEvents() {
        // 刷新按钮
        this.elements.btnRefresh.addEventListener('click', () => {
            this.showLoading();
            this.loadAllData();
        });

        // 主题切换按钮
        this.elements.btnTheme.addEventListener('click', () => this.toggleTheme());

        // Tab 切换
        this.elements.tabTriggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    /**
     * 切换主题
     */
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.body.className = `${this.currentTheme}-theme`;

        // 保存到本地存储
        localStorage.setItem('theme', this.currentTheme);
    }

    /**
     * 加载主题设置
     */
    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.currentTheme = savedTheme;
            document.body.className = `${this.currentTheme}-theme`;
        }
    }

    /**
     * 切换 Tab
     */
    switchTab(tabName) {
        // 更新 tab triggers
        this.elements.tabTriggers.forEach(trigger => {
            if (trigger.dataset.tab === tabName) {
                trigger.classList.add('active');
            } else {
                trigger.classList.remove('active');
            }
        });

        // 更新 tab contents
        this.elements.tabContents.forEach(content => {
            if (content.dataset.tab === tabName) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    }

    /**
     * 显示加载屏幕
     */
    showLoading() {
        this.elements.loadingScreen.style.display = 'flex';
        this.elements.mainApp.style.display = 'none';
    }

    /**
     * 隐藏加载屏幕
     */
    hideLoading() {
        this.elements.loadingScreen.style.display = 'none';
        this.elements.mainApp.style.display = 'block';
    }

    /**
     * 加载所有数据
     */
    async loadAllData() {
        try {
            const data = await DataLoader.loadAllData();

            this.lotteryData = data.lottery;
            this.predictionData = data.predictions;

            // 渲染最新开奖结果
            this.renderLatestResult();

            // 渲染模型选择器
            this.renderModelSelector();

            // 渲染历史记录
            this.renderHistory();

            console.log('数据加载完成');
        } catch (error) {
            console.error('加载数据失败:', error);
            alert('加载数据失败，请刷新页面重试');
        }
    }

    /**
     * 渲染最新开奖结果
     */
    renderLatestResult() {
        if (!this.lotteryData || !this.lotteryData.data || this.lotteryData.data.length === 0) {
            return;
        }

        const latest = this.lotteryData.data[0];

        this.elements.latestPeriod.textContent = `第 ${latest.period} 期`;
        this.elements.latestDate.textContent = latest.date;

        // 清空并渲染号码球
        this.elements.latestBalls.innerHTML = '';
        this.elements.latestBalls.appendChild(
            Components.createBallsContainer(latest.red_balls, latest.blue_ball)
        );
    }

    /**
     * 渲染模型选择器
     */
    renderModelSelector() {
        if (!this.predictionData || !this.predictionData.models || this.predictionData.models.length === 0) {
            this.elements.modelSelector.innerHTML = '<p>暂无预测数据</p>';
            return;
        }

        this.elements.modelSelector.innerHTML = '';

        this.predictionData.models.forEach((model, index) => {
            const btn = document.createElement('button');
            btn.className = 'model-btn';
            btn.textContent = model.model_name;

            // 默认选中第一个模型
            if (index === 0) {
                btn.classList.add('active');
                this.selectedModel = model.model_id;
            }

            btn.addEventListener('click', () => {
                this.selectModel(model.model_id);
            });

            this.elements.modelSelector.appendChild(btn);
        });

        // 渲染第一个模型的预测
        this.renderPredictions();
    }

    /**
     * 选择模型
     */
    selectModel(modelId) {
        this.selectedModel = modelId;

        // 更新按钮状态
        const buttons = this.elements.modelSelector.querySelectorAll('.model-btn');
        buttons.forEach(btn => {
            btn.classList.remove('active');
        });

        const selectedBtn = Array.from(buttons).find(btn => {
            const model = this.predictionData.models.find(m => m.model_name === btn.textContent);
            return model && model.model_id === modelId;
        });

        if (selectedBtn) {
            selectedBtn.classList.add('active');
        }

        // 重新渲染预测
        this.renderPredictions();
    }

    /**
     * 渲染预测
     */
    renderPredictions() {
        const model = this.predictionData.models.find(m => m.model_id === this.selectedModel);

        if (!model) {
            this.elements.predictionsGrid.innerHTML = '<p>未找到该模型的预测数据</p>';
            return;
        }

        // 更新标题和期号
        this.elements.currentModelName.textContent = `${model.model_name} 的预测`;
        this.elements.targetPeriod.textContent = `预测期号: ${this.predictionData.target_period}`;

        // 获取最新开奖结果用于对比
        const latestResult = this.lotteryData.data && this.lotteryData.data.length > 0
            ? this.lotteryData.data[0]
            : null;

        // 清空并渲染预测卡片
        this.elements.predictionsGrid.innerHTML = '';

        model.predictions.forEach(prediction => {
            const card = Components.createPredictionCard(prediction, latestResult);
            this.elements.predictionsGrid.appendChild(card);
        });
    }

    /**
     * 渲染历史记录
     */
    renderHistory() {
        if (!this.lotteryData || !this.lotteryData.data || this.lotteryData.data.length === 0) {
            this.elements.historyList.innerHTML = '<p>暂无历史数据</p>';
            return;
        }

        // 更新最后更新时间
        if (this.lotteryData.last_updated) {
            this.elements.historyLastUpdate.textContent =
                `最后更新: ${Components.formatDateTime(this.lotteryData.last_updated)}`;
        }

        // 清空并渲染历史记录
        this.elements.historyList.innerHTML = '';

        this.lotteryData.data.forEach(record => {
            const item = Components.createHistoryItem(record);
            this.elements.historyList.appendChild(item);
        });
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new LotteryApp();
});
