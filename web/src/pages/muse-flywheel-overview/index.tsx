/**
 * 健澜科技 jlmedaios - 五角色 MUSE 飞轮总览 V13 页（M321-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface RoleItem {
  role: string;
  callCount: number;
  hitRate: number;
  adoptionRate: number;
}

interface Resp {
  roleComparison: RoleItem[];
  totalCalls: number;
  leadingRole: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  doctor: "医生",
  nurse: "护士",
  pharmacist: "药师",
  admin: "行政",
  patient: "患者",
};

export default function MuseFlywheelOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/muse-flywheel-overview");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>五角色 MUSE 飞轮总览</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Statistic title="总调用量" value={data.totalCalls} style={{ marginRight: 48 }} />
              {data.leadingRole && (
                <Tag color="gold" style={{ fontSize: 14, padding: "4px 12px" }}>
                  领先角色：{ROLE_LABEL[data.leadingRole] ?? data.leadingRole}
                </Tag>
              )}
            </Card>
            <Row gutter={16}>
              {data.roleComparison.map((r) => (
                <Col span={Math.floor(24 / data.roleComparison.length)} key={r.role}>
                  <Card title={ROLE_LABEL[r.role] ?? r.role}>
                    <Statistic title="调用量" value={r.callCount} />
                    <Statistic title="命中率" value={r.hitRate} suffix="%" style={{ marginTop: 12 }} />
                    <Statistic title="采纳率" value={r.adoptionRate} suffix="%" style={{ marginTop: 12 }} />
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
}
