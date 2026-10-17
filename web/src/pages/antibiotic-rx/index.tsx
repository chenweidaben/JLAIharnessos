/**
 * 健澜科技 jlmedaios - 抗菌药物处方率 V13 页（M336-C）
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
  outpatientRxRate: number;
  inpatientUseRate: number;
  typeIPreventiveRate: number;
}

export default function AntibioticRxPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/antibiotic-rx");
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
        <Title level={3} style={{ color: VI.deep }}>抗菌药物处方率</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="门诊处方率" value={data.outpatientRxRate} suffix="%" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="住院使用率" value={data.inpatientUseRate} suffix="%" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="Ⅰ类切口预防使用率" value={data.typeIPreventiveRate} suffix="%" />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
