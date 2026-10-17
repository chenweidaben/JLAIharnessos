/**
 * 健澜科技 jlmedaios - 用药知识沉淀与反馈学习 V7 页（M289-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface SuggestionRow {
  ruleId: string;
  hitCnt: number;
  overrideCnt: number;
  adherenceRatePct: number;
  suggestion: string;
  light: "red" | "yellow" | "green";
}

export default function CdsLearningPage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<SuggestionRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<SuggestionRow[]>("/api/v1/cds/suggestions");
        if (!cancelled) setList(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>CDS 反馈学习</Title>
        <Paragraph type="secondary">规则遵守率·弱规则改进建议</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <Card title="规则建议（红黄绿）">
            <List
              dataSource={list}
              renderItem={(r) => (
                <List.Item>
                  <List.Item.Meta
                    title={`${r.ruleId}（命中=${r.hitCnt} override=${r.overrideCnt}）`}
                    description={`遵守率=${r.adherenceRatePct}% · ${r.suggestion}`}
                  />
                  <Tag color={r.light === "red" ? "red" : r.light === "yellow" ? "orange" : "green"}>
                    {r.suggestion}
                  </Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
