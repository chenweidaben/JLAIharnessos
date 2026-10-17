/**
 * 健澜科技 jlmedaios - 疗效证据反哺规则权重 V13 页（M300-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Progress, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Rule {
  experienceId: string;
  baseWeight: number;
  adjustedWeight: number;
  evidenceLevel: "strong" | "moderate" | "weak" | "inconclusive" | "reverse";
}

const strengthColor: Record<string, string> = {
  strong: "green",
  moderate: "blue",
  weak: "orange",
  reverse: "red",
};

export default function EvidenceRulesPage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Rule[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Rule[]>("/api/v1/evidence-rules");
        if (!cancelled) setList(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>证据驱动规则</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <Card title="仅含证据支撑的规则（已剔除 inconclusive）">
            <List
              dataSource={list}
              renderItem={(it) => (
                <List.Item>
                  <List.Item.Meta
                    title={it.experienceId}
                    description={
                      <Progress
                        percent={Math.round(it.adjustedWeight * 100)}
                        size="small"
                        style={{ maxWidth: 300 }}
                      />
                    }
                  />
                  <Tag color={strengthColor[it.evidenceLevel]}>{it.evidenceLevel}</Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
