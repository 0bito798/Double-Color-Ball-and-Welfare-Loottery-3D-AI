# -*- coding: utf-8 -*-
"""
福彩3D AI 预测自动生成脚本
自动调用 AI 模型生成下期预测数据（每天运行）
"""

import json
import os
import sys
from datetime import datetime, timedelta
from openai import OpenAI
from typing import Dict, Any

# ==================== 配置区 ====================
# 每个模型独立的 API Key 和 Base URL（通过环境变量设置）
# 环境变量名称：
#   GPT:       OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL_ID       (默认: gpt-4o)
#   Claude:    ANTHROPIC_API_KEY, ANTHROPIC_BASE_URL, ANTHROPIC_MODEL_ID (默认: claude-3-5-sonnet-20241022)
#   Gemini:    GEMINI_API_KEY, GEMINI_BASE_URL, GEMINI_MODEL_ID       (默认: gemini-2.5-flash)
#   DeepSeek:  DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL_ID  (默认: deepseek-chat)
MODELS = [
    {
        "id": os.environ.get("OPENAI_MODEL_ID") or "gpt-4o",
        "name": "GPT-5",
        "model_id": "SSB-Team-001",
        "api_key": os.environ.get("OPENAI_API_KEY"),
        "base_url": os.environ.get("OPENAI_BASE_URL") or "https://api.openai.com/v1",
    },
    {
        "id": os.environ.get("ANTHROPIC_MODEL_ID") or "claude-3-5-sonnet-20241022",
        "name": "Claude 4.5",
        "model_id": "team_alpha_arena_v1",
        "api_key": os.environ.get("ANTHROPIC_API_KEY"),
        "base_url": os.environ.get("ANTHROPIC_BASE_URL") or "https://api.anthropic.com/v1",
    },
    {
        "id": os.environ.get("GEMINI_MODEL_ID") or "gemini-2.5-flash",
        "name": "Gemini 2.5",
        "model_id": "Gemini2.5",
        "api_key": os.environ.get("GEMINI_API_KEY"),
        "base_url": os.environ.get("GEMINI_BASE_URL") or "https://generativelanguage.googleapis.com/v1beta/openai",
    },
    {
        "id": os.environ.get("DEEPSEEK_MODEL_ID") or "deepseek-chat",
        "name": "DeepSeek R1",
        "model_id": "DeepseekR1",
        "api_key": os.environ.get("DEEPSEEK_API_KEY"),
        "base_url": os.environ.get("DEEPSEEK_BASE_URL") or "https://api.deepseek.com/v1",
    },
]

# 文件路径
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FC3D_HISTORY_FILE = os.path.join(SCRIPT_DIR, "data", "fc3d_history.json")
FC3D_PREDICTIONS_FILE = os.path.join(SCRIPT_DIR, "data", "fc3d_ai_predictions.json")
FC3D_PREDICTIONS_HISTORY_FILE = os.path.join(SCRIPT_DIR, "data", "fc3d_predictions_history.json")
PROMPT_FILE = os.path.join(SCRIPT_DIR, "doc", "fc3d_prompt.md")

# ==================== 工具函数 ====================

def load_prompt_template() -> str:
    """加载 Prompt 模板文件"""
    try:
        with open(PROMPT_FILE, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"❌ 加载 Prompt 文件失败: {str(e)}")
        raise

