/**
 * 主应用逻辑 - 双彩种版本
 * 支持双色球(ssq)与福彩3D(fc3d)
 */

const GAME_CONFIGS = {
    ssq: {
        key: 'ssq',
        title: '双色球AI预测',
        subtitle: 'Double Color Ball',
        documentTitle: '双色球 AI 预测',
        infoTitle: '本期 AI 策略说明',
        infoDescription: '本期预测汇集了 GPT-5、Claude 4.5 等四大前沿模型的增强型策略。所有模型均基于近 30 期历史数据进行加权分析，重点融合了热号追随、冷号逆向及周期理论，旨在捕捉号码的均值回归与趋势延续。',
        analysisSubtitle: '基于最近历史开奖数据分析',
        disclaimer: 'AI 预测结果仅供参考，不代表最终开奖结果',
        historyTrendDesc: '各模型当期最佳预测组合的总命中数（红+蓝）',
        historyTableTitle: '历史开奖号码一览',
        footerCopyright: '© 2026 Double Color Ball AI. Powered by Advanced LLMs.',
        drawTimeFallback: '21:15',
        statsLabels: ['数据样本', '最热红球', '最热蓝球', '平均和值'],
        chartTexts: {
            frequency: ['红球热度分布', '各号码出现频次统计'],
            secondary: ['蓝球出现频率', '蓝球号码分布情况'],
            oddEven: ['奇偶比例分布', '红球奇偶比统计'],
            sumTrend: ['红球和值走势', '近期红球总和变化趋势'],
            zone: ['区间分布统计', '红球按区间（01-11、12-22、23-33）分布情况']
        },
        prizeRules: {
            title: '双色球中奖规则说明',
            note: '红球从 01-33 中选择 6 个号码，蓝球从 01-16 中选择 1 个号码。每周二、四、日晚 21:15 开奖。',
            items: [
                { level: '一等奖', condition: '6+1', desc: '6个红球 + 1个蓝球' },
                { level: '二等奖', condition: '6+0', desc: '6个红球' },
                { level: '三等奖', condition: '5+1', desc: '5个红球 + 1个蓝球' },
                { level: '四等奖', condition: '5+0 / 4+1', desc: '5个红球 或 4红+1蓝' },
                { level: '五等奖', condition: '4+0 / 3+1', desc: '4个红球 或 3红+1蓝' },
                { level: '六等奖', condition: '2+1 / 1+1 / 0+1', desc: '有蓝球即中奖（5元）' }
            ]
        },
        accuracyMax: 7,
        accuracyYAxisTitle: '命中球数'
    },
    fc3d: {
        key: 'fc3d',
        title: '福彩3DAI预测',
        subtitle: 'Welfare Lottery 3D',
        documentTitle: '福彩3D AI 预测',
        infoTitle: '本期 AI 策略说明',
        infoDescription: '福彩3D采用 0-9 三位数字独立开奖。当前预测以定位（百十个）与组选（组三/组六）双视角建模，综合热温冷码、和值区间与跨度周期，生成多组可对照方案。',
        analysisSubtitle: '基于最近历史开奖数据分析',
        disclaimer: 'AI 预测仅用于数据研究与娱乐，请理性购彩',
        historyTrendDesc: '各模型当期最佳预测组合的定位命中位数（0-3）',
        historyTableTitle: '历史开奖数字一览',
        footerCopyright: '© 2026 Welfare Lottery 3D AI. Powered by Advanced LLMs.',
        drawTimeFallback: '21:15',
        statsLabels: ['数据样本', '最热号码', '最热百位', '平均和值'],
        chartTexts: {
            frequency: ['数字热度分布', '0-9 在百十个位的总体出现频次'],
            secondary: ['百位数字频率', '百位号码分布情况'],
            oddEven: ['奇偶型分布', '3位数字的奇偶比例统计'],
            sumTrend: ['和值走势', '近期开奖号码和值变化趋势'],
            zone: ['形态分布统计', '豹子 / 组三 / 组六 出现次数']
        },
        prizeRules: {
            title: '福彩3D玩法说明（核心）',
            note: '每期从 000-999 开出 1 组 3位数。常见玩法包括直选（按位全中）、组选3（两同一不同）、组选6（三位全不同）。',
            items: [
                { level: '直选', condition: '3位全中', desc: '百十个位与开奖号码完全一致' },
                { level: '组选3', condition: '两同一不同', desc: '例如 122，顺序不限' },
                { level: '组选6', condition: '三位全不同', desc: '例如 123，顺序不限' },
                { level: '和值', condition: '0-27', desc: '投注数字和命中和值范围' },
                { level: '跨度', condition: '0-9', desc: '最大位与最小位差值命中' },
                { level: '定位', condition: '百/十/个', desc: '单独命中某一位数字' }
            ]
        },
        accuracyMax: 3,
        accuracyYAxisTitle: '定位命中位数'
    }
};

