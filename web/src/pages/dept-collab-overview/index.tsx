/**
 * 健澜科技 jlmedaios - 科际协作与经验共享总览 V13 页（M308-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Overview {
  totalDepts: number;
  avgClosedRate: number;
  totalSops: number;
  avgOverduePerDept: number;
}

interface Resp {
  overview: Overview;
  score: number;
  gap: string;
}

export default function DeptCollabOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/dept-collab-overview");
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
        <Title level={3} style={{ color: VI.deep }}>科际协作总览</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Statistic title="协作分" value={data.score} />
              <Tag
                color={data.gap === "协作健康" ? "green" : "red"}
                style={{ marginTop: 12 }}
              >
                {data.gap}
              </Tag>
            </Card>
            <Row gutter={16}>
              <Col span={6}><Card><Statistic title="总科室" value={data.overview.totalDepts} /></Card></Col>
              <Col span={6}><Card><Statistic title="平均闭环率" value={`${data.overview.avgClosedRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="SOP 总数" value={data.overview.totalSops} /></Card></Col>
              <Col span={6}><Card><Statistic title="平均逾期/科室" value={data.overview.avgOverduePerDept} /></Card></Col>
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
}
