/*
 * 健澜科技 jlmedaios - AI 模型管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ai_model_management.service;

import com.jlmedaios.monolith.ai_model_management.entity.AiModel;
import com.jlmedaios.monolith.ai_model_management.repository.AiModelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * AI 模型管理 Service。
 *
 * <p>AI 模型主数据；生产接 vLLM+MLflow，H2 下 mock</p>
 */
@Service
@RequiredArgsConstructor
public class AiModelManagementService {

    private final AiModelRepository aiModelRepository;

    /**
     * 模型列表。
     *
     * @return AI 模型列表
     */
    public List<AiModel> modelList() {
        return aiModelRepository.findAll();
    }

    /**
     * 部署模型。
     *
     * @param modelName  模型名
     * @param version    版本
     * @param framework  框架
     * @param taskType   任务类型
     * @return 已持久化的 AI 模型
     */
    public AiModel deployModel(String modelName, String version, String framework, String taskType) {
        AiModel model = AiModel.builder()
                .modelName(modelName)
                .version(version)
                .framework(framework)
                .taskType(taskType)
                .status("RUNNING")
                .build();
        return aiModelRepository.save(model);
    }

    /**
     * 停用模型。
     *
     * @param modelName 模型名
     * @return 已更新的 AI 模型
     */
    public AiModel stopModel(String modelName) {
        List<AiModel> models = aiModelRepository.findAll();
        for (AiModel model : models) {
            if (modelName.equals(model.getModelName())) {
                model.setStatus("STOPPED");
                return aiModelRepository.save(model);
            }
        }
        return null;
    }

    /**
     * 模型指标。
     *
     * @param modelName 模型名
     * @return 模型指标
     */
    public Map<String, Object> modelMetrics(String modelName) {
        Map<String, Object> result = new HashMap<>();
        result.put("accuracy", "92.5%");
        result.put("avgLatencyMs", 120);
        result.put("callCount", 15000);
        return result;
    }
}
