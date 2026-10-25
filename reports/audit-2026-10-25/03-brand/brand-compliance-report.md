# A1 品牌合规 P0 整改交付报告（品牌文档/配置归属）

- 仓库根：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`
- 基线档案：`...\agents\o_000pKWRkDCO\scratch\baseline-findings.md`（§3 命中清单 / §6 替换映射 / §8 文件归属，已逐条采信）
- 正式口径：中文名「健澜AI原生医院操作系统OS」；英文名「Jianlan AI-Native Hospital OS」；署名「杭州健澜科技有限公司」；产品代码标识 `jlmedaios`；远端镜像 `https://github.com/chenweidaben/JLAIharnessos`
- 未执行 `git add` / `git commit`；`git diff --cached --name-only` 为空。

## 一、修改文件绝对路径清单与关键改动行（20 个已跟踪 + 1 个未跟踪目录内文件）

### 配置（4）

1. `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\package.json`
   - L2 `"name": "jlmedaios"`（原 `jianlan-gang-os`）
   - L4 description 正式名「健澜AI原生医院操作系统OS（Jianlan AI-Native Hospital OS）——…」（既有口径，未动）
   - L7 author `健澜科技（杭州健澜科技有限公司）`（保留，未动）
   - L9 homepage `https://github.com/chenweidaben/JLAIharnessos#readme`（原 `https://github.com/jianlan-tech/gang-os#readme`）
   - L12 repository.url `git+https://github.com/chenweidaben/JLAIharnessos.git`
   - L15 bugs.url `https://github.com/chenweidaben/JLAIharnessos/issues`
   - keywords：L18 保留 `健澜科技`；删除 `杠OS`；L19 `AI原生医院操作系统`；L20 `hospital-os`；其余关键词未动。

2. `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\bun.lock`
   - L6 `"name": "jlmedaios"`（原 `jianlan-gang-os`）；仅改项目自身 name 字段，未重排/重生成，依赖版本与结构未动；`git diff` 1 行新增 / 1 行删除。

3. `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\web\package.json`
   - L2 `"name": "jlmedaios-web"`（原 `gang-os-web`）
   - L5 description 正式名 Web 工作台口径（既有，未动）；L7 author 保留「健澜科技（杭州健澜科技有限公司）」。

4. `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\web\package-lock.json`
   - L2 `"name": "jlmedaios-web"`；L8 `packages[""].name = "jlmedaios-web"`（原 `gang-os-web`）；其余字段与依赖未动。

### 根目录文档（3 改 + 1 未动）

5. `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\CONTRIBUTING.md`
   - L1 标题英文正式名 `Contributing to Jianlan AI-Native Hospital OS`；L3 中文正式名；L17 clone URL `https://github.com/chenweidaben/JLAIharnessos.git`；L18 `cd JLAIharnessos`。

6. `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\DEPLOYMENT_GUIDE.md`
   - L3 横幅：`健澜AI原生医院操作系统OS（Jianlan AI-Native Hospital OS）· 未来医院操作系统`（原 `健澜科技 Gang-OS（jlmedaios）· AI 原生未来医院操作系统`）。

7. `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\SECURITY.md`
   - L3 中文正式名；L19 邮件前缀 `[Security] Jianlan AI-Native Hospital OS: `（原 `[Security] Gang-OS: `）；L18 占位邮件 `security@jianlan.tech` 保留未动（见存疑 3）。

8. `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\DEPLOYMENT.md` —— **未改动**（`git diff --stat` 为空）；L3、L136 列入存疑 1、2。

### docs/**（13 个已跟踪架构/指南文档 + 1 个未跟踪目录内文件）

9. `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\docs\DEPLOYMENT_GUIDE.md`
   - L1 标题 `健澜AI原生医院操作系统OS（Jianlan AI-Native Hospital OS）部署运维指南`；L167 systemd `Description=Jianlan AI-Native Hospital OS BFF`（原 `Jianlan Gang-OS BFF`）。

