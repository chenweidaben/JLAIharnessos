# 医疗知识库合规获取工具

健澜科技杠OS 医疗知识中台的**数据源登记与合规获取编排器**。
在等保/内网医院环境中，外部知识数据的引入必须可审计、可复核，因此本工具：

- 默认 **dry-run**，只输出来源清单、许可证、落盘路径与申请指引，不联网、不下载；
- 仅对明确开放（`autoDownload`）的数据源，在显式加 `--execute` 后才下载；
- 对需注册、持证认证、仅在线查阅的数据源，**永不自动抓取**，只生成来源卡与申请步骤；
- 下载文件记录来源 URL、许可证、SHA-256 与时间，写入 `REGISTRY.json`。

## 文件

- `sources.ts`：权威数据源清单（26 个，含机构、URL、许可证、获取方式、合规说明）。
- `download.ts`：CLI 获取编排器。

## 用法

```bash
# 列出全部数据源
bun scripts/knowledge/download/download.ts --list

# 按类别列出（terminology/drug/knowledge-graph/corpus/evidence/classification/platform）
bun scripts/knowledge/download/download.ts --list --category terminology

# 预览单个数据源（生成来源卡，不下载）
bun scripts/knowledge/download/download.ts --source=loinc

# 下载所有“可自动下载”的开放源（MeSH / ChEMBL / TCM-MKG）
bun scripts/knowledge/download/download.ts --all-open --execute

# 指定输出目录
bun scripts/knowledge/download/download.ts --all-open --execute --out /data/knowledge/raw
```

## 输出结构

```
data/knowledge/raw/
├── _source-cards/
│   ├── mesh.md            # 每个数据源的来源与许可卡
│   ├── snomed-ct.md
│   └── ...
├── mesh/
│   ├── desc2026.gz
│   └── supp2026.gz
├── tcm-mkg/...
├── chembl/...
└── REGISTRY.json          # 下载审计台账（来源/校验和/时间）
```

## 接入知识中台

1. 原始数据落 `data/knowledge/raw/<source>/`；
2. 由 ETL/解析任务转换为知识中台统一模型（术语、实体、关系、文档块），写入 PostgreSQL + pgvector；
3. 转换脚本须保留每条知识的 `source`、`source_url`、`license`、`version`、`retrieved_at` 溯源字段；
4. 受限数据（L3）由医院按 `DATA_LICENSES.md` 自行获取后放入对应目录，平台不打包、不上传。

## 新增数据源

在 `sources.ts` 中新增一条 `KnowledgeSource`，如实填写许可证与获取方式；
不能确定再分发/商用授权时，一律设 `redistributable:false`、`commercialUse:false`、`autoDownload:false`，
宁可保守，不可越权。

> 许可边界与红线见仓库根目录 [`DATA_LICENSES.md`](../../../DATA_LICENSES.md)。
