/*
 * 健澜科技 jlmedaios - AI 模型 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ai_model_management.repository;

import com.jlmedaios.monolith.ai_model_management.entity.AiModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * AI 模型 Repository。
 */
@Repository
public interface AiModelRepository extends JpaRepository<AiModel, Long> {

    /**
     * 按状态查询 AI 模型。
     *
     * @param status 状态
     * @return AI 模型列表
     */
    List<AiModel> findByStatus(String status);

    /**
     * 按任务类型查询 AI 模型。
     *
     * @param taskType 任务类型
     * @return AI 模型列表
     */
    List<AiModel> findByTaskType(String taskType);
}
