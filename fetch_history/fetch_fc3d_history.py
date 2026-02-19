#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
福彩3D 历史开奖数据获取脚本

功能：
1. 从 500 彩票网爬取福彩3D 历史开奖数据 (使用 inc/history.php 接口)
2. 自动计算和值、跨度、形态（豹子/组三/组六）
3. 合并历史数据，去重
4. 输出到 data/fc3d_history.json

使用方法：
    python3 fetch_fc3d_history.py
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import sys
import os
from datetime import datetime, timedelta


class FC3DDataFetcher:
    """福彩3D 数据获取器"""

    def __init__(self):
        # 使用浏览器分析得到的真实数据接口
        # limit=200 保证能获取足够多的近期数据
        self.base_url = "https://datachart.500.com/sd/history/inc/history.php?limit=200"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Referer': 'https://datachart.500.com/sd/history/history.shtml'
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    def fetch_page(self, url, retry=3):
        """获取网页内容"""
        for attempt in range(retry):
            try:
                print(f"正在获取福彩3D数据... (尝试 {attempt + 1}/{retry})")
                response = self.session.get(url, timeout=15)
                # 500彩票网通常使用 gb2312 编码
                response.encoding = 'gb2312'

                if response.status_code == 200:
                    return BeautifulSoup(response.text, 'html.parser')
                else:
                    print(f"HTTP 状态码: {response.status_code}")

            except requests.exceptions.RequestException as e:
                print(f"请求失败: {e}")
                if attempt < retry - 1:
                    time.sleep(2)

        return None

    @staticmethod
    def calc_type(digits):
        """计算形态: 豹子/组三/组六"""
        unique = set(digits)
        if len(unique) == 1:
            return "豹子"
        elif len(unique) == 2:
            return "组三"
        else:
            return "组六"

    def parse_fc3d_data(self, soup):
        """解析福彩3D 开奖数据 (针对 inc/history.php 结构)"""
        data_list = []

        try:
            # 数据行通常有 class="t_tr1"
            rows = soup.find_all('tr', class_='t_tr1')
            
            if not rows:
                print("未找到数据行 (class='t_tr1')，尝试查找所有 tr")
                # 备用：查找表格中的所有行
                table = soup.find('tbody') or soup.find('table')
                if table:
                    rows = table.find_all('tr')
            
            if not rows:
                print("未找到任何数据行")
                return data_list

            print(f"找到 {len(rows)} 行数据，开始解析...")

            for row in rows:
                cols = row.find_all('td')

                # inc/history.php 的列结构通常是：
                # 0: 期号 (2026044)
                # 1: 开奖号码 (5 8 9) - 空格分隔
                # 2: 和值
                # 3: 跨度
                # ...
                # 10: 开奖日期 (2026-02-13) (索引可能因页面变动而不同，倒数第一列通常是日期)

                if len(cols) < 5:
                    continue

                try:
                    # 1. 提取期号
                    period = cols[0].text.strip()
                    if not period.isdigit() or len(period) != 7:
                        continue

                    # 2. 提取开奖号码
                    # 可能是 "5 8 9" 格式，也可能是分开的列
                    # 在 inc/history.php 中通常是第2列包含所有号码
                    nums_text = cols[1].text.strip()
                    if ' ' in nums_text:
                        # 格式: "5 8 9"
                        digits = nums_text.split()
                    else:
                        # 尝试后续列
                        d1 = cols[1].text.strip()
                        d2 = cols[2].text.strip()
                        d3 = cols[3].text.strip()
                        digits = [d1, d2, d3]

                    # 验证数字
                    if len(digits) != 3 or not all(d.isdigit() for d in digits):
                        continue

                    number = "".join(digits)
                    
                    # 3. 计算/提取衍生数据
                    s = sum(int(d) for d in digits)
                    span = max(int(d) for d in digits) - min(int(d) for d in digits)
                    form_type = self.calc_type(digits)

                    # 4. 提取日期
                    # 尝试最后一列，或者倒数几列中符合日期格式的
                    date_str = ""
                    for i in range(len(cols) - 1, max(len(cols) - 5, 3), -1):
                        txt = cols[i].text.strip()
                        if '-' in txt and len(txt) >= 8: # 2026-02-13
                            date_str = txt
                            break
                    
                    if not date_str:
                         # 如果没找到日期，暂且留空或用当天
                         date_str = datetime.now().strftime("%Y-%m-%d")

                    lottery_item = {
                        "period": period,
                        "digits": digits,
                        "number": number,
                        "sum": s,
                        "span": span,
                        "type": form_type,
                        "date": date_str
                    }

                    data_list.append(lottery_item)

                except Exception as e:
                    # 仅在调试时取消注释，以免刷屏
                    # print(f"解析行数据时出错: {e}")
                    continue

            print(f"成功解析 {len(data_list)} 期福彩3D数据")

        except Exception as e:
            print(f"解析数据时发生错误: {e}")

        return data_list

    def merge_with_existing_data(self, new_data, existing_file):
        """合并新数据和现有数据，去重"""
        existing_data = []

        if os.path.exists(existing_file):
            try:
                with open(existing_file, 'r', encoding='utf-8') as f:
                    existing_json = json.load(f)
                    existing_data = existing_json.get("data", [])
                print(f"已加载现有福彩3D数据: {len(existing_data)} 期")
            except Exception as e:
                print(f"加载现有数据时出错: {e}")

        data_dict = {}

        for item in existing_data:
            data_dict[item['period']] = item

        new_count = 0
        for item in new_data:
            if item['period'] not in data_dict:
                new_count += 1
            data_dict[item['period']] = item

        merged_data = list(data_dict.values())
        merged_data.sort(key=lambda x: x['period'], reverse=True)

        print(f"合并完成: 新增 {new_count} 期, 总计 {len(merged_data)} 期")

        return merged_data

    def predict_next_draw(self, latest_period, latest_date):
        """
        预测下一期开奖信息
        福彩3D 每天开奖（含周末），晚上 21:15
        """
        try:
            period_num = int(latest_period)
            try:
                last_draw_date = datetime.strptime(latest_date, '%Y-%m-%d')
            except ValueError:
                # 容错：如果日期格式不对，默认是今天
                last_draw_date = datetime.now()

            # 福彩3D 每天开奖，下一期就是下一天
            next_date = last_draw_date + timedelta(days=1)
            
            # 如果抓取的数据不是今天的（比如还是昨天的），且当前时间已经过了开奖时间，
            # 那么"下一期"可能实际上就是"今天"（如果还没开奖）或者"明天"
            # 这里简单处理：始终假设是最新一期的下一天

            # 计算下一期期号 (注意跨年逻辑，这里简单处理+1)
            # 福彩3D期号通常是 年份+3位序号 (2026044)
            # 如果是年底，需要特殊处理，但暂时 +1 足够通用
            next_period = str(period_num + 1)

            next_date_str = next_date.strftime('%Y-%m-%d')
            next_date_display = next_date.strftime('%Y年%m月%d日')

            weekday_names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
            weekday = weekday_names[next_date.weekday()]

            return {
                'next_period': next_period,
                'next_date': next_date_str,
                'next_date_display': next_date_display,
                'weekday': weekday,
                'draw_time': '21:15'
            }

        except Exception as e:
            print(f"预测下一期信息时出错: {e}")
            return None

    def format_for_web(self, data):
        """格式化数据为网页使用的格式"""
        formatted = {
            "lottery_type": "fc3d",
            "last_updated": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "data": data
        }

        if data and len(data) > 0:
            latest = data[0]
            next_draw_info = self.predict_next_draw(latest['period'], latest['date'])
            if next_draw_info:
                formatted['next_draw'] = next_draw_info

        return formatted

    def save_to_json(self, data, output_file):
        """保存数据"""
        try:
            merged_data = self.merge_with_existing_data(data, output_file)
            formatted_data = self.format_for_web(merged_data)
            
            # 确保目录存在
            os.makedirs(os.path.dirname(output_file), exist_ok=True)

            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(formatted_data, f, ensure_ascii=False, indent=2)

            print(f"\n数据已成功保存到 {output_file}")
            print(f"共保存 {len(merged_data)} 期数据")

        except Exception as e:
            print(f"保存文件时出错: {e}")

    def fetch_and_save(self):
        """获取并保存数据的主函数"""
        print("=" * 50)
        print("福彩3D 历史开奖数据获取工具")
        print("=" * 50)

        # 获取网页
        soup = self.fetch_page(self.base_url)

        if not soup:
            print("获取网页失败，请检查网络连接或稍后重试")
            return False

        # 解析数据
        fc3d_data = self.parse_fc3d_data(soup)

        if not fc3d_data:
            print("未能解析到任何数据")
            return False

        # 显示最新几期数据
        print("\n最新 5 期数据预览：")
        print("-" * 50)
        for item in fc3d_data[:5]:
            print(f"期号: {item['period']} | 号码: {item['number']} | 和值: {item['sum']} | 跨度: {item['span']} | 形态: {item['type']} | 日期: {item['date']}")

        # 保存到 data/fc3d_history.json
        script_dir = os.path.dirname(os.path.abspath(__file__))
        # 注意：脚本在 fetch_history/ 目录下，数据在 ../data/
        output_file = os.path.join(script_dir, '..', 'data', 'fc3d_history.json')
        output_file = os.path.abspath(output_file)

        self.save_to_json(fc3d_data, output_file)

        return True


def main():
    """主函数"""
    fetcher = FC3DDataFetcher()
    success = fetcher.fetch_and_save()

    if success:
        print("\n✓ 福彩3D 数据获取完成！")
    else:
        print("\n✗ 福彩3D 数据获取失败")
        sys.exit(1)


if __name__ == "__main__":
    main()
