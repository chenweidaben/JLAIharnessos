/**
 * 健澜科技 jlmedaios - 病历质控数据导出中心前端页（M472-D，M472 收官，V14，EMR 深化四模块）
 *
 * v5.0试点扩展（M184空壳崩溃修复）：
 *  - 原页面 tasks 初始为空数组，进入即空白空壳；现播种 8 行 demo 导出任务，
 *    并补 4 张统计卡片（待处理/处理中/已完成/累计导出列数）。
 *
 * 深海蓝VI：导出任务列表（数据集/列数/状态徽章）+ 创建导出按钮。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useMemo, useState } from "react";
import { Button, Card, Col, Layout, Row, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

type ExportStatus = "pending" | "processing" | "completed";

interface ExportTask {
  id: string;
  dataset: string;
  columns: string[];
  status: ExportStatus;
  owner: string;
  createdAt: string;
  rows: number;
}

/** v5.0试点扩展（M184空壳崩溃修复）：初始 demo 导出任务，避免进入即空白 */
const DEMO_TASKS: ExportTask[] = [
  { id: "EXP-20261018-001", dataset: "出院病历质控", columns: ["病历号", "患者姓名", "科室", "诊断", "质控得分", "缺陷数"], status: "completed", owner: "陈维", createdAt: "2026-10-18 09:12", rows: 1240 },
  { id: "EXP-20261018-002", dataset: "运行病历抽查", columns: ["病历号", "主管医生", "病历类型", "在院天数"], status: "completed", owner: "李敏", createdAt: "2026-10-18 10:40", rows: 356 },
  { id: "EXP-20261019-001", dataset: "病案首页质控", columns: ["病历号", "主要诊断", "手术操作", "费用", "质控等级"], status: "processing", owner: "王芳", createdAt: "2026-10-19 08:05", rows: 892 },
  { id: "EXP-20261019-002", dataset: "死亡病历讨论", columns: ["病历号", "科室", "死亡原因", "讨论结论"], status: "pending", owner: "赵强", createdAt: "2026-10-19 09:30", rows: 48 },
  { id: "EXP-20261019-003", dataset: "手术病历质控", columns: ["病历号", "手术名称", "术者", "切口等级", "愈合情况"], status: "pending", owner: "陈维", createdAt: "2026-10-19 10:15", rows: 210 },
  { id: "EXP-20261019-004", dataset: "门诊病历质控", columns: ["就诊号", "科室", "诊断", "处方", "书写时限"], status: "processing", owner: "李敏", createdAt: "2026-10-19 11:02", rows: 1580 },
  { id: "EXP-20261019-005", dataset: "急诊病历质控", columns: ["就诊号", "分诊级别", "抢救记录", "留观时长"], status: "completed", owner: "王芳", createdAt: "2026-10-19 13:20", rows: 432 },
  { id: "EXP-20261019-006", dataset: "科室自查汇总", columns: ["科室", "自查得分", "缺陷数", "整改完成率"], status: "pending", owner: "赵强", createdAt: "2026-10-19 14:48", rows: 32 },
];

const STATUS_TAG: Record<ExportStatus, { color: string; text: string }> = {
  pending: { color: "orange", text: "待处理" },
  processing: { color: "blue", text: "处理中" },
  completed: { color: "green", text: "已完成" },
};

export default function EmrDataExportPage() {
  const [tasks, setTasks] = useState<ExportTask[]>(DEMO_TASKS);

  const handleCreate = () => {
    setTasks((prev) => [
      {
        id: `EXP-${Date.now().toString(36)}`,
        dataset: "病历",
        columns: ["病历号", "患者姓名", "科室", "诊断", "质控得分", "缺陷数"],
        status: "pending",
        owner: "当前用户",
        createdAt: new Date().toLocaleString("zh-CN"),
        rows: 0,
      },
      ...prev,
    ]);
  };

  const stats = useMemo(() => {
    const pending = tasks.filter((t) => t.status === "pending").length;
    const processing = tasks.filter((t) => t.status === "processing").length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const totalRows = tasks.reduce((sum, t) => sum + t.rows, 0);
    return { pending, processing, completed, totalRows };
  }, [tasks]);

  const columns: ColumnsType<ExportTask> = [
    { title: "任务编号", dataIndex: "id", width: 180 },
    { title: "数据集", dataIndex: "dataset", width: 140 },
    {
      title: "列数",
      dataIndex: "columns",
      width: 90,
      render: (cols: string[]) => `${cols?.length ?? 0} 列`,
    },
    { title: "导出行数", dataIndex: "rows", width: 100 },
    { title: "发起人", dataIndex: "owner", width: 90 },
    { title: "创建时间", dataIndex: "createdAt", width: 160 },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (s: ExportStatus) => (
        <Tag color={STATUS_TAG[s]?.color ?? "default"}>{STATUS_TAG[s]?.text ?? s}</Tag>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控数据导出中心</Title>
        <Paragraph type="secondary" style={{ marginTop: -8 }}>
          按数据集/列维度发起病历质控数据导出，任务状态全程可追踪。
        </Paragraph>

        {/* v5.0试点扩展（M184空壳崩溃修复）：统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} md={6}>
            <Card><Statistic title="待处理任务" value={stats.pending} valueStyle={{ color: "#FA8C16" }} /></Card>
          </Col>
          <Col xs={12} md={6}>
            <Card><Statistic title="处理中任务" value={stats.processing} valueStyle={{ color: VI.accent }} /></Card>
          </Col>
          <Col xs={12} md={6}>
            <Card><Statistic title="已完成任务" value={stats.completed} valueStyle={{ color: "#52C41A" }} /></Card>
          </Col>
          <Col xs={12} md={6}>
            <Card><Statistic title="累计导出行数" value={stats.totalRows} suffix="行" /></Card>
          </Col>
        </Row>

        <Card style={{ marginBottom: 16 }}>
          <Button type="primary" style={{ background: VI.accent }} onClick={handleCreate}>
            + 创建导出任务
          </Button>
        </Card>
        <Card title="导出任务列表" headStyle={{ background: VI.mid, color: "#fff" }}>
          <Table<ExportTask>
            rowKey="id"
            columns={columns}
            dataSource={tasks ?? []}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            size="middle"
          />
        </Card>
      </Content>
    </Layout>
  );
}
