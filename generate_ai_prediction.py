# -*- coding: utf-8 -*-
"""
双色球 AI 预测自动生成脚本
自动调用 AI 模型生成下期预测数据
"""

import json
import os
from datetime import datetime
from openai import OpenAI
from typing import Dict, Any

# ==================== 配置区 ====================
# API 配置（请根据实际情况修改）
BASE_URL = "https://aihubmix.com/v1"
API_KEY = "REDACTED_API_KEY"

# 模型配置列表
MODELS = [
    {"id": "gpt-4o", "name": "GPT-5", "model_id": "SSB-Team-001"},
    {"id": "claude-3-5-sonnet-20241022", "name": "Claude 4.5", "model_id": "team_alpha_arena_v1"},
    {"id": "gemini-2.0-flash-exp", "name": "Gemini 2.5", "model_id": "Gemini2.5"},
    {"id": "deepseek-chat", "name": "DeepSeek R1", "model_id": "DeepseekR1"}
]

# 文件路径
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOTTERY_HISTORY_FILE = os.path.join(SCRIPT_DIR, "data", "lottery_history.json")
AI_PREDICTIONS_FILE = os.path.join(SCRIPT_DIR, "data", "ai_predictions.json")

# Prompt 模板
PROMPT_TEMPLATE = """你将扮演一个由多个自主AI分析师组成的团队，每个分析师都是一个独立的"策略模型"，你们的共同目标是根据历史数据，为下一期双色球彩票选择号码。

**核心身份**: 你是一个自主的彩票号码分析团队。你的决策完全基于提供的历史数据和各自的策略。

**任务目标**: 分析历史开奖数据，为 **{target_period}** 期（{target_date}）预测5组号码。

**历史开奖数据**:
{lottery_history}

**双色球规则**:
- 红球：从 01-33 中选择 6 个号码（按从小到大排序）
- 蓝球：从 01-16 中选择 1 个号码
- 开奖时间：每周二、四、日 21:15

**5个分析策略**:

1. **热号追随者**: 选择最近30期高频号码，但不能选择上一期刚开出的号码
2. **冷号逆向者**: 选择最近30期低频号码，红球奇偶比尽量接近3:3
3. **平衡策略师**: 构建多维平衡的组合
   - 奇偶比为 3:3 或 4:2
   - 大小比（1-16为小，17-33为大）为 3:3 或 2:4
   - 红球总和在 90-130 之间
   - 不包含超过2个连号
4. **周期理论家**: 选择短期频率（最近10期）上穿长期频率（最近30期）的号码，蓝球选遗漏期数最长的号码
5. **综合决策者**: 融合以上所有策略，权衡选择

**重要：你必须只返回 JSON 格式，不要有任何额外的文字说明或分析过程**

返回格式：
```json
{{
  "prediction_date": "{prediction_date}",
  "target_period": "{target_period}",
  "model_id": "{model_id}",
  "model_name": "{model_name}",
  "predictions": [
    {{
      "group_id": 1,
      "strategy": "热号追随者",
      "red_balls": ["XX", "XX", "XX", "XX", "XX", "XX"],
      "blue_ball": "XX",
      "description": "简短的策略描述"
    }},
    {{
      "group_id": 2,
      "strategy": "冷号逆向者",
      "red_balls": ["XX", "XX", "XX", "XX", "XX", "XX"],
      "blue_ball": "XX",
      "description": "简短的策略描述"
    }},
    {{
      "group_id": 3,
      "strategy": "平衡策略师",
      "red_balls": ["XX", "XX", "XX", "XX", "XX", "XX"],
      "blue_ball": "XX",
      "description": "简短的策略描述"
    }},
    {{
      "group_id": 4,
      "strategy": "周期理论家",
      "red_balls": ["XX", "XX", "XX", "XX", "XX", "XX"],
      "blue_ball": "XX",
      "description": "简短的策略描述"
    }},
    {{
      "group_id": 5,
      "strategy": "综合决策者",
      "red_balls": ["XX", "XX", "XX", "XX", "XX", "XX"],
      "blue_ball": "XX",
      "description": "简短的策略描述"
    }}
  ]
}}
```

**注意**:
- 只返回 JSON，不要有任何其他内容
- 所有号码必须是两位数字字符串格式（如 "01", "09", "16"）
- 红球必须按从小到大排序
- 如果返回的内容包含 ```json，请去掉这些标记，只保留纯 JSON
"""

