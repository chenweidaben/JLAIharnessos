/**
 * 健澜科技 jlmedaios - 通用表单引擎 V6 页（M288-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Schema {
  name: string;
  fields: { key: string; label: string; type: string; required: boolean }[];
  requiredKeys: string[];
  fieldCount: number;
}

interface TplRow {
  id: string;
  name: string;
  version: string;
  schema: Schema;
}

interface SubmissionSummary {
  total: number;
  validCount: number;
}

export default function FormEnginePage() {
  const [loading, setLoading] = useState(true);
  const [tpls, setTpls] = useState<TplRow[]>([]);
  const [summary, setSummary] = useState<SubmissionSummary | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [t, s] = await Promise.all([
          get<TplRow[]>("/api/v1/form/templates"),
          get<SubmissionSummary>("/api/v1/form/submissions"),
        ]);
        if (!cancelled) {
          setTpls(t);
          setSummary(s);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>通用表单引擎</Title>
        <Paragraph type="secondary">动态 schema·校验·预填</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <>
            <Row gutter={16}>
              <Col span={8}><Card><Statistic title="模板数" value={tpls.length} /></Card></Col>
              <Col span={8}><Card><Statistic title="提交总数" value={summary?.total ?? 0} /></Card></Col>
              <Col span={8}><Card><Statistic title="有效提交" value={summary?.validCount ?? 0} /></Card></Col>
            </Row>
            <Card title="表单模板" style={{ marginTop: 16 }}>
              <List
                dataSource={tpls}
                renderItem={(t) => (
                  <List.Item>
                    <List.Item.Meta
                      title={t.name}
                      description={`字段数=${t.schema.fieldCount} 必填=${t.schema.requiredKeys.join(",")}`}
                    />
                    <Tag color="blue">{t.version}</Tag>
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
