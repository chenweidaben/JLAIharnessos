/**
 * 健澜科技 jlmedaios - 抗菌药物使用质量管理 V13 页（M440-B，药事管理与药学服务组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Resp {
  antibioticUseDdds: number;
  antibioticUseOutpatientRate: number;
  antibioticUseInpatientRate: number;
}

export default function AntibioticUseQualityPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/antibiotic-use-quality");
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
        <Title level={3} style={{ color: VI.deep }}>抗菌药物使用质量管理</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="抗菌药物使用强度" value={data.antibioticUseDdds} suffix="DDDs/100人天" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="门诊抗菌药物使用率（越低越好）" value={data.antibioticUseOutpatientRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="住院抗菌药物使用率（越低越好）" value={data.antibioticUseInpatientRate} suffix="%" precision={2} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
