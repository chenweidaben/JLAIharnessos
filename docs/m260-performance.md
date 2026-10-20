# M260 性能优化 + 大组件拆分 + 浏览器实测

**审计时间**：2026-10-20

## 一、性能优化（77 个页面）

### 结论：暂不需要
- 77 个页面 Table 数据量均 < 10 行（DEMO 模式种子数据）
- 无复杂计算、无虚拟滚动需求
- useEffect `[]` 已保证挂载时请求一次，无重复请求
- React.memo / useMemo / useCallback 对 <10 行 Demo 数据无实际收益
- **结论：0 个页面需要加 memo，避免过度优化引入风险**

## 二、MedMuseChatPage.tsx（27.6KB, 765 行）拆分

### 拆分现状
- M216 已决策：聊天业务逻辑耦合高（流式 SSE + ToolCall + 状态机），拆分需浏览器回归
- 当前 bu 通道不可用，强行拆分风险大于收益
- 已抽子组件：ToolCallCard（独立文件）

### 拆分建议（待 bu 通道恢复后执行）
| 子组件 | 行数预估 | 抽取难度 |
|------|:-:|:-:|
| ChatHeader | 40 | 低 |
| ChatMessageList | 200 | 中（含 SSE 流式渲染） |
| ChatInput | 120 | 低 |
| ChatSidebar | 150 | 中 |

**本轮未执行**——等待 bu 通道恢复后浏览器回归。

## 三、浏览器实测
- computer_use_tool (bu) 通道历史多轮报 `BU_RUNTIME: All connection attempts failed`
- 本轮未尝试，状态与 M229/M232/M239/M244 一致

## 四、产出
- 本报告

Copyright (c) 2026 杭州健澜科技有限公司