const MODEL_COLORS = {
    'GPT-5': '#10b981',
    'Claude 4.5': '#8b5cf6',
    'Gemini 2.5': '#3b82f6',
    'DeepSeek R1': '#f59e0b'
};

let appState = {
    currentGame: 'ssq',
    dataByGame: {
        ssq: null,
        fc3d: null
    },
    chartInstances: {}
};

function getCurrentConfig() {
    return GAME_CONFIGS[appState.currentGame];
}

function getCurrentData() {
    return appState.dataByGame[appState.currentGame];
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

function pad2(num) {
    return String(num).padStart(2, '0');
}

function getFc3dDigits(drawOrPrediction) {
    if (Array.isArray(drawOrPrediction?.digits)) return drawOrPrediction.digits;
    if (typeof drawOrPrediction?.number === 'string') return drawOrPrediction.number.split('');
    return [];
}

function calcFc3dType(digits) {
    if (!digits || digits.length !== 3) return '-';
    const uniqueCount = new Set(digits).size;
    if (uniqueCount === 1) return '豹子';
    if (uniqueCount === 2) return '组三';
    return '组六';
}

function destroyChart(key) {
    if (appState.chartInstances[key]) {
        appState.chartInstances[key].destroy();
        appState.chartInstances[key] = null;
    }
}

function createOrReplaceChart(key, chartEl, chartConfig) {
    if (!chartEl) return;
    destroyChart(key);
    appState.chartInstances[key] = new Chart(chartEl, chartConfig);
}

async function initApp() {
    try {
        appState.dataByGame = await DataLoader.loadAllGamesData();

        applyDynamicText();
        renderCurrentGame();
        setupEventListeners();
        hideLoadingScreen();
    } catch (error) {
        console.error('初始化失败:', error);
        alert('数据加载失败，请刷新页面重试');
    }
}

function applyDynamicText() {
    const config = getCurrentConfig();

    document.title = config.documentTitle;
    setHTML('navbarTitle', `${config.title.replace('AI', '<span class="highlight">AI</span>')}`);
    setText('navbarSubtitle', config.subtitle);

    setText('infoCardTitle', config.infoTitle);
    setText('infoCardDesc', config.infoDescription);
    setText('analysisSubtitle', config.analysisSubtitle);
    setText('disclaimerText', config.disclaimer);
    setText('historyTrendDescription', config.historyTrendDesc);
    setText('historyTableTitle', config.historyTableTitle);
    setText('footerCopyright', config.footerCopyright);

    setText('statLabel1', config.statsLabels[0]);
    setText('statLabel2', config.statsLabels[1]);
    setText('statLabel3', config.statsLabels[2]);
    setText('statLabel4', config.statsLabels[3]);

    setText('chartFrequencyTitle', config.chartTexts.frequency[0]);
    setText('chartFrequencyDesc', config.chartTexts.frequency[1]);
    setText('chartSecondaryTitle', config.chartTexts.secondary[0]);
    setText('chartSecondaryDesc', config.chartTexts.secondary[1]);
    setText('chartOddEvenTitle', config.chartTexts.oddEven[0]);
    setText('chartOddEvenDesc', config.chartTexts.oddEven[1]);
    setText('chartSumTrendTitle', config.chartTexts.sumTrend[0]);
    setText('chartSumTrendDesc', config.chartTexts.sumTrend[1]);
    setText('chartZoneTitle', config.chartTexts.zone[0]);
    setText('chartZoneDesc', config.chartTexts.zone[1]);

    renderPrizeRules(config.prizeRules);
}

function renderPrizeRules(prizeRules) {
    setText('prizeRulesTitle', prizeRules.title);
    setText('prizeRulesNote', prizeRules.note);

    const grid = document.getElementById('prizeRulesGrid');
    if (!grid) return;

    grid.innerHTML = '';
    prizeRules.items.forEach(item => {
        const ruleItem = document.createElement('div');
        ruleItem.className = 'prize-rule-item';
        ruleItem.innerHTML = `
            <div class="prize-level">${item.level}</div>
            <div class="prize-condition">${item.condition}</div>
            <div class="prize-desc">${item.desc}</div>
        `;
        grid.appendChild(ruleItem);
    });
}

function renderCurrentGame() {
    applyDynamicText();
    renderHeroBanner();
    renderModelsGrid();
    renderHistoryTab();

    const activeTab = document.querySelector('.tab-content.active')?.dataset?.tab;
    if (activeTab === 'analysis') {
        renderAllAnalysisCharts();
    }
}

function renderHeroBanner() {
    const currentData = getCurrentData();
    if (!currentData?.lotteryHistory || !currentData?.aiPredictions) return;

    const nextDraw = currentData.lotteryHistory.next_draw || {};
    const config = getCurrentConfig();

    setText('heroPeriod', nextDraw.next_period || '-');
    setText('heroDateDisplay', nextDraw.next_date_display || '-');
    setText('heroDrawTime', `${nextDraw.draw_time || config.drawTimeFallback} 开奖`);
    setText('heroPredictionDate', currentData.aiPredictions.prediction_date || '-');

    const daysUntil = calculateDaysUntil(nextDraw.next_date);
    setText('heroCountdown', daysUntil > 0 ? `距离开奖仅剩 ${daysUntil} 天` : '即将开奖');
}

function createDrawnStatusBanner(actualResult) {
    const gameType = appState.currentGame;
    const banner = document.createElement('div');
    banner.className = 'drawn-status-banner';

    let ballsHtml = '';
    const numbers = Components.getDrawNumbers(actualResult, gameType);
    numbers.forEach(num => {
        ballsHtml += `<span class="mini-result-ball red">${num}</span>`;
    });

    const special = Components.getDrawSpecial(actualResult, gameType);
    if (special) {
        ballsHtml += `<span class="mini-result-ball blue">${special}</span>`;
    }

    if (gameType === 'fc3d') {
        const drawType = actualResult.type || calcFc3dType(numbers);
        ballsHtml += `<span class="mini-result-ball" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;">${drawType}</span>`;
    }

    banner.innerHTML = `
        <div class="drawn-status-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
        </div>
        <div class="drawn-status-content">
            <h3 class="drawn-status-title">第 ${actualResult.period} 期已开奖</h3>
            <p class="drawn-status-subtitle">以下为预测命中情况对比</p>
        </div>
        <div class="drawn-status-balls">
            ${ballsHtml}
        </div>
    `;

    return banner;
}

function renderModelsGrid() {
    const currentData = getCurrentData();
    if (!currentData?.aiPredictions) return;

    const modelsGridEl = document.getElementById('modelsGrid');
    if (!modelsGridEl) return;

    modelsGridEl.innerHTML = '';

    const targetPeriod = currentData.aiPredictions.target_period;
    const latestDraw = currentData.lotteryHistory?.data?.[0];
    let actualResult = null;

    if (latestDraw && parseInt(targetPeriod, 10) <= parseInt(latestDraw.period, 10)) {
        actualResult = currentData.lotteryHistory.data.find(draw => draw.period === targetPeriod);
        if (actualResult) {
            modelsGridEl.appendChild(createDrawnStatusBanner(actualResult));
        }
    }

    currentData.aiPredictions.models.forEach(model => {
        const card = Components.createModelCard(model, actualResult, appState.currentGame);
        modelsGridEl.appendChild(card);
    });
}

function getBestHitForModel(model, gameType) {
    return Math.max(...model.predictions.map(prediction => {
        const hit = Components.normalizeHitResult(prediction.hit_result || {}, gameType);
        return hit.totalHits;
    }));
}

function prepareChartData() {
    const currentData = getCurrentData();
    const history = currentData?.predictionsHistory?.predictions_history || [];
    const labels = [];
    const modelsData = {};

    [...history].reverse().forEach(record => {
        labels.push(record.target_period);
        record.models.forEach(model => {
            if (!modelsData[model.model_name]) {
                modelsData[model.model_name] = [];
            }
            modelsData[model.model_name].push(getBestHitForModel(model, appState.currentGame));
        });
    });

    const datasets = Object.keys(modelsData).map(modelName => ({
        label: modelName,
        data: modelsData[modelName],
        borderColor: MODEL_COLORS[modelName] || '#6b7280',
        backgroundColor: MODEL_COLORS[modelName] || '#6b7280',
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 7,
        tension: 0.1
    }));

    return { labels, datasets };
}

function renderAccuracyChart() {
    const currentData = getCurrentData();
    if (!currentData?.predictionsHistory) return;

    const chartEl = document.getElementById('accuracyChart');
    if (!chartEl) return;

    const chartData = prepareChartData();
    const config = getCurrentConfig();

    createOrReplaceChart('accuracyChart', chartEl, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: chartData.datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: config.accuracyMax,
                    ticks: { stepSize: 1 },
                    title: {
                        display: true,
                        text: config.accuracyYAxisTitle
                    }
                }
            }
        }
    });
}

