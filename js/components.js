/**
 * UI 组件模块 - 双彩种版本
 * 支持双色球(ssq)与福彩3D(fc3d)
 */

const Components = {
    createLotteryBall(number, color, size = 'md', isHit = false) {
        const ball = document.createElement('div');
        ball.className = `lottery-ball ${color} size-${size}${isHit ? ' hit' : ''}`;
        ball.innerHTML = `<span>${number}</span>`;
        return ball;
    },

    createBallDivider() {
        const divider = document.createElement('div');
        divider.className = 'ball-divider';
        return divider;
    },

    getModelHeaderClass(modelName) {
        if (modelName.includes('GPT')) return 'model-header-gpt';
        if (modelName.includes('Claude')) return 'model-header-claude';
        if (modelName.includes('DeepSeek')) return 'model-header-deepseek';
        if (modelName.includes('Gemini')) return 'model-header-gemini';
        return 'model-header-gpt';
    },

    getPredictionNumbers(prediction, gameType = 'ssq') {
        if (gameType === 'fc3d') {
            if (Array.isArray(prediction.digits) && prediction.digits.length === 3) {
                return prediction.digits;
            }
            if (typeof prediction.number === 'string' && prediction.number.length === 3) {
                return prediction.number.split('');
            }
            return [];
        }
        return prediction.red_balls || [];
    },

    getPredictionSpecial(prediction, gameType = 'ssq') {
        if (gameType === 'fc3d') return null;
        return prediction.blue_ball || null;
    },

    getDrawNumbers(draw, gameType = 'ssq') {
        if (gameType === 'fc3d') {
            if (Array.isArray(draw.digits) && draw.digits.length === 3) {
                return draw.digits;
            }
            if (typeof draw.number === 'string' && draw.number.length === 3) {
                return draw.number.split('');
            }
            return [];
        }
        return draw.red_balls || [];
    },

    getDrawSpecial(draw, gameType = 'ssq') {
        if (gameType === 'fc3d') return null;
        return draw.blue_ball || null;
    },

    normalizeHitResult(rawHitResult = {}, gameType = 'ssq') {
        if (gameType === 'fc3d') {
            const positionHitCount =
                rawHitResult.position_hit_count ?? rawHitResult.positionHitCount ?? rawHitResult.red_hit_count ?? rawHitResult.redHitCount ?? 0;
            const groupHitCount = rawHitResult.group_hit_count ?? rawHitResult.groupHitCount ?? 0;
            const exactMatch = rawHitResult.exact_match ?? rawHitResult.exactMatch ?? positionHitCount === 3;
            const positionHitIndices = rawHitResult.position_hit_indices ?? rawHitResult.positionHitIndices ?? [];
            const winTypes = rawHitResult.win_types ?? rawHitResult.winTypes ?? [];
            const coreWinTypes = rawHitResult.core_win_types ?? rawHitResult.coreWinTypes ?? [];

            return {
                positionHitCount,
                groupHitCount,
                exactMatch,
                totalHits: rawHitResult.total_hits ?? rawHitResult.totalHits ?? positionHitCount,
                positionHitIndices,
                winTypes,
                coreWinTypes,
                redHitCount: positionHitCount,
                blueHit: !!exactMatch
            };
        }

        const redHitCount = rawHitResult.red_hit_count ?? rawHitResult.redHitCount ?? 0;
        const blueHit = !!(rawHitResult.blue_hit ?? rawHitResult.blueHit);

        return {
            redHitCount,
            blueHit,
            totalHits: rawHitResult.total_hits ?? rawHitResult.totalHits ?? redHitCount + (blueHit ? 1 : 0),
            redHits: rawHitResult.red_hits ?? rawHitResult.redHits ?? [],
            positionHitCount: 0,
            groupHitCount: 0,
            winTypes: [],
            coreWinTypes: [],
            exactMatch: false,
            positionHitIndices: []
        };
    },

    getFc3dForm(digits) {
        if (!digits || digits.length !== 3) return '未知';
        const uniqueCount = new Set(digits).size;
        if (uniqueCount === 1) return '豹子';
        if (uniqueCount === 2) return '组三';
        return '组六';
    },

    getFc3dPlayHitInfo(predictionDigits, actualDigits) {
        const pred = predictionDigits || [];
        const act = actualDigits || [];
        if (pred.length !== 3 || act.length !== 3) {
            return { winTypes: [], coreWinTypes: [] };
        }

        const predForm = this.getFc3dForm(pred);
        const actualForm = this.getFc3dForm(act);
        const predSorted = [...pred].sort().join('');
        const actualSorted = [...act].sort().join('');
        const sameSet = predSorted === actualSorted;
        const predSum = pred.reduce((acc, n) => acc + parseInt(n, 10), 0);
        const actualSum = act.reduce((acc, n) => acc + parseInt(n, 10), 0);
        const predSpan = Math.max(...pred.map(n => parseInt(n, 10))) - Math.min(...pred.map(n => parseInt(n, 10)));
        const actualSpan = Math.max(...act.map(n => parseInt(n, 10))) - Math.min(...act.map(n => parseInt(n, 10)));
        const positionHitCount = pred.filter((digit, idx) => digit === act[idx]).length;

        const winTypes = [];
        const coreWinTypes = [];

        if (positionHitCount === 3) {
            winTypes.push('直选');
            coreWinTypes.push('直选');
        }

        if (sameSet && predForm === '组三' && actualForm === '组三') {
            winTypes.push('组选3');
            coreWinTypes.push('组选3');
        }

        if (sameSet && predForm === '组六' && actualForm === '组六') {
            winTypes.push('组选6');
            coreWinTypes.push('组选6');
        }

        if (sameSet && predForm === '豹子' && actualForm === '豹子') {
            winTypes.push('豹子');
            coreWinTypes.push('豹子');
        }

        if (predSum === actualSum) {
            winTypes.push('和值');
        }

        if (predSpan === actualSpan) {
            winTypes.push('跨度');
        }

        if (positionHitCount > 0) {
            winTypes.push(`定位${positionHitCount}位`);
        }

        return { winTypes, coreWinTypes };
    },

    createModelCard(model, actualResult = null, gameType = 'ssq') {
        const card = document.createElement('div');
        card.className = 'model-card';

        const headerClass = this.getModelHeaderClass(model.model_name);
        const safeModelId = model.model_id.replace(/[^a-zA-Z0-9-_]/g, '-');

        let bestHitCount = 0;
        let bestGroupId = null;

        if (actualResult) {
            model.predictions.forEach(prediction => {
                const hitResult = this.compareNumbers(prediction, actualResult, gameType);
                if (hitResult && hitResult.totalHits > bestHitCount) {
                    bestHitCount = hitResult.totalHits;
                    bestGroupId = prediction.group_id;
                }
            });
        }

        const bestHitText = gameType === 'fc3d' ? `最佳 ${bestHitCount} 位` : `最佳 ${bestHitCount} 中`;

        card.innerHTML = `
            <div class="model-card-header ${headerClass}">
                <div class="model-card-header-left">
                    <div class="model-icon-box">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/>
                        </svg>
                    </div>
                    <div class="model-name-wrapper">
                        <h3>${model.model_name}</h3>
                        <div class="model-id">
                            <span>ID: ${model.model_id}</span>
                        </div>
                    </div>
                </div>
                <div class="model-card-header-right">
                    ${actualResult && bestHitCount > 0 ? `
                        <div class="model-best-hit-badge">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                            <span>${bestHitText}</span>
                        </div>
                    ` : ''}
                    <div class="model-card-ticket-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>
                        </svg>
                    </div>
                </div>
            </div>
            <div class="model-card-content">
                <div class="strategy-group" id="strategies-${safeModelId}"></div>
            </div>
        `;

        const strategiesContainer = card.querySelector(`#strategies-${safeModelId}`);
        model.predictions.forEach((prediction, index) => {
            const isBest = actualResult && prediction.group_id === bestGroupId;
            strategiesContainer.appendChild(
                this.createStrategyRow(prediction, index === model.predictions.length - 1, actualResult, isBest, gameType)
            );
        });

        return card;
    },

    createStrategyRow(prediction, isLast = false, actualResult = null, isBest = false, gameType = 'ssq') {
        const row = document.createElement('div');
        row.className = 'strategy-row';

        let hitResult = null;
        if (actualResult) {
            hitResult = this.compareNumbers(prediction, actualResult, gameType);
        }

        const header = document.createElement('div');
        header.className = 'strategy-header';

        const hitStatsHtml = hitResult
            ? (gameType === 'fc3d'
                ? `
                    <div class="strategy-hit-stats">
                        <span class="hit-stat red">${hitResult.positionHitCount}位</span>
                        <span class="hit-stat ${hitResult.groupHitCount >= 2 ? 'blue' : 'miss'}">组${hitResult.groupHitCount}</span>
                        <span class="hit-stat ${hitResult.coreWinTypes?.length ? 'blue' : 'miss'}">${hitResult.coreWinTypes?.length || 0}奖</span>
                    </div>
                `
                : `
                    <div class="strategy-hit-stats">
                        <span class="hit-stat red">${hitResult.redHitCount}红</span>
                        <span class="hit-stat ${hitResult.blueHit ? 'blue' : 'miss'}">${hitResult.blueHit ? '1' : '0'}蓝</span>
                    </div>
                `)
            : '';

        const playType = prediction.play_type || '';
        const playTypeBadgeClass = playType === '直选' ? 'play-type-zhixuan' : playType === '组三' ? 'play-type-zu3' : playType === '组六' ? 'play-type-zu6' : '';
        const playTypeBadgeHtml = (gameType === 'fc3d' && playType)
            ? `<span class="play-type-badge ${playTypeBadgeClass}">${playType}</span>`
            : '';

        header.innerHTML = `
            <div class="strategy-label-row">
                <div class="strategy-group-badge${isBest ? ' best' : ''}">${isBest ? '★ ' : ''}G-${prediction.group_id}</div>
                <span class="strategy-name">${prediction.strategy}</span>
                ${playTypeBadgeHtml}
                ${hitStatsHtml}
            </div>
        `;
        row.appendChild(header);


        const ballsContainer = document.createElement('div');
        ballsContainer.className = 'strategy-balls';

        const numbers = this.getPredictionNumbers(prediction, gameType);
        numbers.forEach((num, index) => {
            const isHit = gameType === 'fc3d'
                ? hitResult?.positionHitIndices?.includes(index)
                : hitResult?.redHits?.includes(num);
            ballsContainer.appendChild(this.createLotteryBall(num, 'red', 'md', !!isHit));
        });

        const special = this.getPredictionSpecial(prediction, gameType);
        if (special) {
            ballsContainer.appendChild(this.createBallDivider());
            const specialHit = !!hitResult?.blueHit;
            ballsContainer.appendChild(this.createLotteryBall(special, 'blue', 'md', specialHit));
        }

        row.appendChild(ballsContainer);

        const desc = document.createElement('p');
        desc.className = 'strategy-description';
        desc.textContent = prediction.description;
        row.appendChild(desc);

        if (!isLast) {
            const separator = document.createElement('div');
            separator.className = 'strategy-separator';
            row.appendChild(separator);
        }

        return row;
    },

    createAccuracyCard(record, gameType = 'ssq') {
        const card = document.createElement('div');
        card.className = 'accuracy-card';

        const result = record.actual_result;
        if (!result) return card;

        const header = document.createElement('div');
        header.className = 'accuracy-card-header';
        header.innerHTML = `
            <div class="accuracy-header-left">
                <div class="accuracy-trophy-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                    </svg>
                </div>
                <div>
                    <h4 class="accuracy-header-title">第 ${result.period} 期</h4>
                    <span class="accuracy-header-subtitle">命中回溯报告</span>
                </div>
            </div>
            <span class="accuracy-header-date">${result.date}</span>
        `;
        card.appendChild(header);

        const actualSection = document.createElement('div');
        actualSection.className = 'actual-result-section';
        actualSection.innerHTML = `
            <div class="actual-result-label">
                <div class="actual-result-bar"></div>
                <p class="actual-result-text">开奖号码 Official Draw</p>
            </div>
        `;

        const actualBalls = document.createElement('div');
        actualBalls.className = 'actual-result-balls';

        const numbers = this.getDrawNumbers(result, gameType);
        numbers.forEach(num => {
            actualBalls.appendChild(this.createLotteryBall(num, 'red', 'md'));
        });

        const special = this.getDrawSpecial(result, gameType);
        if (special) {
            actualBalls.appendChild(this.createBallDivider());
            actualBalls.appendChild(this.createLotteryBall(special, 'blue', 'md'));
        }

        actualSection.appendChild(actualBalls);

        if (gameType === 'fc3d') {
            const digits = this.getDrawNumbers(result, gameType);
            const sum = digits.reduce((acc, n) => acc + parseInt(n, 10), 0);
            const span = Math.max(...digits.map(n => parseInt(n, 10))) - Math.min(...digits.map(n => parseInt(n, 10)));
            const form = result.type || this.getFc3dForm(digits);

            const meta = document.createElement('div');
            meta.className = 'fc3d-actual-meta';
            meta.innerHTML = `
                <span class="fc3d-meta-chip">形态 ${form}</span>
                <span class="fc3d-meta-chip">和值 ${sum}</span>
                <span class="fc3d-meta-chip">跨度 ${span}</span>
            `;
            actualSection.appendChild(meta);
        }

        card.appendChild(actualSection);

        const hitsList = document.createElement('div');
        hitsList.className = 'model-hits-list';

        record.models.forEach((model, index) => {
            hitsList.appendChild(
                this.createModelHitItem(model, index + 1, index === record.models.length - 1, gameType, result)
            );
        });

        card.appendChild(hitsList);

        return card;
    },

    createModelHitItem(model, index, isLast = false, gameType = 'ssq', actualResult = null) {
        const item = document.createElement('div');
        item.className = 'model-hit-item';

        const bestHit = Math.max(...model.predictions.map(p => {
            const hit = (gameType === 'fc3d' && actualResult)
                ? this.compareNumbers(p, actualResult, gameType)
                : this.normalizeHitResult(p.hit_result || {}, gameType);
            return hit.totalHits;
        }));

        const safeModelId = model.model_id.replace(/[^a-zA-Z0-9-_]/g, '-');
        const showHighHit = gameType === 'fc3d' ? bestHit >= 2 : bestHit >= 4;
        const highHitText = gameType === 'fc3d' ? `高命中: ${bestHit}位` : `高命中: ${bestHit}`;

        item.innerHTML = `
            ${!isLast ? '<div class="model-hit-connector"></div>' : ''}
            <div class="model-hit-row">
                <div class="model-hit-number">${index}</div>
                <div class="model-hit-content">
                    <div class="model-hit-header">
                        <h4 class="model-hit-name">${model.model_name}</h4>
                        ${showHighHit ? `
                        <span class="high-hit-badge">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                            ${highHitText}
                        </span>` : ''}
                    </div>
                    <div class="prediction-groups" id="groups-${safeModelId}"></div>
                </div>
            </div>
        `;

        const groupsContainer = item.querySelector(`#groups-${safeModelId}`);
        model.predictions.forEach(prediction => {
            groupsContainer.appendChild(this.createPredictionGroupRow(prediction, gameType, actualResult));
        });

        return item;
    },

    createPredictionGroupRow(prediction, gameType = 'ssq', actualResult = null) {
        const row = document.createElement('div');
        const hitResult = (gameType === 'fc3d' && actualResult)
            ? this.compareNumbers(prediction, actualResult, gameType)
            : this.normalizeHitResult(prediction.hit_result || {}, gameType);
        const totalHits = hitResult.totalHits;
        const isWinning = gameType === 'fc3d' ? totalHits >= 2 : totalHits >= 3;

        row.className = `prediction-group-row${isWinning ? ' winning' : ''}${gameType === 'fc3d' ? ' fc3d-prediction-row' : ''}`;

        const ballsContainer = document.createElement('div');
        ballsContainer.className = 'prediction-group-balls';
        const pt = prediction.play_type || '';
        const ptClass = pt === '直选' ? 'play-type-zhixuan' : pt === '组三' ? 'play-type-zu3' : pt === '组六' ? 'play-type-zu6' : '';
        const ptHtml = (gameType === 'fc3d' && pt)
            ? `<span class="play-type-badge ${ptClass}" style="font-size:10px;padding:1px 5px;">${pt}</span>`
            : '';
        ballsContainer.innerHTML = `
            <span class="prediction-group-strategy">${prediction.strategy.substring(0, 6)}${prediction.strategy.length > 6 ? '..' : ''}</span>${ptHtml}
        `;

        const ballsList = document.createElement('div');
        ballsList.className = 'prediction-group-balls-list';

        const numbers = this.getPredictionNumbers(prediction, gameType);
        numbers.forEach((num, index) => {
            const isHit = gameType === 'fc3d'
                ? hitResult.positionHitIndices.includes(index)
                : (prediction.hit_result?.red_hits || []).includes(num);
            const miniBall = document.createElement('div');
            miniBall.className = `mini-ball${isHit ? ' hit' : ''}`;
            miniBall.textContent = num;
            ballsList.appendChild(miniBall);
        });

        const special = this.getPredictionSpecial(prediction, gameType);
        if (special) {
            const blueBall = document.createElement('div');
            blueBall.className = `mini-ball blue${hitResult.blueHit ? ' hit' : ''}`;
            blueBall.textContent = special;
            ballsList.appendChild(blueBall);
        }

        ballsContainer.appendChild(ballsList);
        row.appendChild(ballsContainer);

        const stats = document.createElement('div');
        stats.className = 'prediction-group-stats';

        if (gameType === 'fc3d') {
            stats.innerHTML = `
                <div class="stat-item">
                    <span class="stat-value ${hitResult.positionHitCount > 0 ? 'has-hit' : 'no-hit'}">${hitResult.positionHitCount}</span>
                    <span class="stat-label">位</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                    <span class="stat-value ${hitResult.groupHitCount >= 2 ? 'blue-hit' : 'no-hit'}">${hitResult.groupHitCount}</span>
                    <span class="stat-label">组</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                    <span class="stat-value ${hitResult.coreWinTypes?.length ? 'has-hit' : 'no-hit'}">${hitResult.coreWinTypes?.length || 0}</span>
                    <span class="stat-label">奖</span>
                </div>
            `;
        } else {
            const redHitCount = hitResult.redHitCount;
            const blueHit = hitResult.blueHit;
            stats.innerHTML = `
                <div class="stat-item">
                    <span class="stat-value ${redHitCount > 0 ? 'has-hit' : 'no-hit'}">${redHitCount}</span>
                    <span class="stat-label">红</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                    <span class="stat-value ${blueHit ? 'blue-hit' : 'no-hit'}">${blueHit ? 1 : 0}</span>
                    <span class="stat-label">蓝</span>
                </div>
            `;
        }

        row.appendChild(stats);

        if (gameType === 'fc3d' && hitResult.winTypes?.length) {
            const typesContainer = document.createElement('div');
            typesContainer.className = 'fc3d-win-types';

            hitResult.winTypes.forEach(typeName => {
                const chip = document.createElement('span');
                chip.className = `fc3d-win-chip${hitResult.coreWinTypes?.includes(typeName) ? ' hit-core' : ''}`;
                chip.textContent = typeName;
                typesContainer.appendChild(chip);
            });

            row.appendChild(typesContainer);
        }

        return row;
    },

    createHistoryTableRow(draw, gameType = 'ssq') {
        const row = document.createElement('tr');

        const periodCell = document.createElement('td');
        periodCell.className = 'period-cell';
        periodCell.textContent = draw.period;
        row.appendChild(periodCell);

        const dateCell = document.createElement('td');
        dateCell.className = 'date-cell';
        dateCell.textContent = draw.date;
        row.appendChild(dateCell);

        const ballsCell = document.createElement('td');
        const ballsContainer = document.createElement('div');
        ballsContainer.className = 'balls-cell';

        const numbers = this.getDrawNumbers(draw, gameType);
        numbers.forEach(num => {
            ballsContainer.appendChild(this.createLotteryBall(num, 'red', 'sm'));
        });

        const special = this.getDrawSpecial(draw, gameType);
        if (special) {
            const divider = document.createElement('div');
            divider.style.width = '8px';
            ballsContainer.appendChild(divider);
            ballsContainer.appendChild(this.createLotteryBall(special, 'blue', 'sm'));
        }

        if (gameType === 'fc3d' && draw.type) {
            const typeBadge = document.createElement('span');
            typeBadge.className = 'draw-type-badge';
            typeBadge.textContent = draw.type;
            ballsContainer.appendChild(typeBadge);
        }

        ballsCell.appendChild(ballsContainer);
        row.appendChild(ballsCell);

        return row;
    },

    compareNumbers(prediction, actualResult, gameType = 'ssq') {
        if (!actualResult) {
            return null;
        }

        if (gameType === 'fc3d') {
            const predictionDigits = this.getPredictionNumbers(prediction, 'fc3d');
            const actualDigits = this.getDrawNumbers(actualResult, 'fc3d');

            const positionHitIndices = [];
            predictionDigits.forEach((digit, idx) => {
                if (digit === actualDigits[idx]) {
                    positionHitIndices.push(idx);
                }
            });

            const freq = {};
            actualDigits.forEach(d => {
                freq[d] = (freq[d] || 0) + 1;
            });

            const groupHitDigits = [];
            predictionDigits.forEach(d => {
                if (freq[d] > 0) {
                    groupHitDigits.push(d);
                    freq[d] -= 1;
                }
            });

            const positionHitCount = positionHitIndices.length;
            const groupHitCount = groupHitDigits.length;
            const exactMatch = positionHitCount === 3;
            const playHitInfo = this.getFc3dPlayHitInfo(predictionDigits, actualDigits);

            return {
                positionHitIndices,
                positionHitCount,
                groupHitDigits,
                groupHitCount,
                exactMatch,
                totalHits: positionHitCount,
                winTypes: playHitInfo.winTypes,
                coreWinTypes: playHitInfo.coreWinTypes,
                redHits: positionHitIndices.map(i => predictionDigits[i]),
                redHitCount: positionHitCount,
                blueHit: exactMatch
            };
        }

        const predictionReds = this.getPredictionNumbers(prediction, 'ssq');
        const actualReds = this.getDrawNumbers(actualResult, 'ssq');
        const predictionBlue = this.getPredictionSpecial(prediction, 'ssq');
        const actualBlue = this.getDrawSpecial(actualResult, 'ssq');

        const redHits = predictionReds.filter(ball => actualReds.includes(ball));
        const blueHit = predictionBlue === actualBlue;

        return {
            redHits,
            redHitCount: redHits.length,
            blueHit,
            totalHits: redHits.length + (blueHit ? 1 : 0),
            positionHitCount: 0,
            groupHitCount: 0,
            exactMatch: false,
            positionHitIndices: []
        };
    }
};

window.Components = Components;
