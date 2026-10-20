/**
 * 健澜科技 jlmedaios - 病历质控知识图谱前端页（M465-D，V14，EMR 深化四模块，M465 收官）
 *
 * 深海蓝VI：缺陷类型→原因→整改措施关系展示 + 建议面板。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Divider, Layout, List, Row, Spin, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DefectNode {
  defectType: string;
  causes: string[];
  remedies: string[];
  relatedDefects: string[];
}

export default function EmrQcGraphPage() {
  const [loading, setLoading] = useState(true);
  const [graph, setGraph] = useState<DefectNode[]>([]);
  const [selected, setSelected] = useState<DefectNode | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-graph", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) {
            setGraph(data?.graph ?? []);
            setSelected(data?.graph?.[0] ?? null);
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

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控知识图谱</Title>
        <Spin spinning={loading}>
          <Card title="缺陷类型列表" headStyle={{ background: VI.deep, color: "#fff" }} style={{ marginBottom: 16 }}>
            {graph.map((node) => (
              <Button
                key={node.defectType}
                style={{ margin: 4, background: selected?.defectType === node.defectType ? VI.accent : VI.mid, color: "#fff" }}
                onClick={() => setSelected(node)}
              >
                {node.defectType}
              </Button>
            ))}
          </Card>
          {selected && (
            <Row gutter={16}>
              <Col span={12}>
                <Card title={`原因分析 - ${selected.defectType}`} headStyle={{ background: VI.mid, color: "#fff" }}>
                  <List
                    size="small"
                    dataSource={selected.causes}
                    renderItem={(cause: string) => <List.Item><Tag color="orange">原因</Tag><Text>{cause}</Text></List.Item>}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="整改措施建议" headStyle={{ background: VI.accent, color: "#fff" }}>
                  <List
                    size="small"
                    dataSource={selected.remedies}
                    renderItem={(remedy: string) => <List.Item><Tag color="green">措施</Tag><Text>{remedy}</Text></List.Item>}
                  />
                  <Divider>关联缺陷</Divider>
                  {selected.relatedDefects.map((d) => <Tag key={d} color="blue">{d}</Tag>)}
                </Card>
              </Col>
            </Row>
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
