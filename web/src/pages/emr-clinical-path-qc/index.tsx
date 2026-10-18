/**
 * 健澜科技 jlmedaios - 临床路径质控前端页（M480-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：路径步骤列表（计划 vs 实际）+ 变异步骤红色标记。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface PathStep {
  name: string;
  planned: string;
  actual: string;
}

interface Variation {
  stepName: string;
  variation: string;
}

export default function EmrClinicalPathQcPage() {
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<PathStep[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-clinical-path-qc?patientId=P001", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) {
            setSteps(data?.steps ?? []);
            setVariations(data?.variations ?? []);
          }
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const variationNames = new Set(variations.map((v) => v.stepName));

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>临床路径质控</Title>
        <Spin spinning={loading}>
          <Card title="路径步骤（计划 vs 实际）" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
            <List
              dataSource={steps}
              renderItem={(step: PathStep) => (
                <List.Item>
                  <Text strong style={{ width: 120 }}>{step.name}</Text>
                  <Text type="secondary" style={{ marginRight: 16 }}>计划：{step.planned}</Text>
                  <Text>实际：{step.actual}</Text>
                  {variationNames.has(step.name) && (
                    <Tag color="red" style={{ marginLeft: 16 }}>变异</Tag>
                  )}
                </List.Item>
              )}
            />
          </Card>
          <Card title={`变异记录（${variations.length} 条）`} headStyle={{ background: VI.mid, color: "#fff" }}>
            <List
              dataSource={variations}
              renderItem={(v: Variation) => (
                <List.Item>
                  <Tag color="red">{v.stepName}</Tag>
                  <Text style={{ marginLeft: 8 }}>{v.variation}</Text>
                </List.Item>
              )}
            />
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
