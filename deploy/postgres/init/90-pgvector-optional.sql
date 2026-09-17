-- ============================================================================
# 健澜科技杠OS - pgvector 可选增强（在 40-knowledge.sql 之后执行）
-- 90-pgvector-optional.sql
--
-- 若镜像预装了 pgvector（如 pgvector/pgvector:pg16），本脚本为知识分块增加
-- 真正的向量列与 ivfflat 索引；否则安全跳过（沿用 jsonb embedding + 应用层余弦）。
--
-- Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    -- 向量列（与应用 embedding 维度一致，默认 1536，可按所选模型调整）
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'knowledge' AND table_name = 'chunks' AND column_name = 'embedding_vec'
    ) THEN
      EXECUTE 'ALTER TABLE knowledge.chunks ADD COLUMN embedding_vec vector(1536)';
    END IF;

    -- ivfflat 余弦相似度索引（lists 按数据量调整，百万级建议 1000+）
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_chunks_embedding_vec
             ON knowledge.chunks USING ivfflat (embedding_vec vector_cosine_ops) WITH (lists = 100)';

    RAISE NOTICE 'pgvector 向量列与 ivfflat 索引已创建';
  ELSE
    RAISE NOTICE 'pgvector 未安装，跳过向量列（使用 jsonb embedding）';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pgvector 增强创建失败，已安全跳过：%', SQLERRM;
END $$;