function renderAccuracyCards() {
    const currentData = getCurrentData();
    if (!currentData?.predictionsHistory) return;

    const containerEl = document.getElementById('accuracyCardsContainer');
    if (!containerEl) return;

    containerEl.innerHTML = '';

    currentData.predictionsHistory.predictions_history.forEach(record => {
        containerEl.appendChild(Components.createAccuracyCard(record, appState.currentGame));
    });
}

function renderHistoryTable() {
    const currentData = getCurrentData();
    if (!currentData?.lotteryHistory) return;

    const tableBodyEl = document.getElementById('historyTableBody');
    if (!tableBodyEl) return;

    tableBodyEl.innerHTML = '';

    currentData.lotteryHistory.data.forEach(draw => {
        tableBodyEl.appendChild(Components.createHistoryTableRow(draw, appState.currentGame));
    });
}

function renderHistoryTab() {
    renderAccuracyChart();
    renderAccuracyCards();
    renderHistoryTable();
}

function renderStatisticsCards() {
    const currentData = getCurrentData();
    const draws = currentData?.lotteryHistory?.data || [];
    if (!draws.length) return;

    setText('statTotalDraws', `${draws.length} 期`);

    if (appState.currentGame === 'fc3d') {
        const digitFrequency = {};
        const hundredFrequency = {};
        let totalSum = 0;

        for (let i = 0; i <= 9; i++) {
            digitFrequency[String(i)] = 0;
            hundredFrequency[String(i)] = 0;
        }

        draws.forEach(draw => {
            const digits = getFc3dDigits(draw);
            if (digits.length !== 3) return;

            digits.forEach(d => {
                digitFrequency[d] = (digitFrequency[d] || 0) + 1;
            });

            hundredFrequency[digits[0]] = (hundredFrequency[digits[0]] || 0) + 1;
            totalSum += digits.reduce((sum, d) => sum + parseInt(d, 10), 0);
        });

        const hottestDigit = Object.entries(digitFrequency).sort((a, b) => b[1] - a[1])[0];
        const hottestHundred = Object.entries(hundredFrequency).sort((a, b) => b[1] - a[1])[0];
        const avgSum = Math.round(totalSum / draws.length);

        setText('statHottestRed', `${hottestDigit[0]} (${hottestDigit[1]}次)`);
        setText('statHottestBlue', `${hottestHundred[0]} (${hottestHundred[1]}次)`);
        setText('statAvgSum', String(avgSum));
        return;
    }

    const redFrequency = {};
    const blueFrequency = {};
    let totalSum = 0;

    for (let i = 1; i <= 33; i++) {
        redFrequency[pad2(i)] = 0;
    }
    for (let i = 1; i <= 16; i++) {
        blueFrequency[pad2(i)] = 0;
    }

    draws.forEach(draw => {
        (draw.red_balls || []).forEach(ball => {
            redFrequency[ball] = (redFrequency[ball] || 0) + 1;
        });
        blueFrequency[draw.blue_ball] = (blueFrequency[draw.blue_ball] || 0) + 1;
        totalSum += (draw.red_balls || []).reduce((acc, ball) => acc + parseInt(ball, 10), 0);
    });

    const hottestRed = Object.entries(redFrequency).sort((a, b) => b[1] - a[1])[0];
    const hottestBlue = Object.entries(blueFrequency).sort((a, b) => b[1] - a[1])[0];
    const avgSum = Math.round(totalSum / draws.length);

    setText('statHottestRed', `${hottestRed[0]} (${hottestRed[1]}次)`);
    setText('statHottestBlue', `${hottestBlue[0]} (${hottestBlue[1]}次)`);
    setText('statAvgSum', String(avgSum));
}

