/**
 * 健澜科技 jlmedaios - 住院床日成本 V13 页（M317-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Composition {
  material: number;
  drug: number;
  exam: number;
  other: number;
}

interface Resp {
  dept: string;
  threshold: number;
  bedDayCost: number;
  composition: Composition;
  isAbnormal: boolean;
}

export default function InpatientBedDayCostPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/inpatient-bed-day-cost?dept=cardio");
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
        <Title level={3} style={{ color: VI.deep }}>住院床日成本</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title={`科室床日成本（${data.dept}）`} style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 32, color: VI.deep }}>¥{data.bedDayCost}</span>
              <Tag color={data.isAbnormal ? "red" : "green"} style={{ marginLeft: 16, fontSize: 16 }}>
                {data.isAbnormal ? "异常" : "正常"}
              </Tag>
              <span style={{ marginLeft: 16, color: "#999" }}>阈值 ¥{data.threshold}</span>
            </Card>
            <Card title="成本占比">
              <Statistic title="耗材" value={data.composition.material} suffix="%" style={{ marginRight: 24 }} />
              <Statistic title="药品" value={data.composition.drug} suffix="%" style={{ marginRight: 24 }} />
              <Statistic title="检查" value={data.composition.exam} suffix="%" style={{ marginRight: 24 }} />
              <Statistic title="其他" value={data.composition.other} suffix="%" />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
