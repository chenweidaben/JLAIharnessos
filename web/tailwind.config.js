/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * Tailwind CSS 配置：健澜深海蓝设计令牌 + 医疗场景扩展
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        jl: {
          primary: '#0A4D8C',
          'primary-dark': '#073A6B',
          'primary-light': '#1A6BB8',
          blue: '#1890FF',
          cyan: '#13C2C2',
        },
        success: '#52C41A',
        warning: '#FAAD14',
        danger: '#F5222D',
        info: '#1890FF',
        ink: {
          bg: '#F5F7FA',
          border: '#E8ECF1',
          secondary: '#8C8C8C',
          primary: '#262626',
        },
        medical: {
          critical: '#F5222D',
          abnormal: '#FA8C16',
          normal: '#52C41A',
          pending: '#1890FF',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 2px 8px rgba(10, 77, 140, 0.08)',
        'card-hover': '0 4px 16px rgba(10, 77, 140, 0.16)',
      },
      borderRadius: { jl: '8px' },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
  corePlugins: { preflight: false },
};
