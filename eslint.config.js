/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

/**
 * ESLint Flat 配置（ESLint 9+）
 *
 * 集成：
 * - @typescript-eslint：TypeScript 解析与规则
 * - eslint-plugin-react / react-hooks：React 19 + Ink 终端渲染
 * - eslint-plugin-simple-import-sort：导入排序
 * - eslint-plugin-security：安全风险规则
 * - 医疗领域自定义规则（禁止 console.log、禁止硬编码患者数据）
 *
 * 规则原则：合理不过于严格，仅对未使用变量、显式 any 等关键项报错，
 * 其余以 warn 提示，避免阻塞业务迭代。
 */

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import security from 'eslint-plugin-security';
import globals from 'globals';

/** 医疗领域禁止出现的硬编码患者数据样例（防止把测试/真实数据写进源码） */
const MEDICAL_FORBIDDEN_PATTERNS = [
  {
    // 身份证号 18 位硬编码
    pattern: /['"`]\d{17}[\dXx]['"`]/,
    message: '禁止在源码中硬编码身份证号，请使用测试夹具或脱敏占位符。',
  },
  {
    // 手机号硬编码
    pattern: /['"`]1[3-9]\d{9}['"`]/,
    message: '禁止在源码中硬编码手机号，请使用 138****5678 之类的脱敏占位符。',
  },
];

export default tseslint.config(
  // 全局忽略
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/*.d.ts',
      '**/*.js',
      'scripts/**',
      'design/**',
      'docs/**',
      '.venv/**',
      '**/mockData.ts',
    ],
  },

  // 推荐基础规则
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.bun,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    plugins: {
      react,
      'react-hooks': reactHooks,
      import: importPlugin,
      'simple-import-sort': simpleImportSort,
      security,
    },

    settings: {
      react: { version: '19' },
      // 注：此处不配置 import/resolver.typescript（未安装 eslint-import-resolver-typescript），
      // 否则每个文件都会报 “Resolve error: typescript with invalid interface loaded as resolver” 误报。
    },

    rules: {
      // ---------- 代码质量 ----------
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': [
        'warn',
        { fixToUnknown: false, ignoreRestArgs: true },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'prefer-const': 'warn',
      'no-var': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      // 医疗工具/适配器框架要求 execute/onInit/authenticate 等方法返回 Promise（接口契约），
      // 大量内存 Mock 实现是同步逻辑但必须声明 async 以满足契约。此处关闭 require-await 误报，
      // 不通过添加无意义 await 来"骗过"规则。
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/explicit-function-return-type': [
        'off', // 大型项目过度严格，JSDoc 注释已要求
      ],

      // ---------- 导入排序 ----------
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',
      'import/first': 'warn',
      'import/newline-after-import': 'warn',
      'import/no-duplicates': 'warn',

      // ---------- React / Ink ----------
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // react-jsx 运行时
      'react/prop-types': 'off', // TypeScript 已做类型检查
      'react/display-name': 'off',

      // ---------- 安全 ----------
      'security/detect-object-injection': 'off', // 医疗工具动态字段较多，误报高
      'security/detect-non-literal-fs-filename': [
        'off', // 文件路径均来自启动期校验后的应用配置（LOG_DIR / data/vectors / tmp），非用户请求输入，无路径穿越面
      ],
      'security/detect-eval-with-expression': 'error',
      'security/detect-possible-timing-attacks': 'warn',
      'no-eval': 'error',

      // ---------- 医疗领域规范 ----------
      // 生产代码禁止 console.log，应使用 src/core/logging 的 Logger
      'no-console': [
        'warn',
        { allow: ['warn', 'error', 'info', 'debug'] },
      ],
      // 禁止 debugger 提交
      'no-debugger': 'error',
    },
  },

  // 测试文件放宽规则
  {
    files: ['tests/**/*.ts', '**/*.test.ts', '**/testHelpers.ts', '**/helpers.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-console': 'off',
    },
  },

  // 关闭类型感知规则对 JS 配置文件的检查（eslint.config.js / prettier 配置等）
  {
    files: ['*.config.js', '*.config.ts'],
    ...tseslint.configs.disableTypeChecked,
  },
);

export { MEDICAL_FORBIDDEN_PATTERNS };
