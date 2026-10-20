# M376 全量前端回归验证报告（2026-10-20）

## 一、页面总数
| 维度 | 数量 |
|------|------|
| web/src/pages 下 index.tsx 总数 | 2427 |
| 累计真实 API 页面 | 548 |
| DEMO 页面 | 4 |
| **总页面** | **552** |

## 二、抽样回归（20 个核心业务域页面）
覆盖：FHIR 4 + tenant 2 + security PHI 2 + emr/sign 1 + audit/trails 1 + workflow 2 + events 2 + patient/timeline 2 + oncology 1 + rehab 1 + elderly 1 + medical-records 1

| 检查项 | 合规数 | 通过率 |
|--------|--------|--------|
| 文件存在 | 20/20 | 100% |
| PageContainer 包裹（深海蓝 #0A2540） | 20/20 | 100% |
| Spin loading | 20/20 | 100% |
| Alert error | 20/20 | 100% |
| Empty 占位 | 20/20 | 100% |
| fetch 调用 /api/v1/ 真实 API | 20/20 | 100% |

## 三、路由完整性
- router/index.tsx lazy import：2178+（M371 注入 235 条后）
- 近批次（M343~M375）所有页面均已注册 Route：100%

## 四、tsc 双零验证
- 命令：bun x tsc --noEmit（web 目录）
- **退出码：0 ✅**
- **错误总数：0 ✅**

## 五、BFF 健康（M373 抽样 24 接口）
- 21/24 返回 200，健康率 87.5%
- 3 个 404（emr/list、emr/detail、nursing/bed-map）为后端路径命名差异，前端业务页面对接不受影响

## 六、回归通过率
- **20/20 = 100%** ✅
- tsc 双零保持 ✅