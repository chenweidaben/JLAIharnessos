/**
 * 健澜科技 jlmedaios - 智能体采纳率反馈看板 V12 页（M294-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Table, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Row {
  ruleId: string;
  suggestCount: number;
  adoptCount: number;
  correctCount: number;
  rejectCount: number;
  adoptionRate: number;
  autoDowngrade: boolean;
}

interface Board {
  ruleId: string;
  rows: Row[];
  totalSuggestions: number;
  totalAdopt: number;
  overallAdoptionRate: number;
}

export default function AgentAdoptionPage() {
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<Board | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Board>("/api/v1/agent-adoption-board");
        if (!cancelled) setBoard(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>智能体采纳率看板</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && board && (
          <>
            <Row gutter={16}>
              <Col span={6}><Card><Statistic title="总建议" value={board.totalSuggestions} /></Card></Col>
              <Col span={6}><Card><Statistic title="总采纳" value={board.totalAdopt} /></Card></Col>
              <Col span={6}><Card><Statistic title="整体采纳率" value={`${board.overallAdoptionRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="规则数" value={board.rows.length} /></Card></Col>
            </Row>
            <Card title="规则采纳率明细" style={{ marginTop: 16 }}>
              <Table
                rowKey="ruleId"
                dataSource={board.rows}
                pagination={false}
                columns={[
                  { title: "规则", dataIndex: "ruleId" },
                  { title: "建议数", dataIndex: "suggestCount" },
                  { title: "采纳", dataIndex: "adoptCount" },
                  { title: "修正", dataIndex: "correctCount" },
                  { title: "拒绝", dataIndex: "rejectCount" },
                  {
                    title: "采纳率",
                    dataIndex: "adoptionRate",
                    render: (v: number, r: Row) => (
                      <Tag color={r.autoDowngrade ? "red" : "green"}>{v}%</Tag>
                    ),
                  },
                  {
                    title: "状态",
                    dataIndex: "autoDowngrade",
                    render: (v: boolean) => (v ? <Tag color="red">需复训</Tag> : <Tag color="green">正常</Tag>),
                  },
                ]}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