10. `...\docs\architecture\00-决策基线.md` —— L1 标题（原「健澜杠OS 重构 · 专家论证决策基线 v1.0」）。

11. `...\docs\architecture\00-架构宪法.md` —— L1、L3、L15、L29、L39、L42、L60、L104、L710 共 9 处；L39/L42/L104 行文用「本系统」避免 OS/系统重复，其余用正式中文名。

12. `...\docs\architecture\01-PRD-产品需求.md` —— L1 标题；L30 一句话定位首句。

13. `...\docs\architecture\02-技术架构.md` —— L1 标题；内部裸 `gangos-*` 标识符未动（见二次决策清单）。

14. `...\docs\architecture\03-开发指南.md` —— L1 标题。

15. `...\docs\architecture\04-迁移路线.md` —— L1 标题。

16. `...\docs\architecture\05-合规清单.md` —— L1 标题。

17. `...\docs\architecture\06-团队与成本.md` —— L1 标题。

18. `...\docs\architecture\review-1-architect.md` —— L1 标题。

19. `...\docs\architecture\review-2-compliance.md` —— L1 标题；L261 `jianlan-gang-os 架构宪法` → 正式中文名。

20. `...\docs\architecture\review-4-business-cost.md` —— L1、L3、L23、L102、L106、L116、L191、L212 共 8 处。

21. `...\docs\open-source\GitHub发布指南.md`
    - L6 目标仓库真实镜像 `https://github.com/chenweidaben/JLAIharnessos`（原占位 `https://github.com/jianlan-tech/gang-os`）；L79 账号 `chenweidaben` / 仓库 `JLAIharnessos`（原组织 `jianlan-tech` / 仓库 `gang-os`）；L87 remote URL；L135 商标保留声明旧称换成正式中英文名。

22. `...\docs\consult-agent\01-requirements.md`（未跟踪目录 `docs/consult-agent/`，不在 git diff 内）
    - L123 规则句中性化：`产品正式名称固定「健澜AI原生医院操作系统OS」；新增交付树内禁止出现历史旧称及其大小写、连字符变体，品牌口径以本条正式名称为准。`（原句列举字面旧称，规则效力保留、不列举旧称）；L3 版权、L5/L13 产品归属正式名既有口径未动。同目录其余 7 份文档（02-architecture、03-contract、04-data-model、05-state-machine、06-test-strategy、07-milestone-m86、README）复扫无旧称，未改动。

## 二、自检命令与 0 命中证据

### 2.1 JSON 合法性与 BOM（权威校验：Node `JSON.parse`；PS 5.1 双工具对照）

命令（Node 脚本 `scratch\validate-json.js`）：
```
node "…\agents\s_000pKYecxkt\scratch\validate-json.js"
```
输出：
```
package.json  JSON.OK  BOM=false  name=jlmedaios
web/package.json  JSON.OK  BOM=false  name=jlmedaios-web
web/package-lock.json  JSON.OK  BOM=false  name=jlmedaios-web  packages[""].name=jlmedaios-web
bun.lock BOM=False bytes=112064
```

PowerShell 复核：
```powershell
Get-Content -LiteralPath package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Get-Content -LiteralPath web/package.json -Raw -Encoding UTF8 | ConvertFrom-Json
```
- `package.json` PS.JSON.OK name=jlmedaios；`web/package.json` PS.JSON.OK name=jlmedaios-web。
- `web/package-lock.json`：PS 5.1 `ConvertFrom-Json` 抛 `PSArgumentException: 无法处理参数，因为参数"name"的值无效`（376,383 字符大锁文件解析引擎怪癖，非内容损坏）；Node `JSON.parse` 权威通过；`git diff --stat` 仅 2 行新增 / 2 行删除（两个 name 字段），结构未破坏。见存疑 7。

