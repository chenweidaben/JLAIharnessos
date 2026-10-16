/**
 * 健澜科技 jlmedaios - 文化品牌 V3 页（M245-B）
 *
 * 院训愿景使命价值观医院精神/院徽院旗VI手册环境导视深海蓝/品牌定位传播危机/新闻媒体新媒体矩阵/院史馆文化长廊。深海蓝 VI。
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
  spirit: { motto: string; vision: string; mission: string };
  vi: { logo: number; signage: number; deepSeaBlue: boolean };
  media: { news: number; wechat: number; video: number };
  venue: { museum: number; corridor: number };
  suggestions: string[];
}

export default function CultureBrandV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/culture-brand-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>文化品牌 V3</Title>
        <Paragraph type="secondary">院训·愿景·使命·价值观·医院精神 / 院徽·院旗·VI 手册·环境导视·深海蓝 / 品牌定位·传播·危机 / 新闻媒体·新媒体矩阵 / 院史馆·文化长廊</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="院训" value={data.spirit.motto} /></Card></Col>
              <Col span={6}><Card><Statistic title="VI 导视点" value={data.vi.signage} /></Card></Col>
              <Col span={6}><Card><Statistic title="微信推文" value={data.media.wechat} /></Card></Col>
              <Col span={6}><Card><Statistic title="文化长廊" value={data.venue.corridor} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>品牌明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "news", name: "新闻报道", value: data.media.news },
                  { key: "video", name: "短视频", value: data.media.video },
                  { key: "museum", name: "院史馆", value: data.venue.museum },
                  { key: "deepSeaBlue", name: "深海蓝 VI", value: data.vi.deepSeaBlue ? "启用" : "未启用" },
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
