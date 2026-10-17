/**
 * 健澜科技 jlmedaios - 区域健康数据汇总 V13 页（M324-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface HospitalVolumeItem {
  hospitalId: string;
  hospitalName: string;
  volume: number;
}

interface Resp {
  outpatientComparison: HospitalVolumeItem[];
  inpatientComparison: HospitalVolumeItem[];
  examComparison: HospitalVolumeItem[];
}

const columns: ColumnsType<HospitalVolumeItem> = [
  { title: "排名", key: "rank", render: (_, __, index) => index + 1 },
  { title: "医疗机构", dataIndex: "hospitalName", key: "hospitalName" },
  { title: "门诊量", dataIndex: "volume", key: "volume" },
];

export default function RegionalHealthDataPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/regional-health-data");
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
        <Title level={3} style={{ color: VI.deep }}>区域健康数据汇总</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="门诊量对比（降序）" style={{ marginBottom: 16 }}>
              <Table columns={columns} dataSource={data.outpatientComparison} rowKey="hospitalId" pagination={false} />
            </Card>
            <Card title="住院量对比（降序）" style={{ marginBottom: 16 }}>
              <Table columns={columns} dataSource={data.inpatientComparison} rowKey="hospitalId" pagination={false} />
            </Card>
            <Card title="检查量对比（降序）">
              <Table columns={columns} dataSource={data.examComparison} rowKey="hospitalId" pagination={false} />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