function renderFrequencyChart() {
    const currentData = getCurrentData();
    const draws = currentData?.lotteryHistory?.data || [];
    const chartEl = document.getElementById('frequencyChart');
    if (!draws.length || !chartEl) return;

    let labels = [];
    let data = [];
    let color = '#fca5a5';

    if (appState.currentGame === 'fc3d') {
        const frequency = {};
        for (let i = 0; i <= 9; i++) {
            frequency[String(i)] = 0;
        }

        draws.forEach(draw => {
            const digits = getFc3dDigits(draw);
            digits.forEach(d => {
                frequency[d] = (frequency[d] || 0) + 1;
            });
        });

        labels = Object.keys(frequency);
        data = labels.map(label => frequency[label]);
        color = '#fb7185';
    } else {
        const frequency = {};
        for (let i = 1; i <= 33; i++) {
            frequency[pad2(i)] = 0;
        }

        draws.forEach(draw => {
            (draw.red_balls || []).forEach(ball => {
                frequency[ball] = (frequency[ball] || 0) + 1;
            });
        });

        labels = Object.keys(frequency).sort();
        data = labels.map(label => frequency[label]);
    }

    createOrReplaceChart('frequencyChart', chartEl, {
        type: 'bar',
        data: {
            labels,
            datasets: [{ label: '出现次数', data, backgroundColor: color, borderRadius: 4 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}

function renderSecondaryFrequencyChart() {
    const currentData = getCurrentData();
    const draws = currentData?.lotteryHistory?.data || [];
    const chartEl = document.getElementById('blueFrequencyChart');
    if (!draws.length || !chartEl) return;

    let labels = [];
    let data = [];
    let color = '#93c5fd';

    if (appState.currentGame === 'fc3d') {
        const frequency = {};
        for (let i = 0; i <= 9; i++) {
            frequency[String(i)] = 0;
        }

        draws.forEach(draw => {
            const digits = getFc3dDigits(draw);
            if (digits[0] !== undefined) {
                frequency[digits[0]] = (frequency[digits[0]] || 0) + 1;
            }
        });

        labels = Object.keys(frequency);
        data = labels.map(label => frequency[label]);
        color = '#60a5fa';
    } else {
        const frequency = {};
        for (let i = 1; i <= 16; i++) {
            frequency[pad2(i)] = 0;
        }

        draws.forEach(draw => {
            frequency[draw.blue_ball] = (frequency[draw.blue_ball] || 0) + 1;
        });

        labels = Object.keys(frequency).sort();
        data = labels.map(label => frequency[label]);
    }

    createOrReplaceChart('blueFrequencyChart', chartEl, {
        type: 'bar',
        data: {
            labels,
            datasets: [{ label: '出现次数', data, backgroundColor: color, borderRadius: 4 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}

function renderOddEvenChart() {
    const currentData = getCurrentData();
    const draws = currentData?.lotteryHistory?.data || [];
    const chartEl = document.getElementById('oddEvenChart');
    if (!draws.length || !chartEl) return;

    const ratioCount = {};

    draws.forEach(draw => {
        let numbers = [];
        if (appState.currentGame === 'fc3d') {
            numbers = getFc3dDigits(draw);
        } else {
            numbers = draw.red_balls || [];
        }

        const oddCount = numbers.filter(ball => parseInt(ball, 10) % 2 === 1).length;
        const evenCount = numbers.length - oddCount;
        const ratio = `${oddCount}:${evenCount}`;
        ratioCount[ratio] = (ratioCount[ratio] || 0) + 1;
    });

    const commonRatios = appState.currentGame === 'fc3d'
        ? ['0:3', '1:2', '2:1', '3:0']
        : ['0:6', '1:5', '2:4', '3:3', '4:2', '5:1', '6:0'];

    const labels = commonRatios.filter(r => ratioCount[r]);
    const data = labels.map(label => ratioCount[label] || 0);

    createOrReplaceChart('oddEvenChart', chartEl, {
        type: 'doughnut',
        data: {
            labels: labels.map(l => `${l} (奇:偶)`),
            datasets: [{
                data,
                backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15, font: { size: 11 } }
                }
            }
        }
    });
}

function renderSumTrendChart() {
    const currentData = getCurrentData();
    const draws = currentData?.lotteryHistory?.data || [];
    const chartEl = document.getElementById('sumTrendChart');
    if (!draws.length || !chartEl) return;

    const recentDraws = draws.slice(0, 30).reverse();
    const labels = recentDraws.map(draw => draw.period);

    const sums = recentDraws.map(draw => {
        if (appState.currentGame === 'fc3d') {
            return getFc3dDigits(draw).reduce((acc, n) => acc + parseInt(n, 10), 0);
        }
        return (draw.red_balls || []).reduce((acc, n) => acc + parseInt(n, 10), 0);
    });

    const avgSum = sums.reduce((a, b) => a + b, 0) / sums.length;

    const yRange = appState.currentGame === 'fc3d'
        ? { beginAtZero: true, min: 0, max: 27 }
        : { beginAtZero: false, min: 60, max: 180 };

    createOrReplaceChart('sumTrendChart', chartEl, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: '和值',
                    data: sums,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: '平均值',
                    data: Array(sums.length).fill(avgSum),
                    borderColor: '#94a3b8',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    tension: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: { y: yRange }
        }
    });
}

function renderZoneDistributionChart() {
    const currentData = getCurrentData();
    const draws = currentData?.lotteryHistory?.data || [];
    const chartEl = document.getElementById('zoneDistributionChart');
    if (!draws.length || !chartEl) return;

    let labels = [];
    let data = [];
    let colors = [];
    let stepSize = 10;

    if (appState.currentGame === 'fc3d') {
        const typeCount = { '豹子': 0, '组三': 0, '组六': 0 };

        draws.forEach(draw => {
            const digits = getFc3dDigits(draw);
            const type = draw.type || calcFc3dType(digits);
            typeCount[type] = (typeCount[type] || 0) + 1;
        });

        labels = Object.keys(typeCount);
        data = Object.values(typeCount);
        colors = ['#fda4af', '#c4b5fd', '#93c5fd'];
        stepSize = 5;
    } else {
        const zones = { '01-11': 0, '12-22': 0, '23-33': 0 };

        draws.forEach(draw => {
            (draw.red_balls || []).forEach(ball => {
                const num = parseInt(ball, 10);
                if (num >= 1 && num <= 11) zones['01-11'] += 1;
                else if (num >= 12 && num <= 22) zones['12-22'] += 1;
                else if (num >= 23 && num <= 33) zones['23-33'] += 1;
            });
        });

        labels = Object.keys(zones);
        data = Object.values(zones);
        colors = ['#fca5a5', '#93c5fd', '#d8b4fe'];
    }

    createOrReplaceChart('zoneDistributionChart', chartEl, {
        type: 'bar',
        data: {
            labels,
            datasets: [{ label: '出现次数', data, backgroundColor: colors, borderRadius: 8 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize }
                }
            }
        }
    });
}

function renderAllAnalysisCharts() {
    renderStatisticsCards();
    renderFrequencyChart();
    renderSecondaryFrequencyChart();
    renderOddEvenChart();
    renderSumTrendChart();
    renderZoneDistributionChart();
}

function handleTabSwitch(tabName, navItems) {
    navItems.forEach(item => {
        if (item.dataset.tab === tabName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
        if (item.dataset.tab === tabName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        if (content.dataset.tab === tabName) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });

    if (tabName === 'analysis') {
        setTimeout(() => renderAllAnalysisCharts(), 100);
    }
}

function switchGame(gameType) {
    if (!GAME_CONFIGS[gameType] || appState.currentGame === gameType) return;

    appState.currentGame = gameType;

    document.querySelectorAll('.lottery-switch-btn').forEach(btn => {
        if (btn.dataset.game === gameType) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    renderCurrentGame();
}

function setupEventListeners() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => handleTabSwitch(item.dataset.tab, navItems));
    });

    const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
    mobileNavItems.forEach(item => {
        item.addEventListener('click', () => handleTabSwitch(item.dataset.tab, mobileNavItems));
    });

    const switchButtons = document.querySelectorAll('.lottery-switch-btn');
    switchButtons.forEach(btn => {
        btn.addEventListener('click', () => switchGame(btn.dataset.game));
    });
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    const mainApp = document.getElementById('mainApp');

    if (loadingScreen) loadingScreen.style.display = 'none';
    if (mainApp) mainApp.style.display = 'block';
}

function calculateDaysUntil(targetDateStr) {
    if (!targetDateStr) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(targetDateStr);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
