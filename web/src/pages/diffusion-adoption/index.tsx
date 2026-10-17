/**
 * 健澜科技 jlmedaios - 跨科室采纳反馈 V13 页（M304-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Tracked {
  experienceId: string;
  deptId: string;
  action: string;
  tracked: boolean;
}

interface Resp {
  tracked: Tracked[];
  adoptionRate: number;
  failureHint: string;
}

export default function DiffusionAdoptionPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/diffusion-adoption?experienceId=e-1");
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
        <Title level={3} style={{ color: VI.deep }}>跨科室采纳反馈</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Statistic title="扩散采纳率" value={data.adoptionRate} suffix="%" />
              {data.failureHint
                ? <Tag color="red" style={{ marginTop: 12 }}>{data.failureHint}</Tag>
                : <Tag color="green" style={{ marginTop: 12 }}>扩散效果良好</Tag>}
            </Card>
            <Card title="各科室采纳状态">
              <List
                dataSource={data.tracked}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta title={it.deptId} />
                    <Tag color={it.action === "adopted" ? "green" : it.action === "modified" ? "blue" : "red"}>
                      {it.action}
                    </Tag>
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
