/*
 * 健澜科技 jlmedaios - AI 模型管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ai_model_management.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.ai_model_management.entity.AiModel;
import com.jlmedaios.monolith.ai_model_management.service.AiModelManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * AI 模型管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ai")
public class AiModelManagementController {

    private final AiModelManagementService aiModelManagementService;

    /**
     * 模型列表。
     *
     * @return Result<List<AiModel>>
     */
    @GetMapping("/models")
    public Result<List<AiModel>> modelList() {
        return Result.ok(aiModelManagementService.modelList());
    }

    /**
     * 部署模型。
     *
     * @param body {modelName, version, framework, taskType}
     * @return Result<AiModel>
     */
    @PostMapping("/model/deploy")
    public Result<AiModel> deployModel(@RequestBody Map<String, Object> body) {
        AiModel model = aiModelManagementService.deployModel(
                String.valueOf(body.get("modelName")),
                String.valueOf(body.get("version")),
                String.valueOf(body.get("framework")),
                String.valueOf(body.get("taskType"))
        );
        return Result.ok(model);
    }

    /**
     * 停用模型。
     *
     * @param modelName 模型名
     * @return Result<AiModel>
     */
    @PutMapping("/model/{modelName}/stop")
    public Result<AiModel> stopModel(@PathVariable String modelName) {
        return Result.ok(aiModelManagementService.stopModel(modelName));
    }

    /**
     * 模型指标。
     *
     * @param modelName 模型名
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/model/{modelName}/metrics")
    public Result<Map<String, Object>> modelMetrics(@PathVariable String modelName) {
        return Result.ok(aiModelManagementService.modelMetrics(modelName));
    }
}