BOM 字节校验（`EF BB BF`）：上述 4 个配置 + 17 个归属内文档共 21 个文件，全部 `BOM=False`；`bun.lock` 非标准 JSON（Bun 自定义 lockfile），仅 L6 单行变更。

### 2.2 归属内禁用 token 复扫（Grep 工具，英文 token `-i`，中文词单独检索）

§6 L62 禁用清单：`gang-os`、`杠OS`、`jianlan-gang-os`、`gang-os-web`、`jianlan-gangos`、`jianlan-tech/gang-os`、`建兰`（规则句除外）。

| 范围 | 命令 pattern | 结果 |
|---|---|---|
| 配置四文件 `package.json`、`bun.lock`、`web/package.json`、`web/package-lock.json` | `gang-os\|jianlan-gang-os\|gang-os-web\|jianlan-gangos\|jianlan-tech/gang-os\|Gang-OS\|杠OS\|建兰`（`-i`） | **0 match** |
| 根归属四文档 `CONTRIBUTING.md`、`DEPLOYMENT_GUIDE.md`、`DEPLOYMENT.md`、`SECURITY.md` | 同上 | **0 match** |
| `docs/**` | 同上 | **1 match**，仅豁免规则句 `docs\technical\00-开发规范与代码规范.md:121`（父代理指令 #2 保持不改） |
| `docs/**` 占位组织名/展示变体 `jianlan-tech\|gangos-\|jianlan-gangos\|GangOS\|Gang OS\|Jianlan OS`（`-i`） | 49 match，全部为裸 `gangos-*` 标识符/路径/指标前缀/告警名（§6 L62 未禁，列入二次决策清单）；无 `jianlan-tech` 占位组织名、无 `jianlan-gangos`、无英文展示变体 |

### 2.3 边界桶复核（确认未越界、且他方已修复项 0 残留）

| 范围 | 结果 |
|---|---|
| `src/**` | P0 复合 token **0 match** |
| `tests/**` | P0 复合 token **0 match** |
| `web/src/**` | P0 复合 token **0 match**；裸 `gangos` 0 match |
| `web/` 目录 | 仅 `web\Dockerfile.frontend:35,83` 两处（A4 归属，见下节）；`web/package.json`、`web/package-lock.json`、`web/bun.lock`、`web/tests`、`web/docs` P0 0 match |
| `docker-compose.yml`、`docker-compose.prod.yml` | `gangos\|gang-os\|jianlan-gang\|jianlan-tech` **0 match**；镜像已为 `registry.jianlan.tech/jlmedaios/*` |
| `deploy/**` | P0 复合 token **0 match**；仅裸 `gangos_` PromQL（二次决策清单） |
| `.env*` | P0 token **0 match** |
| `README.md`、`README_EN.md` | P0 token **0 match** |
| `services-java/**`、`services-python/**`、`services/**`、`miniprogram/**` | P0 token **0 match** |
| `.github/**` | P0 token **0 match**（他方已就地修复 `ISSUE_TEMPLATE/config.yml:4,7,10`） |

## 三、范围外仍存在的禁用 token 命中清单（按归属分组，供收口分派）

### 3.1 P0 强制残留 —— A4 归属（4 行，§6 L58 映射 `jianlan-gangos-*` → `jlmedaios-*`）

