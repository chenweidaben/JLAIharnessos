/**
 * 健澜科技 jlmedaios - 跨科室经验扩散 V13 页（M304-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Notice {
  experienceId: string;
  experienceTitle: string;
  targetDept: string;
  message: string;
}

interface Resp {
  experienceId: string;
  diffusionScore: number;
  candidateCount: number;
  notices: Notice[];
}

export default function CrossDeptBroadcastPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/cross-dept-broadcast?experienceId=e-1");
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
        <Title level={3} style={{ color: VI.deep }}>跨科室经验扩散</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Statistic title="扩散潜力分" value={data.diffusionScore} />
              <Tag color="blue" style={{ marginTop: 12 }}>建议扩散到 {data.candidateCount} 个科室</Tag>
            </Card>
            <Card title="待收录通知">
              <List
                dataSource={data.notices}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta title={it.targetDept} description={it.message} />
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
