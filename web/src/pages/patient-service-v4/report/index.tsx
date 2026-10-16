/**
 * 健澜科技 jlmedaios - 患者服务 V4 页（M253-A）
 *
 * 分时段多渠道AI推荐预约率爽约号源取消改约/分诊导医陪诊诊间结算一站式少等待就医指南/共享轮椅充电宝婴儿车饮水WiFi无障碍翻译寄存/受理分类处理回访根因改进闭环满意度/出院慢病术后AI外呼微信满意度/入院术前用药慢病产后视频互动学习追踪/志愿者岗位服务时长培训表彰患者陪伴/门诊住院急诊医技护理整体NPS改进。深海蓝 VI。
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
  booking: { appointment: number; noShow: number; channels: number; cancel: number };
  visit: { triage: number; guide: number; companion: number; wait: number };
  convenience: { wheelchair: number; stroller: number; water: number; wifi: number };
  complaint: { intake: number; process: number; followup: number; closedLoop: number };
  followup: { discharge: number; chronic: number; postop: number; aiCall: number };
  education: { admission: number; preop: number; medication: number; video: number };
  volunteer: { post: number; hours: number; training: number; recognition: number };
  nps: { outpatient: number; inpatient: number; emergency: number; nursing: number };
  suggestions: string[];
}

export default function PatientServiceV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/patient-service-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>患者服务 V4</Title>
        <Paragraph type="secondary">分时段·多渠道·AI 推荐·预约·爽约 / 分诊·导医·陪诊·一站式·少等待 / 轮椅·充电宝·婴儿车·饮水·WiFi·无障碍 / 受理·处理·回访·根因·闭环 / 出院·慢病·术后·AI 外呼 / 入院·术前·用药·视频·互动 / 志愿者·岗位·时长·培训·表彰 / 门诊·住院·急诊·NPS</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="预约率" value={`${data.booking.appointment}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="候诊时间" value={`${data.visit.wait}分钟`} /></Card></Col>
              <Col span={6}><Card><Statistic title="投诉闭环率" value={`${data.complaint.closedLoop}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="门诊 NPS" value={data.nps.outpatient} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>服务明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "noShow", name: "爽约率", value: `${data.booking.noShow}%` },
                  { key: "companion", name: "陪诊", value: data.visit.companion },
                  { key: "aiCall", name: "AI 外呼", value: data.followup.aiCall },
                  { key: "nursingNps", name: "护理 NPS", value: data.nps.nursing },
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
