/**
 * 健澜科技 jlmedaios - ICD 编码辅助推荐 V13 页（M315-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Recommend {
  mainCode: string;
  additionalCodes: string[];
}

interface Resp {
  diagnosis: string;
  recommendation: Recommend;
  hitRate: number;
  accuracy: number;
}

export default function IcdCodingAssistPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/icd-coding-assist?diagnosis=急性心肌梗死合并高血压");
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
        <Title level={3} style={{ color: VI.deep }}>ICD 编码辅助推荐</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="推荐结果" style={{ marginBottom: 16 }}>
              <p style={{ color: VI.deep }}>诊断：{data.diagnosis}</p>
              <List
                dataSource={[
                  { name: "主编码", code: data.recommendation.mainCode },
                  ...data.recommendation.additionalCodes.map((code) => ({ name: "附加编码", code })),
                ]}
                renderItem={(it) => (
                  <List.Item>
                    <Tag color={it.name === "主编码" ? "blue" : "default"}>{it.name}</Tag>
                    <span>{it.code}</span>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="统计">
              <Statistic title="命中率" value={data.hitRate} suffix="%" style={{ marginRight: 48 }} />
              <Statistic title="准确率" value={data.accuracy} suffix="%" />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
