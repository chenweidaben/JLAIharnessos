# 归档说明：病历版本对比 v1 未挂载三件套（2026-10-25 收口归档）

## 归档内容
- `pages/index.tsx`：未挂载的 v1 病历版本对比页面（原路径 `web/src/pages/clinical/medical-record-version-compare/index.tsx`）。
- `services-api/medicalRecordVersionCompare.ts`：v1 接口层（原 `web/src/services/api/medicalRecordVersionCompare.ts`）。
- `store/medicalRecordVersionCompareStore.ts`：v1 zustand 状态层（原 `web/src/store/medicalRecordVersionCompareStore.ts`）。

## 归档原因
- 路由权威链路为 M628 v2：`web/src/router/index.tsx:3264` lazy 导入 `@/pages/clinical/medical-record-version-compare-v2`，挂载于 `:5068`（路径 `clinical/medical-record-version-compare-v2`）；其依赖 `medicalRecordVersionCompareV2M628Store` 与 `services/api/medicalRecordVersionCompareV2M628` 均已跟踪入库。
- 本目录 v1 三件套仅互相引用，`web/src` 内无其他页面或路由消费，属自闭合孤儿链；本轮收口未删除源码，整体移至本归档目录保留，供下一轮业务口径决策是否合并回主线。
- 归档副本内的 `@/...` 导入路径保持原样以留存证据，不参与 `web/` 类型检查与构建。

## 处置边界
- 未改动 v2 权威页面、接口层与状态层；未删除任何已跟踪源码。
- 若后续决定启用 v1 功能，需先与 v2M628 链路做去重与权限码对齐，再迁回 `web/src/` 并在路由表注册。
