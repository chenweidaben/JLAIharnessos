# 第三方组件与数据许可证清单（Third-Party Licenses）

本文件汇总健澜科技杠OS 使用的第三方开源组件、运行时服务与数据资源的许可证。
项目代码以 Apache-2.0 许可，但**随附/依赖的第三方组件与数据各有其许可证**，
商用分发时请以各组件官方许可证文本为准。完整依赖树可通过 `bun licenses` /
`npm licenses` 及各容器镜像的许可声明获取。

## 一、后端依赖（src / 运行时）

| 组件 | 用途 | 许可证 |
|------|------|--------|
| [Bun](https://bun.sh/) | JavaScript 运行时/工具链 | MIT |
| TypeScript | 语言与类型系统 | Apache-2.0 |
| zod | 运行时 schema 校验 | MIT |
| @modelcontextprotocol/sdk | 模型上下文协议 | MIT |
| @anthropic-ai/sdk | LLM 客户端 SDK | MIT |
| react / react-reconciler | Ink 终端渲染 | MIT |
| ink | 终端 UI 框架 | MIT |
| commander | CLI 参数解析 | MIT |
| chalk | 终端着色 | MIT |
| execa | 进程调用 | MIT |
| yaml | YAML 解析/生成 | ISC |
| ioredis | Redis 客户端 | MIT |
| ioredis-mock | Redis 测试 Mock | MIT |
| lru-cache | LRU 缓存 | ISC |
| undici / axios | HTTP 客户端 | MIT |
| ws | WebSocket | MIT |
| lodash-es | 工具函数 | MIT |

## 二、前端依赖（web/）

| 组件 | 用途 | 许可证 |
|------|------|--------|
| React / react-dom | UI 框架 | MIT |
| Ant Design / @ant-design/icons | 组件库 | MIT |
| @xyflow/react（React Flow） | 低代码流程画布 | MIT |
| zustand | 状态管理 | MIT |
| react-router-dom | 路由 | MIT |
| axios | HTTP 客户端 | MIT |
| ECharts / echarts-for-react | 图表 | Apache-2.0 / MIT |
| dayjs | 日期处理 | MIT |
| clsx | 类名工具 | MIT |
| Vite / Vitest | 构建与测试 | MIT |
| Tailwind CSS / PostCSS / autoprefixer | 样式 | MIT |
| Testing Library / jsdom | 前端测试 | MIT |
| Playwright | 端到端测试 | Apache-2.0 |
| yaml | DSL 导入导出 | ISC |

## 三、运行时服务与中间件（docker-compose）

> ⚠️ **重要**：部分基础软件近年许可证发生变化，**商用/SaaS 场景需特别评估**。
> 下表如实标注，并给出纯开源（OSI 认可）替代，部署方应自行选择合规组合。

| 服务 | 默认镜像版本 | 许可证 | 商用注意 / 开源替代 |
|------|--------------|--------|--------------------|
| PostgreSQL | 16.x | PostgreSQL License（类 BSD/MIT） | 可自由商用 |
| **Redis** | 7.4 | **RSALv2 / SSPL（7.4 起非 OSI 开源）** | 仅自用/内部部署通常无碍；云转售/SaaS 需评估，可替换为 **ValKey（BSD-3）/ KeyDB / Redis 7.2 及更早 BSD 版本** |
| Apache Kafka | 3.x（KRaft） | Apache-2.0 | 可自由商用 |
| Nginx | 稳定版 | BSD-2-Clause | 可自由商用 |
| Prometheus | — | Apache-2.0 | 可自由商用 |
| **Grafana** | — | **AGPL-3.0** | 内部使用一般可；对外提供网络服务须开源或购商业授权 |
| **Elasticsearch / Kibana** | 8.x | **Elastic License v2 / SSPL（7.11 起非 OSI）** | 内部使用参考其条款；需要纯开源可替换为 **OpenSearch（Apache-2.0）** |
| Jaeger | — | Apache-2.0 | 可自由商用 |
| pgvector | 扩展 | PostgreSQL License | 可自由商用 |

> 平台对缓存与检索均做了**接口抽象**（`ICache`、检索引擎接口），可在不改业务代码的情况下替换为 ValKey / OpenSearch 等合规组件。

## 四、医学数据资源

医学知识库、术语集、语料、指南的许可证与代码许可**相互独立**，且部分需注册或认证。
完整的 26 个数据源、获取方式、再分发/商用条款与合规红线，见
[DATA_LICENSES.md](DATA_LICENSES.md)。要点：

- 可开放获取：MeSH、ChEMBL（CC BY-SA 3.0）、TCM-MKG（CC BY 4.0）、OpenDRG（Apache-2.0）、openFDA、PubMed OA 等；
- 免费注册：LOINC、RxNorm、CMeKG、HiTA 等；
- 持证认证、**禁止随本项目再分发**：SNOMED CT、UMLS、MIMIC、eICU、DrugBank 商业版等。

## 五、合规建议

1. 商业发行前，用 `bun run security:audit` 与 `npm audit` 检查依赖漏洞与许可；
2. 对 SSPL/RSAL/AGPL/Elastic License 组件，结合交付形态（私有化/SaaS/转售）做法务评估，必要时切换到开源替代；
3. 保留所有第三方版权声明与许可全文（构建产物建议包含 `third_party/` 或许可汇总页面）；
4. 不打包、不镜像任何受限医学数据。

如发现许可证标注有误或缺漏，欢迎提 Issue 更正。
