/**
 * 健澜科技 jlmedaios - 临床研究项目 V13 页（M327-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Resp {
  activeProjects: number;
  totalFunding: number;
  publishedPapers: number;
  gcpCompliant: boolean;
}

export default function ClinicalResearchOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/clinical-research-overview");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>临床研究项目</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card>
                  <Statistic title="在研项目数" value={data.activeProjects} />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic title="经费总额" value={data.totalFunding} suffix="万元" />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic title="论文发表数" value={data.publishedPapers} />
                </Card>
              </Col>
            </Row>
            <Card>
              {data.gcpCompliant ? (
                <Tag color="green" style={{ fontSize: 14, padding: "4px 12px" }}>GCP 合规</Tag>
              ) : (
                <Tag color="red" style={{ fontSize: 14, padding: "4px 12px" }}>GCP 不合规</Tag>
              )}
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
