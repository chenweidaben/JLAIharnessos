/**
 * 健澜科技 jlmedaios - 院感暴发早期预警 V13 页（M313-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Table, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Cell {
  dept: string;
  pathogen: string;
  count: number;
  isOutbreak: boolean;
}

interface Outbreak {
  dept: string;
  pathogen: string;
  count: number;
}

interface Resp {
  threshold: number;
  outbreaks: Outbreak[];
  matrix: Cell[];
}

export default function InfectionOutbreakPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/infection-outbreak?threshold=3");
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
        <Title level={3} style={{ color: VI.deep }}>院感暴发早期预警</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="暴发单元格（红牌）" style={{ marginBottom: 16 }}>
              {data.outbreaks.map((o) => (
                <Tag key={`${o.dept}-${o.pathogen}`} color="red" style={{ margin: 4 }}>
                  {o.dept} × {o.pathogen} · {o.count} 例
                </Tag>
              ))}
            </Card>
            <Card title="科室×病原矩阵">
              <Table
                rowKey={(r) => `${r.dept}-${r.pathogen}`}
                pagination={false}
                dataSource={data.matrix}
                columns={[
                  { title: "科室", dataIndex: "dept" },
                  { title: "病原", dataIndex: "pathogen" },
                  { title: "例数", dataIndex: "count" },
                  {
                    title: "状态",
                    dataIndex: "isOutbreak",
                    render: (isOb: boolean) =>
                      isOb ? <Tag color="red">暴发</Tag> : <Tag color="default">正常</Tag>,
                  },
                ]}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
