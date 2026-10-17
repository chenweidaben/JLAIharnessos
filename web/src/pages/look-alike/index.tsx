/**
 * 健澜科技 jlmedaios - 相似医生协同推荐 V13 页（M303-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface LookAlike {
  doctorId: string;
  similarity: number;
}

interface Resp {
  targetDoctorId: string;
  lookAlikes: LookAlike[];
  borrowedVector: number[];
}

export default function LookAlikePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/look-alike?doctorId=dr-wang");
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
        <Title level={3} style={{ color: VI.deep }}>相似医生推荐</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title={`目标医生：${data.targetDoctorId}`} style={{ marginBottom: 16 }}>
              <List
                dataSource={data.lookAlikes}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta title={it.doctorId} description={`相似度 ${it.similarity}`} />
                    <Tag color={it.similarity > 0 ? "green" : "red"}>
                      {it.similarity > 0 ? "相似" : "相反"}
                    </Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="冷启动借偏好向量">
              <Tag color="blue">{data.borrowedVector.join(", ")}</Tag>
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
