/**
 * 健澜科技 jlmedaios - 质控指标钻取前端页（M484-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：钻取明细表（科室/指标值）+ 维度筛选下拉。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Select, Spin, Table, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Dimension {
  dept: string;
  value: number;
}

interface Drilldown {
  metricName: string;
  dimensions: Dimension[];
}

export default function EmrQcMetricDrilldownPage() {
  const [loading, setLoading] = useState(true);
  const [drilldown, setDrilldown] = useState<Drilldown | null>(null);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [dept, setDept] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const query = dept ? `?dept=${encodeURIComponent(dept)}` : "";
        const resp = await fetch(`/api/v1/emr-qc-metric-drilldown${query}`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) {
            setDrilldown(data?.drilldown ?? null);
            setDimensions(data?.dimensions ?? []);
          }
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dept]);

  const columns = [
    { title: "科室", dataIndex: "dept", key: "dept" },
    { title: "指标值", dataIndex: "value", key: "value" },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>{drilldown?.metricName ?? "质控指标钻取"}</Title>
        <Card style={{ marginBottom: 16 }}>
          <Select
            placeholder="按科室筛选"
            allowClear
            style={{ width: 200 }}
            onChange={(v) => { setDept(v); setLoading(true); }}
            options={[
              { value: "内科", label: "内科" },
              { value: "外科", label: "外科" },
              { value: "儿科", label: "儿科" },
            ]}
          />
        </Card>
        <Spin spinning={loading}>
          <Card headStyle={{ background: VI.mid, color: "#fff" }}>
            <Table dataSource={dimensions} columns={columns} rowKey="dept" pagination={false} />
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
