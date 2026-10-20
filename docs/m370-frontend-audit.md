# M370 全量前端审计 + M371 tsc 历史债务清理报告（2026-10-20）

## 一、交付物
- M368 FHIR 扩展资源 6 页（coverage/claim/account/questionnaire/communication/documentreference）
- M369 签名验证 + 签名模板 + 审计追踪 3 页
- M371 tsc 历史债务清理：365 → 0 错误 ✅

## 二、页面总量
| 维度 | 数量 |
|------|------|
| web/src/pages 下 index.tsx 总数 | 2427 |
| 累计真实 API 页面对接 | 532 |
| DEMO 页面 | 4 |
| web/src/router/index.tsx | 8477+ 行（M371 注入 235 条 lazy 后扩展） |
| lazy import 计数 | 1943 + 235 = 2178 |

## 三、近批次（M343~M369）模板合规度（33/33）
- PageContainer 包裹：100%
- Spin loading：100%
- Alert error：100%
- Empty 占位：100%
- usePageTitle：100%

## 四、tsc 双零验证（M371 清理后）
- 命令：bun x tsc --noEmit（web 目录）
- **退出码：0 ✅**
- 错误总数：0

### 清理动作清单
1. router/index.tsx 自动注入 235 条缺失 lazy import（脚本扫描所有 `<Route path="X" element={<YPage />} />`，对未声明的 YPage 按 path 自动生成 `const YPage = lazy(() => import('@/pages/X'));`）
2. 删除 6 条重复 const 声明：
   - `OrderDetailPage`（order/detail 重复）
   - `EmrSignaturePage`（emr/signature 与 emr-signature 两种路径重复）
   - `EmrQualityTrendPage`（emr/quality-trend 与 emr-quality-trend 两种路径重复）
3. 修正大小写：`FhirAllergyIntolerancePage` → `FhirAllergyintolerancePage` 对齐已有 lazy
4. 修复 4 个 DEMO 页面未使用 setError：dental/treatments、dermatology/records、psychiatry/assessments、tcm/diagnosis
5. 修复 4 个未使用 import：events/metrics (Descriptions)、outpatient/queue (Descriptions)、tenants/switch (List)、workflow/nurse (Tag)
6. 修复 2 个 rowKey 回调签名类型错误：hr/leave、infection/daily-report

## 五、FHIR 18 资源全覆盖
M343 (6) + M344 (6) + M368 (6) = 18 个 FHIR 资源页面对接真实 Bundle API。

## 六、累计页面数
- 真实 API：532
- DEMO：4
- **总页面：536**
- tsc：0 错误 ✅