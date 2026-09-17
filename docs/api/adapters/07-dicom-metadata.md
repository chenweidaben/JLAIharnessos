# DICOM 元数据 API

> 对应源码：`src/integration/protocols/dicom/DICOMParser.ts`、`DICOMMetadata.ts`、`DICOMWebClient.ts`

## 概述

DICOM 模块负责解析 DICOM 文件元数据，并通过 DICOMweb（QIDO-RS / WADO-RS）与 PACS 网关交互，本系统仅处理元数据与调阅句柄，不直接处理像素流。

## 核心类

### DICOMParser

| 方法 | 入参 | 出参 | 说明 |
| --- | --- | --- | --- |
| `parse(buf)` | DICOM 文件 | DICOMMetadata | 解析元数据 |
| `extractTags(meta, tags[])` | 元数据+标签 | object | 提取指定标签 |

### DICOMWebClient

| 方法 | 入参 | 出参 | 说明 |
| --- | --- | --- | --- |
| `qido(search)` | 查询参数 | Study[] | QIDO-RS 查询 |
| `wado(studyUid)` | 检查UID | RetrieveUrl | WADO-RS 调阅 |

## DICOMMetadata

| 字段 | 标签 | 说明 |
| --- | --- | --- |
| `patientId` | (0010,0020) | 患者ID |
| `studyInstanceUID` | (0020,000D) | 检查实例UID |
| `seriesInstanceUID` | (0020,000E) | 序列实例UID |
| `modality` | (0008,0060) | 设备类型 CT/MR/DR |
| `bodyPart` | (0018,0015) | 检查部位 |

## 错误码

| 错误码 | 含义 |
| --- | --- |
| `DICOM_PARSE_ERROR` | 文件解析失败 |
| `QIDO_NO_RESULT` | 无匹配检查 |
| `WADO_DENIED` | 调阅被拒 |

---

*健澜科技数智医院智能体 · 适配器 API*
