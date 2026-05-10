import os
import json
import pandas as pd
from edgar import set_identity, Company, get_filings
from datetime import datetime

# 1. 基础配置
# 注意：SEC 要求必须提供身份标识
SEC_IDENTITY = os.getenv("SEC_IDENTITY", "Sudotrade Bot <contact@sudotrade.com>")
set_identity(SEC_IDENTITY)

# 目标名人和机构 (50+ 全球顶级大佬监控矩阵 - 已根据 13F-HR 申报主体修复 CIK)
INVESTORS = {
    # --- 价值投资与泰斗 ---
    "0001067983": "Berkshire Hathaway (Warren Buffett)",
    "0001061768": "Baupost Group (Seth Klarman)",
    "0001709323": "Himalaya Capital (Li Lu)",
    "0001173334": "Pabrai Investment Funds (Mohnish Pabrai)",
    "0001759760": "H&H International Investment (Duan Yongping)",
    "0001166559": "Bill & Melinda Gates Foundation",
    "0001079114": "Greenlight Capital (David Einhorn)",

    # --- 宏观、量化与多策略巨头 ---
    "0001350694": "Bridgewater Associates (Ray Dalio)",
    "0001037389": "Renaissance Technologies (Jim Simons)",
    "0001423053": "Citadel Advisors (Ken Griffin)",
    "0001273087": "Millennium Management (Israel Englander)",
    "0001009207": "D.E. Shaw & Co. (David Shaw)",
    "0001478735": "Two Sigma Advisers (Overdeck / Siegel)",
    "0001029160": "Soros Fund Management (George Soros)",
    "0001536411": "Duquesne Family Office (Stanley Druckenmiller)",
    "0001603466": "Point72 Asset Management (Steve Cohen)",
    "0001006438": "Appaloosa Management (David Tepper)",

    # --- 成长与科技先锋 ---
    "0001697748": "ARK Invest (Cathie Wood)",
    "0001167483": "Tiger Global Management (Chase Coleman)",
    "0001135730": "Coatue Management (Philippe Laffont)",
    "0001103804": "Viking Global Investors (Andreas Halvorsen)",
    "0001061165": "Lone Pine Capital (Stephen Mandel)",
    "0001541617": "Altimeter Capital Management (Brad Gerstner)",
    "0001387322": "Whale Rock Capital Management",
    "0001065521": "SoftBank Group (Masayoshi Son)",
    "0001759760": "H&H International Investment (Duan Yongping)",

    # --- 激进投资者 (Activist) ---
    "0001336528": "Pershing Square (Bill Ackman)",
    "0001412093": "Icahn Capital (Carl Icahn)",
    "0001345471": "Trian Fund Management (Nelson Peltz)",
    "0001040273": "Third Point (Dan Loeb)",
    "0001418814": "ValueAct Capital (Mason Morfit)",
    "0001791786": "Elliott Investment Mgmt (Paul Singer)",

    # --- 其他顶级与热门机构 ---
    "0001649339": "Scion Asset Management (Michael Burry)",
    "0000934639": "Maverick Capital (Lee Ainslie)",
    "0000909661": "Farallon Capital (Andrew Spokes)",
    "0000850529": "Fisher Asset Management (Ken Fisher)",
    "0001697233": "GQG Partners (Rajiv Jain)",
    "0000898382": "Leon Cooperman (Omega Advisors)",
    "0001035674": "Paulson & Co. (John Paulson)",
    "0001021944": "Temasek Holdings (Singapore)",
    "0000902219": "Wellington Management Group",
    "0001020066": "Sands Capital Management",
    "0001418226": "Silver Lake Group",
    "0001138995": "Glenview Capital (Larry Robbins)",
    "0001647251": "TCI Fund Management (Chris Hohn)",
    "0001318757": "Marshall Wace LLP",
    "0001581811": "Egerton Capital (UK) LLP",
    "0001083340": "Eminence Capital",
    "0001404574": "683 Capital Management",
    "0001565854": "Zimmer Partners",
    "0001784547": "Woodline Partners",
}

DATA_DIR = "data"

def fetch_investor_holdings(cik, name):
    print(f"正在抓取 {name} (CIK: {cik}) 的持仓数据...")
    try:
        company = Company(cik)
        # 获取 13F-HR 报告
        filings = company.get_filings(form="13F-HR")
        if not filings:
            print(f"未找到 {name} 的 13F-HR 报告")
            return None
        
        latest_filing = filings.latest()
        thirteenf = latest_filing.obj()
        
        # 获取持仓明细
        holdings_df = thirteenf.holdings
        if holdings_df is None or holdings_df.empty:
             print(f"{name} 的报告中没有持仓明细")
             return None
        
        # 数据清洗和转换
        data = {
            "investor_name": name,
            "cik": cik,
            "report_period": str(thirteenf.report_period),
            "filing_date": str(latest_filing.filing_date),
            "total_value": float(thirteenf.total_value),
            "holdings": holdings_df.to_dict(orient="records"),
            "updated_at": datetime.now().isoformat()
        }
        
        # 保存单个 JSON 文件
        file_path = os.path.join(DATA_DIR, f"{cik}.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
        return {
            "name": name,
            "cik": cik,
            "filing_date": str(latest_filing.filing_date),
            "report_period": str(thirteenf.report_period),
            "total_value": float(thirteenf.total_value),
            "last_update": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"抓取 {name} 时发生错误: {e}")
        return None

def main():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        
    summary = []
    for cik, name in INVESTORS.items():
        result = fetch_investor_holdings(cik, name)
        if result:
            summary.append(result)
            
    # 保存索引文件
    with open(os.path.join(DATA_DIR, "index.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
        
    print(f"所有抓取任务已完成，共成功抓取 {len(summary)} 家机构。")

if __name__ == "__main__":
    main()