# ==================== 工具函数 ====================

def load_lottery_history() -> Dict[str, Any]:
    """加载历史开奖数据"""
    try:
        with open(LOTTERY_HISTORY_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ 加载历史数据失败: {str(e)}")
        raise

def get_openai_client() -> OpenAI:
    """获取 OpenAI 客户端"""
    return OpenAI(api_key=API_KEY, base_url=BASE_URL)

def extract_json_from_response(response_text: str) -> str:
    """从 AI 响应中提取 JSON 内容"""
    # 去除可能的 markdown 标记
    text = response_text.strip()

    # 如果有 ```json 标记，提取中间的内容
    if "```json" in text:
        start = text.find("```json") + 7
        end = text.find("```", start)
        text = text[start:end].strip()
    elif "```" in text:
        start = text.find("```") + 3
        end = text.find("```", start)
        text = text[start:end].strip()

    return text

def call_ai_model(client: OpenAI, model_config: Dict[str, str], prompt: str) -> Dict[str, Any]:
    """调用 AI 模型获取预测"""
    try:
        print(f"  ⏳ 正在调用 {model_config['name']} 模型...")

        response = client.chat.completions.create(
            model=model_config['id'],
            messages=[
                {
                    "role": "system",
                    "content": "你是一个专业的彩票数据分析师，擅长基于历史数据进行模式分析和预测。请严格按照要求返回 JSON 格式数据，不要有任何额外的解释或说明。"
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.8
        )

        response_text = response.choices[0].message.content.strip()

        # 提取 JSON
        json_text = extract_json_from_response(response_text)

        # 解析 JSON
        prediction_data = json.loads(json_text)

        print(f"  ✅ {model_config['name']} 预测成功")
        return prediction_data

    except json.JSONDecodeError as e:
        print(f"  ❌ {model_config['name']} JSON 解析失败: {str(e)}")
        print(f"  原始响应: {response_text[:200]}...")
        raise
    except Exception as e:
        print(f"  ❌ {model_config['name']} API 调用失败: {str(e)}")
        raise

def validate_prediction(prediction: Dict[str, Any]) -> bool:
    """验证预测数据格式"""
    try:
        # 检查必需字段
        required_fields = ["prediction_date", "target_period", "model_id", "model_name", "predictions"]
        for field in required_fields:
            if field not in prediction:
                print(f"    ⚠️  缺少字段: {field}")
                return False

        # 检查预测组数量
        if len(prediction["predictions"]) != 5:
            print(f"    ⚠️  预测组数量不正确: {len(prediction['predictions'])}")
            return False

        # 检查每组预测
        for group in prediction["predictions"]:
            # 检查红球
            if len(group["red_balls"]) != 6:
                print(f"    ⚠️  红球数量不正确: {len(group['red_balls'])}")
                return False

            # 检查红球是否排序
            sorted_reds = sorted(group["red_balls"])
            if group["red_balls"] != sorted_reds:
                print(f"    ⚠️  红球未排序: {group['red_balls']}")
                return False

            # 检查蓝球
            if not group["blue_ball"]:
                print(f"    ⚠️  蓝球为空")
                return False

        return True

    except Exception as e:
        print(f"    ⚠️  验证出错: {str(e)}")
        return False

def generate_predictions() -> Dict[str, Any]:
    """生成所有模型的预测"""
    print("\n" + "="*50)
    print("🤖 双色球 AI 预测自动生成")
    print("="*50 + "\n")

    # 加载历史数据
    print("📊 加载历史开奖数据...")
    lottery_data = load_lottery_history()

    # 获取下期信息
    next_draw = lottery_data.get("next_draw", {})
    target_period = next_draw.get("next_period", "")
    target_date = next_draw.get("next_date_display", "")

    if not target_period:
        print("❌ 无法获取下期期号信息")
        return None

    print(f"🎯 目标期号: {target_period}")
    print(f"📅 开奖日期: {target_date}")
    print(f"📝 历史数据: 最近 {len(lottery_data.get('data', []))} 期\n")

    # 准备历史数据（最近30期）
    history_data = lottery_data.get("data", [])[:30]
    history_json = json.dumps(history_data, ensure_ascii=False, indent=2)

    # 当前日期
    prediction_date = datetime.now().strftime("%Y-%m-%d")

    # 初始化 OpenAI 客户端
    client = get_openai_client()

    # 存储所有模型的预测
    all_predictions = []

    # 逐个调用模型
    print("🔮 开始生成预测...\n")
    for model_config in MODELS:
        try:
            # 构建 prompt
            prompt = PROMPT_TEMPLATE.format(
                target_period=target_period,
                target_date=target_date,
                lottery_history=history_json,
                prediction_date=prediction_date,
                model_id=model_config['model_id'],
                model_name=model_config['name']
            )

            # 调用模型
            prediction = call_ai_model(client, model_config, prompt)

            # 验证数据
            if validate_prediction(prediction):
                all_predictions.append(prediction)
                print(f"  ✓ 验证通过\n")
            else:
                print(f"  ✗ 验证失败，跳过该模型\n")

        except Exception as e:
            print(f"  ✗ 处理失败，跳过该模型\n")
            continue

    # 构建最终输出
    if not all_predictions:
        print("❌ 没有成功生成任何预测")
        return None

    result = {
        "prediction_date": prediction_date,
        "target_period": target_period,
        "models": all_predictions
    }

    print(f"✅ 成功生成 {len(all_predictions)}/{len(MODELS)} 个模型的预测\n")
    return result

def save_predictions(predictions: Dict[str, Any]):
    """保存预测数据到文件"""
    try:
        print("💾 保存预测数据...")

        # 创建备份
        if os.path.exists(AI_PREDICTIONS_FILE):
            backup_file = AI_PREDICTIONS_FILE.replace(".json", f"_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
            with open(AI_PREDICTIONS_FILE, 'r', encoding='utf-8') as f:
                backup_data = json.load(f)
            with open(backup_file, 'w', encoding='utf-8') as f:
                json.dump(backup_data, f, ensure_ascii=False, indent=2)
            print(f"  ✓ 已创建备份: {os.path.basename(backup_file)}")

        # 保存新预测
        with open(AI_PREDICTIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump(predictions, f, ensure_ascii=False, indent=2)

        print(f"  ✓ 已保存到: {AI_PREDICTIONS_FILE}\n")

    except Exception as e:
        print(f"❌ 保存失败: {str(e)}")
        raise

def main():
    """主函数"""
    try:
        # 生成预测
        predictions = generate_predictions()

        if predictions:
            # 保存预测
            save_predictions(predictions)

            print("="*50)
            print("🎉 预测生成完成！")
            print("="*50 + "\n")

            # 显示预测摘要
            print("📋 预测摘要:")
            print(f"  期号: {predictions['target_period']}")
            print(f"  日期: {predictions['prediction_date']}")
            print(f"  模型数量: {len(predictions['models'])}")
            for model in predictions['models']:
                print(f"    - {model['model_name']}")
            print()
        else:
            print("❌ 预测生成失败")

    except Exception as e:
        print(f"\n❌ 程序执行出错: {str(e)}")
        raise

if __name__ == "__main__":
    main()
