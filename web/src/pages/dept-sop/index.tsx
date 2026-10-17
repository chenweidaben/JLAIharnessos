/**
 * 健澜科技 jlmedaios - 科室经验 SOP 沉淀 V13 页（M308-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Sop {
  sopId: string;
  title: string;
  dept: string;
  actions: string[];
  scenario: string;
  usageCount: number;
}

interface Resp {
  dept: string;
  library: Sop[];
}

export default function DeptSopPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/dept-sop?dept=cardio");
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
        <Title level={3} style={{ color: VI.deep }}>科室 SOP 库</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Card title={`${data.dept} 科室 SOP（按使用率降序）`}>
            <List
              dataSource={data.library}
              renderItem={(it, idx) => (
                <List.Item>
                  <List.Item.Meta
                    title={`#${idx + 1} ${it.title}`}
                    description={`适用：${it.scenario} · 动作：${it.actions.join("、")}`}
                  />
                  <Tag color="blue">使用 {it.usageCount} 次</Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
