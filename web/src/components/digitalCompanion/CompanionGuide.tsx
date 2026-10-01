/**
 * 健澜科技 jlmedaios - 数字陪诊向导（M3-Q）
 *
 * 步骤式全流程就医引导，适老化大字体、语音提示说明。
 *
 * 版权所有（c）2026 杭州健澜科技有限公司
 */

import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Space,
  Steps,
  Typography,
} from 'antd';

const { Title, Paragraph, Text } = Typography;

interface GuideStep {
  title: string;
  desc: string;
  tips: string[];
}

const STEPS: GuideStep[] = [
  {
    title: '智能导诊',
    desc: '描述症状，由智能导诊推荐合适的科室，避免挂错号。',
    tips: ['可在「智能导诊」页输入症状', '急症（昏迷、大出血等）请直接急诊'],
  },
  {
    title: '预约挂号',
    desc: '选择科室、医生与就诊时段，完成预约；可由家属代办。',
    tips: ['准备好就诊人信息', '家属代办需先在「授权管理」授予预约权限'],
  },
  {
    title: '到院签到',
    desc: '按预约时段到院，在自助机或科室分诊台签到取号。',
    tips: ['携带身份证/医保卡', '建议提前 15–30 分钟到院'],
  },
  {
    title: '诊室候诊',
    desc: '在候诊区等待叫号，留意屏幕与语音叫号。',
    tips: ['记下就诊序号', '过号请联系分诊台'],
  },
  {
    title: '医生问诊',
    desc: '向医生说明症状、病史与用药；可出示预问诊报告。',
    tips: ['如实描述病情', '带上既往病历、检查报告与用药清单'],
  },
  {
    title: '缴费结算',
    desc: '诊查、检查、药品费用可在线支付或窗口结算，电子票据可查。',
    tips: ['支持医保移动支付', '家属代付需单独授予支付授权'],
  },
  {
    title: '取药/检查',
    desc: '凭处方取药，或按指引完成检查、检验。',
    tips: ['听清药师用药交代', '检查需预约的项目请先预约'],
  },
  {
    title: '查看报告',
    desc: '检查检验报告出具后，可在线查看或到院打印。',
    tips: ['在「在线报告」中查询', '异常结果请及时复诊'],
  },
];

export function CompanionGuide() {
  const [current, setCurrent] = useState(0);
  const [largeFont, setLargeFont] = useState(false);

  const step = STEPS[current];
  const isLast = current === STEPS.length - 1;

  return (
    <Card
      title="数字陪诊向导"
      size="small"
      extra={
        <Button
          size="small"
          onClick={() => setLargeFont((v) => !v)}
          data-testid="font-toggle"
        >
          {largeFont ? '标准字体' : '大字体'}
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Alert
          type="info"
          showIcon
          message="我会一步步陪您完成就医，每一步都有提示，不用担心。"
        />

        <Steps
          current={current}
          onChange={setCurrent}
          size="small"
          direction="vertical"
          items={STEPS.map((s, i) => ({
            title: (
              <Text style={{ fontSize: largeFont ? 18 : undefined }}>
                {i + 1}. {s.title}
              </Text>
            ),
            description:
              i === current ? (
                <Text type="secondary">{s.desc}</Text>
              ) : undefined,
          }))}
        />

        <div
          data-testid="step-detail"
          style={{
            background: '#f5f7fa',
            padding: 16,
            borderRadius: 8,
          }}
        >
          <Title level={largeFont ? 3 : 5} style={{ marginTop: 0 }}>
            {step.title}
          </Title>
          <Paragraph style={{ fontSize: largeFont ? 17 : undefined }}>
            {step.desc}
          </Paragraph>
          <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
            {step.tips.map((t) => (
              <li key={t}>
                <Text style={{ fontSize: largeFont ? 16 : undefined }}>{t}</Text>
              </li>
            ))}
          </ul>
        </div>

        <Space>
          <Button
            disabled={current === 0}
            onClick={() => setCurrent((v) => v - 1)}
          >
            上一步
          </Button>
          <Button
            type="primary"
            onClick={() => setCurrent((v) => Math.min(v + 1, STEPS.length - 1))}
            disabled={isLast}
            data-testid="next-step"
          >
            下一步
          </Button>
          {isLast && (
            <Button type="primary" ghost onClick={() => setCurrent(0)}>
              重新开始
            </Button>
          )}
        </Space>
      </Space>
    </Card>
  );
}
