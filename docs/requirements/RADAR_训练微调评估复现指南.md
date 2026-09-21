# DAMO-RADAR 训练 / 微调 / 评估 / 复现指南

> 杭州健澜科技有限公司 · JLAIharnessos
> 版本 v0.2.0-radar ｜ 2026-09
> 适用对象：算法 / 影像科研、信息科、院内 AI 试点团队

本指南基于上游 vendor 文档 `services/radar-inference/vendor/damo-radar/docs/`（`TRAINING.md` / `INFERENCE.md` / `PREPROCESS.md`）整理，说明如何在**院内私有数据**上微调 DAMO-RADAR、做本地验证、监控漂移，以及如何复现内置 demo 推理流程。

> ⚕️ 训练/微调产生的新权重其许可链条须自行厘清；直接使用上游 `checkpoint_radar_pretrain.pth` 仍受 **CC BY-NC-SA 4.0（非商业）** 约束。商用与医疗器械合规见 [`docs/open-source/RADAR_许可与合规声明.md`](../open-source/RADAR_许可与合规声明.md)。

---

## 1. 上游训练管线速览

| 项 | 说明（来自 vendor 文档） |
|----|--------------------------|
| 训练数据 | MERLIN-CT-Train（Stanford AIMI Shared Datasets 公开申请下载）；仓库另带少量 `data/merlin_data_train_demo/` 演示用例，仅用于验证管线能跑通 |
| 预处理 | TotalSegmentator V1 生成 104 结构掩码 → 映射到 36 主要解剖结构 → 图像与掩码重采样到 spacing `[1,1,5]` |
| 视觉骨干 | VisionBranch 为 UNet/RESUNet 风格 3D 架构（预训练 `checkpoint_unet.pth`）；推理时滑窗 |
| 文本侧 | 中文 BERT tokenizer（`bert-base-chinese`） |
| 训练入口 | `RADAR_train/train.py` |
| 分布式 | 单卡 `python train.py`；多卡 `torchrun --nproc_per_node=8 train.py`；上游用 24×A100/H20、总 batch 48 训练 |
| 全局对齐 | `radar_plus`（默认 True）控制 RADAR+ 全局对齐模块；设 False 关闭 |
| 微调开关 | `radar_ft=True` 从预训练 RADAR checkpoint 微调；默认 False（从头训练） |
| 评估 | `RADAR_train/calc_metrics.py` |

> 以上为上游公开复现口径。院内算力有限时，建议**从预训练 checkpoint 微调**（`radar_ft=True`），而非从头训练。

---

## 2. 复现内置 demo 推理（无需权重即可验证契约）

这是**最安全的第一步**：不下载权重、不连 GPU，先验证服务与管线是否就位。

```bash
cd services/radar-inference
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8090
```

提交内置 demo 作业：

```bash
curl -s -X POST http://localhost:8090/api/v1/radar/jobs \
     -H "X-Internal-Token: $RADAR_INTERNAL_TOKEN" -H "Content-Type: application/json" \
     -d '{"study_uid":"demo-study","source":"demo"}'
```

服务会加载 `vendor/damo-radar/RADAR_infer_results_demo.csv`（上游对一个 demo NIfTI 的预计算结果），**确定性**返回 146 findings。这一步验证的是**契约与前端闭环**，不是模型精度。

上游原始 demo 复现（需权重+GPU，见 vendor `docs/INFERENCE.md`）：

```bash
cd services/radar-inference/vendor/damo-radar/RADAR_inference
python inference_demo.py     # 产物 RADAR_infer_results_demo.csv
```

---

## 3. 在院内私有数据上微调

> 本节描述**流程与接口**；院内数据须完成伦理审批、脱敏与数据使用授权后方可使用。

### 3.1 准备数据

1. 取得本院腹部增强 CT（DICOM）与对应放射报告；
2. **外部预处理**（复用上游 `PREPROCESS.md`）：
   - 用 TotalSegmentator V1 生成 104 结构原始掩码；
   - `RADAR_train/preprocess_code/process_img_mask.py` 把 104 结构合并为 36 主要结构，并把图像+掩码重采样到 spacing `[1,1,5]`：
     ```bash
     cd RADAR_train/preprocess_code
     python process_img_mask.py --src-dir /path/to/totalsegmentator_masks --root-dir /path/to/merlin_data_root
     ```
   - 若掩码已就绪、只需重采样图像：`process_img.py`；
3. 报告结构化（可选，调用 LLM 把自由文本报告拆成 anatomy-level 监督）：`check_organ_mention.py` → `report_parsing.py` → `report_parsing_normal.py`（依次运行，输出 `merlin_report_mention.json` / `merlin_report_organ_report_v1.json` / `merlin_report_organ_normal_v1.json`）。

### 3.2 准备权重与支撑文件

