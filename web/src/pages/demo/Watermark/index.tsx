/**
 * 健澜科技数智医院智能体（jlmedaios）- 演示模式水印组件（M125-C）
 *
 * 【演示就绪】
 *  - 演示模式（DEMO_MODE=1）下：右上角常驻「演示模式 · 数据已脱敏」提示条，
 *    并叠加全屏斜向浅蓝水印，防止现场演示时混淆真实生产数据；
 *  - 生产模式（visible=false）下整体返回 null，不产生任何 DOM 节点；
 *  - 深海蓝 VI：主色 #0A4D8C / 深色 #073A6B，水印使用低透明度 #0A4D8C。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import React from 'react';

/** 组件入参：visible 控制显隐；bannerText / watermarkText 可由 /api/v1/demo/status 下发 */
export interface WatermarkProps {
  /** 是否显示（生产模式传 false 即完全不渲染） */
  visible?: boolean;
  /** 右上角提示条文案 */
  bannerText?: string;
  /** 全屏斜向水印文案 */
  watermarkText?: string;
}

/** 深海蓝 VI 色值 */
const DEEP_SEA_BLUE = '#0A4D8C';
const DEEP_SEA_BLUE_DARK = '#073A6B';

/**
 * 演示模式水印：右上角提示条 + 全屏斜向平铺水印。
 *
 * @example
 * <Watermark visible bannerText="演示模式 · 数据已脱敏" watermarkText="演示模式 · 杭州健澜科技有限公司" />
 */
export default function Watermark({
  visible = false,
  bannerText = '演示模式 · 数据已脱敏',
  watermarkText = '演示模式 · 杭州健澜科技有限公司',
}: WatermarkProps): React.ReactElement | null {
  if (!visible) return null;

  return (
    <>
      {/* 右上角提示条（深海蓝渐变，常驻不拦截点击） */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          zIndex: 9999,
          padding: '6px 16px',
          color: '#FFFFFF',
          fontSize: 13,
          letterSpacing: 1,
          background: `linear-gradient(160deg, ${DEEP_SEA_BLUE_DARK} 0%, ${DEEP_SEA_BLUE} 100%)`,
          boxShadow: '0 2px 8px rgba(7, 58, 107, 0.35)',
          borderBottomLeftRadius: 6,
          pointerEvents: 'none',
        }}
      >
        {bannerText}
      </div>

      {/* 全屏斜向平铺水印（低透明度，不拦截任何交互） */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-30deg)',
            whiteSpace: 'nowrap',
            color: DEEP_SEA_BLUE,
            opacity: 0.08,
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: 4,
            width: '200%',
            lineHeight: 4,
            textAlign: 'center',
          }}
        >
          {/* 重复平铺形成满屏水印 */}
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} style={{ display: 'block' }}>
              {watermarkText}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
