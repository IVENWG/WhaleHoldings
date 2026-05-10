# Famous Holdings Tracker (SEC 13F)

这是一个利用 GitHub Actions 自动抓取并解析 SEC 13F 文件（名人大户持仓）的项目。

## 架构说明

1.  **数据抓取**: 使用 Python 库 `edgartools` 直接访问 SEC EDGAR 系统。
2.  **自动化**: 通过 GitHub Actions 每周（或手动）运行一次脚本。
3.  **数据存储**: 解析后的结构化数据以 JSON 格式存储在 `/data` 目录下。
4.  **数据分发**: 任何前端应用（网页、Cloudflare Workers）都可以通过 GitHub 的原始文件链接（或配合 jsDelivr CDN）直接调用这些 JSON 数据。

## 包含的投资者 (CIK 列表)

- **Warren Buffett**: Berkshire Hathaway (0001067983)
- **Cathie Wood**: ARK Invest (0001601351)
- **Ray Dalio**: Bridgewater Associates (0001350694)
- **Michael Burry**: Scion Asset Management (0001649339)
- **Bill Gates**: Bill & Melinda Gates Foundation (0001166559)
- **Jim Simons**: Renaissance Technologies (0001037389)
- **Tiger Global**: Tiger Global Management (0001423053)

## 如何使用数据

### 1. 获取索引
`https://raw.githubusercontent.com/<YOUR_USERNAME>/<REPO_NAME>/main/data/index.json`

### 2. 获取特定机构持仓
`https://raw.githubusercontent.com/<YOUR_USERNAME>/<REPO_NAME>/main/data/<CIK>.json`

## 本地开发

1. 安装依赖:
   ```bash
   pip install -r requirements.txt
   ```
2. 运行抓取:
   ```bash
   export SEC_IDENTITY="Your Name <email@example.com>"
   python fetch_holdings.py
   ```

## 注意事项
- 13F 报告是**季度更新**的（每个季度结束后的 45 天内提交），所以数据并非实时的。
- `edgartools` 会尝试将 CUSIP 映射到 Ticker，但并非所有证券都能成功映射。