| 文件 | 用途 | 目标位置 |
|------|------|----------|
| `bert-base-chinese` | 中文 tokenizer | `ckpt/bert-base-chinese` |
| `checkpoint_unet.pth` | 预训练 VisionBranch(UNet/RESUNet) | `ckpt/checkpoint_unet.pth` |
| `checkpoint_radar_pretrain.pth` | 预训练 RADAR（微调起点） | `ckpt/`（亦见部署手册权重下载） |

> 微调强烈建议从 `checkpoint_radar_pretrain.pth` 起步，而非从零训练。

### 3.3 启动微调

```bash
cd services/radar-inference/vendor/damo-radar/RADAR_train

# 关键配置（radar_config.yaml）：
#   radar_ft: True   -> 从预训练 RADAR checkpoint 微调
#   radar_plus: True -> 保留 RADAR+ 全局对齐模块

# 单卡（小规模验证）
python train.py

# 多卡（建议）
torchrun --nproc_per_node=8 train.py
```

按院内数据规模调整 `vis_root`（训练数据根路径）与 batch；上游参考为 24×A100/H20、总 batch 48，院内可按显存缩小。

---

## 4. 本地验证（findings 级敏感度 / 特异度）

微调后、上线前，必须在**本院留出的测试集**上做 findings 级评估。

### 4.1 出推理 CSV

```bash
cd RADAR_train
python infer_merlin_anatomy.py     # anatomy-level findings
python infer_merlin_whole.py       # whole-image findings
# 多卡：torchrun --nproc_per_node=8 infer_merlin_anatomy.py
```

结果保存为 CSV。

### 4.2 计算指标

```bash
cd RADAR_train
python calc_metrics.py            # 用推理 CSV 与标签文件计算
```

### 4.3 在本融合内的验收口径

- 按 **146 findings 逐项**统计敏感度（sensitivity）、特异度（specificity）、AUC；
- 重点关注 **critical 发现**的漏诊率（敏感度优先）；
- 调 `RADAR_POSITIVE_THRESHOLD` / `RADAR_MAJOR_THRESHOLD` / `RADAR_CRITICAL_FINDINGS` 使 critical 召回达标，同时控制 major/minor 的误报负担；
- 记录验证集规模、金标准来源、阈值版本、结果快照，留痕于院内验证报告。

> 上游在其外部 MERLIN 测试集上报的整体 AUC 约 **0.883**（见 vendor `INFERENCE.md`）。这是**上游公开数字**，**不代表**本院上线表现；本院数字以你自己的留出集评估为准。

### 4.4 silent mode（静默/影子模式）建议

新权重或新阈值上线初期，建议先以 **silent（影子）模式**运行：AI 结果只供后台比对、不推送到医师工作台、不进报告，与金标准平行积累一段时间，确认分布稳定、critical 无明显漏诊后，再开放给医师作为第二阅片。

---

## 5. 漂移监控

上线后持续监控，避免分布漂移导致性能悄悄下降：

| 监控对象 | 指标 | 触发动作 |
|----------|------|----------|
| 输入分布 | CT 机型/层厚/对比剂时相/ROI 覆盖度变化 | 触发重评估，必要时重采验证集 |
| 输出分布 | 阳性率、critical 占比随时间漂移 | 与基线比对，超阈值告警 |
| 阈值校准 | 各 finding 预测概率直方图漂移 | 重新校准 positive/major 阈值 |
| 医师反馈 | 医师 modify/reject 比例、漏报/误报 | 抽样复盘，进入下一轮微调 |

建议把上述指标接到既有监控（BFF `/metrics`、Grafana 大盘），与 `RADAR_MAX_CONCURRENCY`、作业耗时一并观测。

---

## 6. 关键复现命令速查

```bash
# A. 契约级 demo（无权重）
cd services/radar-inference && uvicorn app.main:app --port 8090

# B. 预处理图像+掩码
cd services/radar-inference/vendor/damo-radar/RADAR_train/preprocess_code
python process_img_mask.py --src-dir /path/to/masks --root-dir /path/to/data

# C. 微调（多卡）
cd ../ && torchrun --nproc_per_node=8 train.py

# D. 推理 + 评估
python infer_merlin_anatomy.py && python calc_metrics.py

# E. 融合服务单测
cd ../../../ && pytest -q     # 期望 19 通过
```

---

## 7. 风险与边界

- 训练/微调属**算法科研与院内验证**范畴，产出权重不自动等于可商用/可上市；
- 任何微调权重上线前均须重复 §4 的本地验证与 §5 的漂移监控设计；
- 上游依赖（TotalSegmentator、DashScope/Qwen 等 LLM API）不随本仓库打包，需自行获取许可/密钥；
- 本文命令路径基于 vendor 上游结构，升级上游时以其最新 `docs/` 为准。

---

*Copyright (c) 2026 杭州健澜科技有限公司 · DAMO-RADAR 训练微调评估复现指南*
