/**
 * 健澜科技 jlmedaios - 六维指标明细下钻 V13 页（M306-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Sub {
  label: string;
  value: number;
}

interface DeptRank {
  deptId: string;
  score: number;
}

interface Resp {
  dimension: string;
  value: number;
  subMetrics: Sub[];
  deptRanking: DeptRank[];
  benchmark: string;
}

export default function FlywheelDrilldownPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/flywheel-drilldown?dimension=qualityScore");
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
        <Title level={3} style={{ color: VI.deep }}>六维明细下钻</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title={`维度：${data.dimension}（值 ${data.value}）`} style={{ marginBottom: 16 }}>
              <Tag color={data.benchmark === "above" ? "green" : data.benchmark === "below" ? "red" : "default"}>
                行业对标：{data.benchmark}
              </Tag>
              <List
                dataSource={data.subMetrics}
                renderItem={(it) => (
                  <List.Item>
                    <span>{it.label}</span><span>{it.value}</span>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="科室对比（降序）">
              <List
                dataSource={data.deptRanking}
                renderItem={(it, idx) => (
                  <List.Item>
                    <span>#{idx + 1} {it.deptId}</span><Tag color="blue">{it.score}</Tag>
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
