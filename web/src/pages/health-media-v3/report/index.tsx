/**
 * 健澜科技 jlmedaios - 健康科普 V3 页（M246-C）
 *
 * 文章短视频直播图文漫画动画/公众号视频号抖音快手B站小红书矩阵/选题脚本拍摄剪辑审核爆款/医疗广告合规。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import {
  Card,
  Col,
  Layout,
  List,
  Row,
  Spin,
  Statistic,
  Table,
  Typography,
} from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  timeRange: string;
  content: { articles: number; videos: number; lives: number };
  matrix: { wechat: number; douyin: number; bilibili: number; xhs: number };
  team: { writers: number; editors: number; designers: number };
  compliance: { reviewed: number; approved: number };
  suggestions: string[];
}

export default function HealthMediaV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/health-media-v3/report");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>健康科普全媒体 V3</Title>
        <Paragraph type="secondary">文章·短视频·直播·图文·漫画·动画 / 公众号·视频号·抖音·快手·B站·小红书矩阵 / 选题·脚本·拍摄·剪辑·审核·爆款 / 医疗广告合规</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="文章" value={data.content.articles} /></Card></Col>
              <Col span={6}><Card><Statistic title="短视频" value={data.content.videos} /></Card></Col>
              <Col span={6}><Card><Statistic title="公众号" value={data.matrix.wechat} /></Card></Col>
              <Col span={6}><Card><Statistic title="合规审核率" value={`${Math.round((data.compliance.approved / data.compliance.reviewed) * 100)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>媒体明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "lives", name: "直播", value: data.content.lives },
                  { key: "douyin", name: "抖音", value: data.matrix.douyin },
                  { key: "bilibili", name: "B站", value: data.matrix.bilibili },
                  { key: "writers", name: "写手", value: data.team.writers },
                ]}
                columns={[
                  { title: "项目", dataIndex: "name", key: "name" },
                  { title: "数值", dataIndex: "value", key: "value" },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>改进建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
