/**
 * 健澜科技 jlmedaios - 病历质控科室自查前端页（M474-B，V14，EMR 深化四模块）
 *
 * v5.0试点扩展（M184空壳崩溃修复）：
 *  - 原页面仅有 5 项自查 checkbox（半壳）；现补 4 张统计卡片
 *    （检查项/已通过/自查得分/待整改）+ 科室自查记录表（6 行 demo 数据）。
 *
 * 深海蓝VI：自查表单（检查项 checkbox 列表）+ 得分实时显示。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useMemo, useState } from "react";
import { Button, Card, Checkbox, Col, Layout, List, Progress, Row, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface SelfCheckItem {
  name: string;
  passed: boolean;
}

const defaultItems: SelfCheckItem[] = [
  { name: "主诉完整", passed: false },
  { name: "现病史规范", passed: false },
  { name: "诊断明确", passed: false },
  { name: "既往史完整", passed: false },
  { name: "体格检查记录", passed: false },
  { name: "病程记录及时", passed: false },
  { name: "签名完整", passed: false },
];

/** v5.0试点扩展（M184空壳崩溃修复）：科室自查记录 demo 数据 */
interface DeptCheckRecord {
  key: string;
  dept: string;
  checker: string;
  score: number;
  defects: number;
  rectified: number;
  date: string;
}

const DEPT_RECORDS: DeptCheckRecord[] = [
  { key: "1", dept: "心内科", checker: "陈维", score: 92, defects: 3, rectified: 3, date: "2026-10-18" },
  { key: "2", dept: "普外科", checker: "李敏", score: 85, defects: 6, rectified: 4, date: "2026-10-18" },
  { key: "3", dept: "呼吸内科", checker: "王芳", score: 78, defects: 9, rectified: 5, date: "2026-10-17" },
  { key: "4", dept: "神经内科", checker: "赵强", score: 88, defects: 4, rectified: 4, date: "2026-10-17" },
  { key: "5", dept: "骨科", checker: "陈维", score: 81, defects: 7, rectified: 4, date: "2026-10-16" },
  { key: "6", dept: "儿科", checker: "李敏", score: 90, defects: 2, rectified: 2, date: "2026-10-16" },
];

const recordColumns: ColumnsType<DeptCheckRecord> = [
  { title: "科室", dataIndex: "dept", width: 120 },
  { title: "自查人", dataIndex: "checker", width: 100 },
  {
    title: "自查得分",
    dataIndex: "score",
    width: 180,
    render: (v: number) => (
      <Progress percent={v} size="small" style={{ width: 120 }} strokeColor={v >= 90 ? "#52C41A" : v >= 80 ? "#4A90D9" : "#FA8C16"} />
    ),
  },
  { title: "缺陷数", dataIndex: "defects", width: 90 },
  { title: "已整改", dataIndex: "rectified", width: 90 },
  {
    title: "整改率",
    key: "rate",
    width: 100,
    render: (_, r) => {
      const rate = r.defects === 0 ? 100 : Math.round((r.rectified / r.defects) * 100);
      return <Tag color={rate >= 100 ? "success" : rate >= 60 ? "processing" : "warning"}>{rate}%</Tag>;
    },
  },
  { title: "自查日期", dataIndex: "date", width: 120 },
];

export default function EmrDeptSelfCheckPage() {
  const [items, setItems] = useState<SelfCheckItem[]>(defaultItems);

  const passedCount = items.filter((i) => i.passed).length;
  const score = items.length === 0 ? 0 : Math.round((passedCount / items.length) * 100);

  const stats = useMemo(
    () => ({
      total: DEPT_RECORDS.reduce((s, r) => s + r.defects, 0),
      rectified: DEPT_RECORDS.reduce((s, r) => s + r.rectified, 0),
      avgScore: Math.round(DEPT_RECORDS.reduce((s, r) => s + r.score, 0) / DEPT_RECORDS.length),
    }),
    [],
  );

  const toggle = (index: number) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, passed: !item.passed } : item)));
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控科室自查</Title>
        <Paragraph type="secondary" style={{ marginTop: -8 }}>
          科室按病历书写规范逐项自查，得分实时计算；下方汇总各科室近期自查与整改进展。
        </Paragraph>

        {/* v5.0试点扩展（M184空壳崩溃修复）：统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} md={6}>
            <Card><Statistic title="应查项" value={items.length} suffix="项" /></Card>
          </Col>
          <Col xs={12} md={6}>
            <Card><Statistic title="已通过" value={passedCount} valueStyle={{ color: "#52C41A" }} /></Card>
          </Col>
          <Col xs={12} md={6}>
            <Card><Statistic title="全院平均得分" value={stats.avgScore} suffix="分" valueStyle={{ color: VI.accent }} /></Card>
          </Col>
          <Col xs={12} md={6}>
            <Card><Statistic title="累计缺陷/已整改" value={`${stats.total}/${stats.rectified}`} valueStyle={{ color: "#FA8C16" }} /></Card>
          </Col>
        </Row>

        <Card style={{ marginBottom: 16 }}>
          <Text strong>当前自查得分：</Text>
          <Title level={2} style={{ color: VI.accent, margin: 0, display: "inline-block", marginLeft: 12 }}>
            {score}
          </Title>
          <Text type="secondary" style={{ marginLeft: 8 }}>/ 100</Text>
        </Card>
        <Row gutter={16}>
          <Col xs={24} md={10}>
            <Card title="本科室检查项列表" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
              <List
                dataSource={items}
                renderItem={(item: SelfCheckItem, index: number) => (
                  <List.Item>
                    <Checkbox checked={item.passed} onChange={() => toggle(index)}>
                      {item.name}
                    </Checkbox>
                  </List.Item>
                )}
              />
              <Button type="primary" style={{ marginTop: 16, background: VI.accent }}>提交自查</Button>
            </Card>
          </Col>
          <Col xs={24} md={14}>
            <Card title="各科室近期自查记录" headStyle={{ background: VI.mid, color: "#fff" }}>
              <Table<DeptCheckRecord>
                rowKey="key"
                columns={recordColumns}
                dataSource={DEPT_RECORDS}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
