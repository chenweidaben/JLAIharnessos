/**
 * 健澜科技 jlmedaios - 灾备与高可用 V5 页（M286-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface PlanRow {
  system: string;
  rpoMinutes: number;
  rtoMinutes: number;
  backupFreqMinutes: number;
  backupCheck: { fresh: boolean; ageMinutes: number };
}

interface Result {
  report: { totalSystems: number; healthyCount: number; gradeA: number };
  plans: PlanRow[];
}

export default function OpsDrPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/ops-dr");
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
        <Title level={3} style={{ color: VI.deep }}>灾备与高可用</Title>
        <Paragraph type="secondary">备份新鲜度·RPO/RTO达标·演练记录</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16}>
              <Col span={8}><Card><Statistic title="系统数" value={data.report.totalSystems} /></Card></Col>
              <Col span={8}><Card><Statistic title="备份健康" value={data.report.healthyCount} /></Card></Col>
              <Col span={8}><Card><Statistic title="A级系统" value={data.report.gradeA} /></Card></Col>
            </Row>
            <Card title="灾备计划" style={{ marginTop: 16 }}>
              <List
                dataSource={data.plans}
                renderItem={(p) => (
                  <List.Item>
                    <List.Item.Meta
                      title={p.system}
                      description={`RPO=${p.rpoMinutes}min RTO=${p.rtoMinutes}min 上次备份=${p.backupCheck.ageMinutes}min前`}
                    />
                    <Tag color={p.backupCheck.fresh ? "green" : "red"}>
                      {p.backupCheck.fresh ? "新鲜" : "过期"}
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
