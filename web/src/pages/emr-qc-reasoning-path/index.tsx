/**
 * 健澜科技 jlmedaios - 质控知识推理路径前端页（M489-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：推理路径可视化（节点+边）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ReasoningPath {
  id: string;
  nodes: string[];
  edges: string[];
}

interface ReasoningResult {
  paths: string[][];
  pathCount: number;
}

export default function EmrQcReasoningPathPage() {
  const [path, setPath] = useState<ReasoningPath | null>(null);
  const [result, setResult] = useState<ReasoningResult>({ paths: [], pathCount: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-reasoning-path", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setPath(data?.data?.path ?? null);
          setResult(data?.data?.result ?? { paths: [], pathCount: 0 });
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控知识推理路径</Title>
        {path && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title={`推理路径 ${path.id}`} style={{ marginBottom: 16 }}>
            <Text strong>节点：</Text>
            {path.nodes.map((n) => <Tag key={n} color="blue" style={{ marginBottom: 8 }}>{n}</Tag>)}
            <br />
            <Text strong>边：</Text>
            {path.edges.map((e) => <Tag key={e} color="orange" style={{ marginBottom: 8 }}>{e}</Tag>)}
          </Card>
        )}
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title={`查找结果（共 ${result.pathCount} 条路径）`}>
          <List
            dataSource={result.paths}
            renderItem={(p, idx) => (
              <List.Item>
                <Text>路径 {idx + 1}：{p.join(" → ")}</Text>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
