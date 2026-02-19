/**
 * 数据加载模块
 * 负责按彩种加载历史开奖、AI预测和历史命中数据
 */

const GAME_FILES = {
    ssq: {
        history: './data/lottery_history.json',
        predictions: './data/ai_predictions.json',
        historyPredictions: './data/predictions_history.json'
    },
    fc3d: {
        history: './data/fc3d_history.json',
        predictions: './data/fc3d_ai_predictions.json',
        historyPredictions: './data/fc3d_predictions_history.json'
    }
};

const DataLoader = {
    normalizeGameType(gameType = 'ssq') {
        return GAME_FILES[gameType] ? gameType : 'ssq';
    },

    async fetchJson(filePath) {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, file: ${filePath}`);
        }
        return response.json();
    },

    async loadLotteryHistory(gameType = 'ssq') {
        const game = this.normalizeGameType(gameType);
        try {
            const data = await this.fetchJson(GAME_FILES[game].history);
            console.log(`[${game}] 历史开奖数据加载成功`, data);
            return data;
        } catch (error) {
            console.error(`[${game}] 加载历史开奖数据失败:`, error);
            throw error;
        }
    },

    async loadPredictions(gameType = 'ssq') {
        const game = this.normalizeGameType(gameType);
        try {
            const data = await this.fetchJson(GAME_FILES[game].predictions);
            console.log(`[${game}] AI 预测数据加载成功`, data);
            return data;
        } catch (error) {
            console.error(`[${game}] 加载 AI 预测数据失败:`, error);
            throw error;
        }
    },

    async loadPredictionsHistory(gameType = 'ssq') {
        const game = this.normalizeGameType(gameType);
        try {
            const data = await this.fetchJson(GAME_FILES[game].historyPredictions);
            console.log(`[${game}] 历史预测对比数据加载成功`, data);
            return data;
        } catch (error) {
            console.error(`[${game}] 加载历史预测对比数据失败:`, error);
            throw error;
        }
    },

    async loadAllData(gameType = 'ssq') {
        const game = this.normalizeGameType(gameType);
        try {
            const [lotteryHistory, aiPredictions, predictionsHistory] = await Promise.all([
                this.loadLotteryHistory(game),
                this.loadPredictions(game),
                this.loadPredictionsHistory(game)
            ]);

            return {
                lotteryHistory,
                aiPredictions,
                predictionsHistory
            };
        } catch (error) {
            console.error(`[${game}] 加载数据失败:`, error);
            throw error;
        }
    },

    async loadAllGamesData() {
        const gameTypes = Object.keys(GAME_FILES);
        const result = {};

        await Promise.all(gameTypes.map(async gameType => {
            result[gameType] = await this.loadAllData(gameType);
        }));

        return result;
    }
};

window.DataLoader = DataLoader;