- `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\Dockerfile.backend:44`
  `LABEL org.opencontainers.image.title="jianlan-gangos-backend" \`
- `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\Dockerfile.backend:90`
  同一 label 重复（同上串）
- `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\web\Dockerfile.frontend:35`
  `LABEL org.opencontainers.image.title="jianlan-gangos-web" \`
- `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\web\Dockerfile.frontend:83`
  同一 label 重复（同上串）

### 3.2 P0 强制残留 —— 未分配（§8 未划归，收口判定，2 行）

- `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\package-lock.json:2` —— `"name": "jianlan-gang-os"`
- `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\package-lock.json:8` —— `packages[""].name = "jianlan-gang-os"`
- 说明：该文件被 `.gitignore:64` 忽略、未跟踪（rg 整仓扫描默认跳过，故未出现在整仓结果中）；A1 仅归属根 `bun.lock`，不含此文件。建议收口决定删除/重新生成，或同步 `jlmedaios`。

### 3.3 豁免规则句（父代理指令 #2 明确保持不改，不是违规，禁止当残留清理）

- `...\reports\consult-rebuild\CONTRACT-m86.md:4,481` —— 品牌禁令合同条款，列举禁用旧称作为规则文本
- `...\reports\consult-rebuild\baseline-survey.md:93` —— 基线遗留清单说明
- `...\reports\01-代码质量审查报告.md:19,85` —— 合规审查记录，「建兰」出现在错别字校验说明中
- `...\docs\technical\00-开发规范与代码规范.md:121` —— 开发规范「严禁使用建兰等同音字」原文

### 3.4 历史巡检记录（建议同豁免口径保留，待收口确认，不改写「修改前」列）

- `...\reports\patrol\round1-2026-10-25-1623.md:59,63,64,65,66,67,68,69,70` —— §5.1「修改前/后」对照表引用旧称与占位 URL，属审计留痕；改写会破坏历史记录价值。

### 3.5 已由他方就地修复、A1 复核 0 残留（仅备案，勿重复改）

- `.github\ISSUE_TEMPLATE\config.yml:4,7,10`
- `.gitignore:1` 标题/版权
- `src\bff\routes\apiDocs.ts:23,38`；`src\bff\aggregators\apiDocsAggregator.ts:505`；`tests\unit\apiDocs.test.ts:48`
- `.env.compose.example` L2 杠OS、L50 `POSTGRES_DB=gangos` 已清零；当前仅 L23 占位 registry host（见 4.2）。

## 四、§6 未禁、二次决策清单（非本轮 P0 违规，须与代码改名联动，勿在本轮误改）

### 4.1 裸 `gangos` 标识符（无连字符，§6 L62 未列；建议统一映射 `jlmedaios-*` 并与 A3/A4 联动）

**A3（`src/**`、`tests/**`）：**
- `...\src\core\observability\metrics.ts:8,206,210,217,223,226`
- `...\src\bff\observability\metrics.ts:9,45,47,51,56,58,61`
- `...\src\knowledge-platform\index.ts:2`、`...\src\knowledge-platform\types.ts:2`（注释展示变体 `（GangOS / Jianlan OS）`）
- `...\tests\unit\bff\metrics.test.ts:83,84,85,88`
- `...\tests\unit\core\observability\business-metrics.test.ts:35,37,51,60,71`

**A4（`deploy/**`）：**
- `...\deploy\prometheus\rules\jlmedaios.yml:3,25,40,42,55,66,81,83,96,109,111,125`（12 行 PromQL `gangos_*` + L3 注释说明）
- `...\deploy\grafana\dashboards\jlmedaios-overview.json:84,131,178,225,290,339,388,397,406,472,521,570,619,685,734,783`（16 条 PromQL）
- `...\deploy\grafana\dashboards\jlmedaios-infra.json`：0 gangos（已干净）

**未分配：**
- `...\CHANGELOG.md:25,63,64`（L25/L63 `gangos_` 前缀描述；L64 旧路径 `deploy/prometheus/rules/gangos.yml`）
- `...\web\tests\pages\profile\MfaSettings.test.tsx:58`（`issuer=gangos`；`web/tests` 归属未明确）

**A1-docs 归属内（建议收口决策是否统一映射 `jlmedaios-*`）：**
- `...\docs\architecture\02-技术架构.md:28,36,114,126,185,511,528,596,645,646,662,668`（12）
- `...\docs\architecture\03-开发指南.md:17,19,223,451,601,602,650`（7）
- `...\docs\architecture\04-迁移路线.md:31,43,190`（3）
- `...\docs\architecture\review-1-architect.md:77,326,388,421,435`（5）
- `...\docs\operations\01-监控手册.md:85,87,89,93,94,95,96,97,98,99,100,101`（12；L85/L87 引用已改名的旧文件路径 `gangos.yml` / `gangos-overview.json`，属过期路径引用）
- `...\docs\operations\02-告警手册.md:65,69,70,71,72,73,74,75,76,77`（10；9 个 `Gangos*` 告警名 + L65 旧路径）
- 合计 docs 49 行。

### 4.2 非 §6 占位域名 / 镜像路径 / 内部 UID（真实口径待 A4/收口决策）

**A4：**
- Grafana 数据源 UID：`...\deploy\grafana\provisioning\datasources\datasource.yml:17,32,38`（`jianlan-prometheus`、`jianlan-jaeger`）；`jlmedaios-overview.json` 36 处 `jianlan-prometheus`；`jlmedaios-infra.json` 26 处。
- `...\deploy\k8s\20-bff.yaml:61` `registry.jianlan.tech/jianlan/backend:0.1.0`；`...\deploy\k8s\21-web.yaml:52` `.../jianlan/web:0.1.0`
- `...\deploy\helm\jlmedaios\values.yaml:31,37,42`；`...\deploy\helm\jlmedaios\README.md:81`
- `...\deploy\postgres\README.md:54,57`（`POSTGRES_DB=jianlan_os`；备份文件名 `jianlan-YYYYmmdd-HHMMSS.dump`）
- `...\deploy\nginx\edge-entrypoint.sh:29` 证书 O=`Jianlan Tech (DEV ONLY)`
- `...\deploy\observability\Dockerfile.jaeger:12`、`...\deploy\nginx\Dockerfile:11,16` 注释命令占位 registry host
- `docker-compose.yml:48,105,147,319,588` 镜像路径已为 `registry.jianlan.tech/jlmedaios/*`，仅 registry host 占位；`.env.compose.example:23` 同。

**A1-docs 归属内（23 行 / 8 文件）：**
- `...\docs\01-快速上手.md:25,26` —— `git.jianlan.tech/medical/jianlan-medical-agent.git` 占位 URL + 目录名
- `...\docs\engineering\开发环境搭建.md:17,18` —— 同上
- `...\docs\deployment\02-部署步骤.md:119,120,137,141,143,150` —— 占位 URL、目录、systemd unit `jianlan-agent`、路径 `/opt/jianlan-medical-agent`
- `...\docs\deployment\03-容器化部署.md:75,78,80,96,98,112,121,129,143,150` —— k8s/helm 资源名 `jianlan-agent`、chart 目录 `helm/jianlan-agent`
- `...\docs\architecture\03-开发指南.md:17,18,19,20,22,37,294,435,653,656,659` —— 工作区/仓库名 `jianlan-java` / `jianlan-python` / `jianlan-bff-web` / `jianlan-helm-charts` / `jianlan-contracts`
- `...\docs\operations\01-监控手册.md:88` —— 数据源 UID `jianlan-prometheus`
- `...\docs\operations\03-故障排查手册.md:32` —— systemd unit `jianlan-agent`
- `...\docs\technical\00-开发规范与代码规范.md:34` —— 目录 `jianlan-medical-agent/`

### 4.3 「数智」旧代称 backlog（§6 未禁；是否纳入第二轮品牌整改待收口决策；整仓 1226 行 / 963 文件，rg 已跳过 node_modules/.venv/coverage/dist/build/pgsql/pgdata）

| 归属桶 | 行数 | 文件数 | 备注 |
|---|---|---|---|
| A3 `src/` | 491 | 382 | |
| A3 `tests/` | 95 | 94 | |
| A2 `web/src/` | 278 | 252 | |
| web 其余（`web/tests`、`web/docs`、web 根配置等） | 51 | 49 | 归属待收口判定 |
| A1 `docs/` | 222 | 125 | 其中 `docs/api` 58 行/56 文件；`docs/technical` 70 行；`docs/operations` 8 行展示串；其余 architecture/engineering/deployment 等 |
| A4 `deploy/` | 15 | 8 | |
| A4 `README.md` | 1 | 1 | |
| 未分配 `verification-report/` | 32 | 18 | |
| 未分配 `scripts/` | 14 | 10 | |
| `reports/` | 6 | 5 | 含豁免规则句所在文件，需甄别后再改 |
| 未分配 `config/` | 6 | 6 | |
| 未分配 `examples/` | 5 | 5 | |
| 未分配 `artifacts/` | 2 | 2 | |
| 根散文件 | 8 | 7 | `bunfig.toml` 2、`build.ts` 2、`fix-server.ts` 1、`CHANGELOG.md` 1、`eslint.config.js` 1、`RELEASE_NOTES_v0.1.0.md` 1 |

## 五、存疑项（无法确定替换口径，本轮未自行处置，待收口拍板）

1. `DEPLOYMENT.md:3` 非禁用旧称但非正式名：`jlmedaios · 健澜科技 AI 原生未来医院操作系统`；§8 归属 A1 但 §6 未列该描述口径，本轮未改；建议收口定是否替换为正式名。
2. `DEPLOYMENT.md:136` `APP_NAME` 默认值 `jianlan-medical-agent`（占位应用名，非 §6 token），未改，随第二轮占位口径统一。
3. `SECURITY.md:18` `security@jianlan.tech` 占位邮件域名（§6 仅要求标题前缀；待官网域名公布后替换）。
4. `review-4-business-cost.md:3` 替换后「健澜AI原生医院操作系统OS 开源医疗智能体操作系统」语义轻微重复（OS + 操作系统），当前可接受；是否精简待收口。
5. `docs\technical\00-开发规范与代码规范.md:122`「产品名称：健澜科技数智医院智能体」紧邻豁免规则句 L121，本轮未动；随第二轮数智整改一并处理。
6. `web\bun.lock:6` `name=jianlan-web`（未跟踪锁文件，非 §6 token；建议同步 `jlmedaios-web`，归属待收口判定）。
7. JSON 校验双工具结果差异：PS 5.1 `ConvertFrom-Json` 对 `web/package-lock.json`（376,383 字符）抛 `PSArgumentException: 无法处理参数，因为参数"name"的值无效`，系 PS 5.1 大锁文件解析引擎怪癖；Node `JSON.parse` 权威通过；`git diff` 仅 2 行 name 字段、结构未破坏。另两个 JSON 双工具均通过。
8. 根 `package-lock.json` 被 `.gitignore:64` 忽略、未跟踪；磁盘 L2/L8 残留 `jianlan-gang-os`，建议收口决定删除/重新生成或同步改名。
9. git 索引仍保留旧文件名（`deploy/grafana/dashboards/gangos-infra.json`、`gangos-overview.json`、`deploy/prometheus/rules/gangos.yml` 索引标记 D，工作区为 `jlmedaios-*` 未跟踪新文件）；索引清理归收口。
10. `docs\api\consult-agent-openapi.yaml`（未跟踪）标题 `consult-agent（AI 辅助问诊助手）BFF API`，无品牌旧称，未改动；`docs\api\` 其余 56 份文档的「数智」旧代称见 4.3。

## 六、边界声明

- 未触碰：`README.md`、`README_EN.md`、`src/**`、`web/src/**`、`tests/**`、`deploy/**`、`docker-compose.yml`、`docker-compose.prod.yml`、`.env*`、`services-java/**`、`services-python/**`、`services/**`、`miniprogram/**`。
- 已跟踪改动 20 个文件；未跟踪目录内改动 1 个文件（`docs/consult-agent/01-requirements.md`）；`DEPLOYMENT.md` 未改动。
- 未执行 `git add` / `git commit`；`git diff --cached --name-only` 输出为空。
