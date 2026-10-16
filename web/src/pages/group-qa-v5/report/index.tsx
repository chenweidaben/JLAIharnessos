/**
 * 健澜科技 jlmedaios - 集团质控与标准统一 V5 页（M273-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  timeRange: string;
  metrics: { unifiedComplianceRate: number; rectificationClosedLoop: number; crossCampusGap: number; bestPracticeReplication: number };
}

export default function GroupQAV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/group-qa-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>集团质控与标准统一 V5</Title>
        <Paragraph type="secondary">统一质控指标·医疗质量·护理·院感·药事 / 统一标准·临床路径·诊疗规范</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="统一达标率" value={`${data.metrics.unifiedComplianceRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="整改闭环率" value={`${data.metrics.rectificationClosedLoop}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="跨院区差异" value={`${data.metrics.crossCampusGap}分`} /></Card></Col>
            <Col span={6}><Card><Statistic title="最佳实践复制" value={data.metrics.bestPracticeReplication} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
