/**
 * 健澜科技 jlmedaios - 跨科协作任务经验双沉淀 V13 页（M309-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Sample {
  taskId: string;
  title: string;
  writtenTo: string[];
  sedimentCount: number;
}

interface Resp {
  dualCount: number;
  totalTasks: number;
  learningScore: number;
  samples: Sample[];
}

export default function CrossDeptLearningPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/cross-dept-learning?dept=cardio");
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
        <Title level={3} style={{ color: VI.deep }}>跨科学习分</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Statistic title="跨科学习分" value={`${data.learningScore}%`} />
              <Tag color="blue" style={{ marginTop: 12 }}>
                双沉淀 {data.dualCount} / 总任务 {data.totalTasks}
              </Tag>
            </Card>
            <Card title="双沉淀任务样例">
              <List
                dataSource={data.samples}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta
                      title={it.title}
                      description={`写入：${it.writtenTo.join(" + ")}`}
                    />
                    <Tag color="green">沉淀 {it.sedimentCount} 个科室</Tag>
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
