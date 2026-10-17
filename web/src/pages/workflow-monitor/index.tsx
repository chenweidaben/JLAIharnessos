/**
 * 健澜科技 jlmedaios - 流程监控与效率分析 V6 页（M288-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Overview {
  totalInstances: number;
  avgMinutes: number;
  totalOverdue: number;
  totalApproved: number;
  totalRejected: number;
  gradeA: number;
}

interface PerDef {
  defId: string;
  instanceCnt: number;
  avgMinutes: number;
  overdueCnt: number;
  approvalCnt: number;
  rejectCnt: number;
  efficiency: {
    passRatePct: number;
    overdueRatePct: number;
    efficiencyScore: number;
    grade: "green" | "yellow" | "red";
  };
}

interface Result {
  overview: Overview;
  perDef: PerDef[];
}

export default function WorkflowMonitorPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/workflow/monitor");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>流程监控与效率</Title>
        <Paragraph type="secondary">平均耗时·超时率·通过率·红黄绿灯</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!data || loading ? null : (
          <>
            <Row gutter={16}>
              <Col span={6}><Card><Statistic title="总实例" value={data.overview.totalInstances} /></Card></Col>
              <Col span={6}><Card><Statistic title="平均耗时" value={`${data.overview.avgMinutes}分钟`} /></Card></Col>
              <Col span={6}><Card><Statistic title="超时数" value={data.overview.totalOverdue} /></Card></Col>
              <Col span={6}><Card><Statistic title="A级流程" value={data.overview.gradeA} /></Card></Col>
            </Row>
            <Card title="各流程效率" style={{ marginTop: 16 }}>
              <List
                dataSource={data.perDef}
                renderItem={(d) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`${d.defId} (实例=${d.instanceCnt})`}
                      description={`通过率=${d.efficiency.passRatePct}% 超时率=${d.efficiency.overdueRatePct}% 效率分=${d.efficiency.efficiencyScore}`}
                    />
                    <Tag color={d.efficiency.grade === "green" ? "green" : d.efficiency.grade === "yellow" ? "orange" : "red"}>
                      {d.efficiency.grade}
                    </Tag>
                  </List.Item>
                )}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
