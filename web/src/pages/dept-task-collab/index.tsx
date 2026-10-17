/**
 * 健澜科技 jlmedaios - 科室间任务协作总览 V13 页（M308-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Dep {
  dept: string;
  waitedByCount: number;
}

interface QueueTask {
  taskId: string;
  title: string;
  ownerDept: string;
  dependsOnDept: string;
  status: string;
  waitDays: number;
}

interface Resp {
  dependencies: Dep[];
  queue: QueueTask[];
  bottleneck: string;
}

export default function DeptTaskCollabPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/dept-task-collab");
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
        <Title level={3} style={{ color: VI.deep }}>科室间任务协作</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Tag color="orange" style={{ fontSize: 16 }}>
                瓶颈科室：{data.bottleneck}
              </Tag>
            </Card>
            <Card title="跨科依赖（按被等待次数）" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.dependencies}
                renderItem={(it) => (
                  <List.Item>
                    <span>{it.dept}</span>
                    <Tag color="red">被 {it.waitedByCount} 个任务等待</Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="协作请求队列（按等待天数 desc）">
              <List
                dataSource={data.queue}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta
                      title={it.title}
                      description={`${it.ownerDept} → 等待 ${it.dependsOnDept}`}
                    />
                    <Tag color="orange">等待 {it.waitDays} 天</Tag>
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