def load_lottery_history() -> Dict[str, Any]:
    """加载历史开奖数据"""
    try:
        with open(FC3D_HISTORY_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ 加载历史数据失败: {str(e)}")
        raise

def get_next_draw_date_fc3d() -> str:
    """
    福彩3D 每天开奖（晚上21:15）
    如果当前时间 < 21:15，预测今天
    如果当前时间 >= 21:15，预测明天
    """
    today = datetime.now()
    draw_time = today.replace(hour=21, minute=15, second=0, microsecond=0)

    if today < draw_time:
        return today.strftime("%Y-%m-%d")
    else:
        return (today + timedelta(days=1)).strftime("%Y-%m-%d")

def extract_json_from_response(response_text: str) -> str:
    """从 AI 响应中提取 JSON 内容"""
    text = response_text.strip()
    if "```json" in text:
        start = text.find("```json") + 7
        end = text.find("```", start)
        text = text[start:end].strip()
    elif "```" in text:
        start = text.find("```") + 3
        end = text.find("```", start)
        text = text[start:end].strip()
    return text

def call_ai_model(model_config: Dict[str, Any], prompt: str) -> Dict[str, Any]:
    """调用 AI 模型获取预测（使用该模型自己的 api_key 和 base_url）"""
    api_key = model_config.get('api_key')
    base_url = model_config.get('base_url')
    if not api_key:
        raise ValueError(f"模型 {model_config['name']} 未配置 API Key")

    client = OpenAI(api_key=api_key, base_url=base_url)
    try:
        print(f"  ⏳ 正在调用 {model_config['name']} 模型...")

        response = client.chat.completions.create(
            model=model_config['id'],
            messages=[
                {
                    "role": "system",
                    "content": "你是一个专业的福彩3D彩票数据分析师。请严格按照要求返回 JSON 格式数据，不要有任何额外的解释或说明。"
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7
        )

        response_text = response.choices[0].message.content.strip()
        json_text = extract_json_from_response(response_text)
        prediction_data = json.loads(json_text)

        print(f"  ✅ {model_config['name']} 预测成功")
        return prediction_data

    except json.JSONDecodeError as e:
        print(f"  ❌ {model_config['name']} JSON 解析失败: {str(e)}")
        print(f"  原始响应:\n{response_text[:200]}...")
        raise
    except Exception as e:
        print(f"  ❌ {model_config['name']} 调用失败: {str(e)}")
        raise

VALID_PLAY_TYPES = {"直选", "组三", "组六"}

def validate_prediction(prediction: Dict[str, Any]) -> bool:
    """验证 FC3D 预测数据格式（包含 play_type 校验）"""
    try:
        required_fields = ["prediction_date", "target_period", "model_id", "model_name", "predictions"]
        for field in required_fields:
            if field not in prediction:
                print(f"    ⚠️  缺少字段: {field}")
                return False

        if len(prediction["predictions"]) != 5:
            print(f"    ⚠️  预测组数量不正确: {len(prediction['predictions'])}")
            return False

        for group in prediction["predictions"]:
            # 检查 digits
            if len(group["digits"]) != 3:
                print(f"    ⚠️  digits 数量不正确: {len(group['digits'])}")
                return False

            # 检查是否为数字字符
            if not all(d.isdigit() and 0 <= int(d) <= 9 for d in group["digits"]):
                print(f"    ⚠️  digits 包含非法字符: {group['digits']}")
                return False

            # 检查 number 是否一致
            if group["number"] != "".join(group["digits"]):
                print(f"    ⚠️  number 与 digits 不一致: {group['number']} vs {group['digits']}")
                return False

            # 检查并修正 play_type
            play_type = group.get("play_type", "")
            if play_type not in VALID_PLAY_TYPES:
                # 宽松处理：根据 digits 自动推断
                unique_count = len(set(group["digits"]))
                if unique_count == 1:
                    group["play_type"] = "豹子"
                elif unique_count == 2:
                    group["play_type"] = "组三"
                else:
                    group["play_type"] = "组六"
                print(f"    ℹ️  play_type 缺失或非法，已自动推断为: {group['play_type']}")

            # 检查 play_type 与 digits 形态是否一致（组三/组六）
            actual_unique = len(set(group["digits"]))
            pt = group.get("play_type", "")
            if pt == "组三" and actual_unique != 2:
                print(f"    ⚠️  G-{group.get('group_id')}: play_type=组三 但 digits={group['digits']} 不是两位相同")
                # 自动修正 play_type 而不拒绝整条预测
                group["play_type"] = "组六" if actual_unique == 3 else "豹子"
            elif pt == "组六" and actual_unique != 3:
                print(f"    ⚠️  G-{group.get('group_id')}: play_type=组六 但 digits={group['digits']} 不是三位各不同")
                group["play_type"] = "组三" if actual_unique == 2 else "豹子"

        return True

    except Exception as e:
        print(f"    ⚠️  验证出错: {str(e)}")
        return False

def generate_predictions() -> Dict[str, Any]:
    """生成所有模型的预测"""
    print("\n" + "="*50)
    print("🎲 福彩3D AI 预测自动生成")
    print("="*50 + "\n")

    # 加载 Prompt 模板
    try:
        prompt_template = load_prompt_template()
        print(f"📄 Prompt 模板已加载")
    except Exception:
        return None

    # 加载历史数据
    lottery_data = load_lottery_history()
    
    # 归档旧预测
    archive_old_prediction(lottery_data)

    # 获取下期信息
    next_draw = lottery_data.get("next_draw", {})
    target_period = next_draw.get("next_period", "")
    target_date = next_draw.get("next_date_display", "")

    if not target_period:
        # 如果历史数据中没有 next_draw，尝试自行推算
        latest_data = lottery_data.get("data", [])[0]
        latest_period = int(latest_data["period"])
        target_period = str(latest_period + 1)
        target_date = "下期"

    print(f"🎯 目标期号: {target_period}")
    print(f"📅 开奖日期: {target_date}")
    
    # 准备历史数据（最近30期）
    history_data = lottery_data.get("data", [])[:30]
    history_json = json.dumps(history_data, ensure_ascii=False, indent=2)

    prediction_date = get_next_draw_date_fc3d()
    print(f"📅 预测日期: {prediction_date}\n")

    print("🔮 开始生成预测...\n")
    all_predictions = []
    for model_config in MODELS:
        if not model_config.get('api_key'):
            print(f"  ⚠️  {model_config['name']} 未配置 API Key，跳过\n")
            continue
        try:
            prompt = prompt_template.format(
                target_period=target_period,
                target_date=target_date,
                lottery_history=history_json,
                prediction_date=prediction_date,
                model_id=model_config['model_id'],
                model_name=model_config['name']
            )

            prediction = call_ai_model(model_config, prompt)

            if validate_prediction(prediction):
                all_predictions.append(prediction)
                print(f"  ✓ 验证通过\n")
            else:
                print(f"  ✗ 验证失败，跳过该模型\n")

        except Exception as e:
            print(f"  ✗ 处理 {model_config['name']} 失败\n")
            continue

    if not all_predictions:
        print("❌ 没有成功生成任何预测")
        return None

    result = {
        "prediction_date": prediction_date,
        "target_period": target_period,
        "models": all_predictions
    }
    
    return result

def calculate_hit_result(prediction_group: Dict[str, Any], actual_result: Dict[str, Any]) -> Dict[str, Any]:
    """计算 FC3D 命中结果（根据 play_type 只显示对应的中奖类型）"""
    pred_digits = prediction_group["digits"]
    actual_digits = actual_result["digits"]
    play_type = prediction_group.get("play_type", "")
    
    # 1. 定位命中（百/十/个 完全一致）
    position_hit_indices = []
    for i in range(3):
        if pred_digits[i] == actual_digits[i]:
            position_hit_indices.append(i)
    
    # 2. 组选命中（不分顺序）
    pred_sorted = sorted(pred_digits)
    actual_sorted = sorted(actual_digits)
    is_group_hit = (pred_sorted == actual_sorted)
    
    # 统计有多少个数字命中（不考虑位置）
    from collections import Counter
    pred_count = Counter(pred_digits)
    actual_count = Counter(actual_digits)
    group_hit_count = sum((pred_count & actual_count).values())

    # 开奖号码形态
    actual_unique = len(set(actual_digits))
    
    # 根据 play_type 只判断对应的中奖类型
    win_types = []
    
    if play_type == "直选":
        if len(position_hit_indices) == 3:
            win_types.append("直选")
    elif play_type == "组三":
        if is_group_hit and actual_unique == 2:
            win_types.append("组选3")
    elif play_type == "组六":
        if is_group_hit and actual_unique == 3:
            win_types.append("组选6")
    else:
        # 没有 play_type 时显示所有可能（向后兼容）
        if len(position_hit_indices) == 3:
            win_types.append("直选")
        if is_group_hit:
            if actual_unique == 2:
                win_types.append("组选3")
            elif actual_unique == 3:
                win_types.append("组选6")
            elif actual_unique == 1:
                win_types.append("豹子")

    return {
        "position_hit_indices": position_hit_indices,
        "position_hit_count": len(position_hit_indices),
        "group_hit_count": group_hit_count,
        "exact_match": len(position_hit_indices) == 3,
        "total_hits": group_hit_count,
        "win_types": win_types,
        "core_win_types": win_types
    }

def archive_old_prediction(lottery_data: Dict[str, Any]):
    """归档旧预测"""
    try:
        if not os.path.exists(FC3D_PREDICTIONS_FILE):
            return

        with open(FC3D_PREDICTIONS_FILE, 'r', encoding='utf-8') as f:
            old_predictions = json.load(f)

        old_target_period = old_predictions.get("target_period")
        
        # 查找实际开奖结果
        actual_result = None
        for draw in lottery_data.get("data", []):
            if draw.get("period") == old_target_period:
                actual_result = draw
                break
        
        if not actual_result:
            print(f"  ℹ️  期号 {old_target_period} 尚未开奖或数据未更新，跳过归档\n")
            return

        print(f"  📦 旧预测期号 {old_target_period} 已开奖，开始归档...")

        # 读取历史文件
        history_data = {"predictions_history": []}
        if os.path.exists(FC3D_PREDICTIONS_HISTORY_FILE):
            with open(FC3D_PREDICTIONS_HISTORY_FILE, 'r', encoding='utf-8') as f:
                history_data = json.load(f)

        # 检查重复
        if any(r["target_period"] == old_target_period for r in history_data["predictions_history"]):
            print(f"  ℹ️  期号 {old_target_period} 已存档\n")
            return

        # 计算命中
        models_with_hits = []
        for model_data in old_predictions.get("models", []):
            predictions_with_hits = []
            for pred_group in model_data.get("predictions", []):
                pred_with_hit = pred_group.copy()
                pred_with_hit["hit_result"] = calculate_hit_result(pred_group, actual_result)
                predictions_with_hits.append(pred_with_hit)

            # 最佳组：优先直选，其次核心奖项最多，最后看定位数
            def sort_key(p):
                hit = p["hit_result"]
                score = 0
                if "直选" in hit["core_win_types"]: score += 1000
                if "豹子" in hit["core_win_types"]: score += 500
                if "组选3" in hit["core_win_types"]: score += 100
                if "组选6" in hit["core_win_types"]: score += 50
                score += hit["position_hit_count"] * 10
                score += hit["group_hit_count"]
                return score

            best_pred = max(predictions_with_hits, key=sort_key)
            
            # 简化的最佳命中计数逻辑 for FC3D (定位数)
            best_hit_cnt = best_pred["hit_result"]["position_hit_count"]

            models_with_hits.append({
                "model_id": model_data.get("model_id"),
                "model_name": model_data.get("model_name"),
                "predictions": predictions_with_hits,
                "best_group": best_pred["group_id"],
                "best_hit_count": best_hit_cnt
            })

        new_record = {
            "prediction_date": old_predictions.get("prediction_date"),
            "target_period": old_target_period,
            "actual_result": actual_result,
            "models": models_with_hits
        }

        history_data["predictions_history"].insert(0, new_record)

        with open(FC3D_PREDICTIONS_HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(history_data, f, ensure_ascii=False, indent=2)
            
        print(f"  ✅ 归档完成\n")

    except Exception as e:
        print(f"  ⚠️  归档出错: {str(e)}\n")

def save_predictions(predictions: Dict[str, Any]):
    """保存预测数据"""
    try:
        # 备份
        if os.path.exists(FC3D_PREDICTIONS_FILE):
             # 简单的覆盖逻辑，不做复杂备份以免文件过多，GitHub 有历史记录
             pass

        with open(FC3D_PREDICTIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump(predictions, f, ensure_ascii=False, indent=2)

        print(f"  ✓ 已保存到: {FC3D_PREDICTIONS_FILE}\n")

    except Exception as e:
        print(f"❌ 保存失败: {str(e)}")
        raise

def main():
    try:
        predictions = generate_predictions()
        if predictions:
            save_predictions(predictions)
            print("🎉 FC3D 预测生成完成！")
    except Exception as e:
        print(f"\n❌ 程序执行出错: {str(e)}")
        raise

if __name__ == "__main__":
    main()
