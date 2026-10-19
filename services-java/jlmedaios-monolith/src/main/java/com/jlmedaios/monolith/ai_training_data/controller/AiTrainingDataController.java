/*
 * 健澜科技 jlmedaios - AI 训练数据管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ai_training_data.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.ai_training_data.entity.TrainingDataset;
import com.jlmedaios.monolith.ai_training_data.service.AiTrainingDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * AI 训练数据管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/training")
public class AiTrainingDataController {

    private final AiTrainingDataService aiTrainingDataService;

    /**
     * 数据集列表。
     *
     * @return Result<List<TrainingDataset>>
     */
    @GetMapping("/datasets")
    public Result<List<TrainingDataset>> datasetList() {
        return Result.ok(aiTrainingDataService.datasetList());
    }

    /**
     * 创建数据集。
     *
     * @param body {datasetName, taskType, sampleCount, createdBy}
     * @return Result<TrainingDataset>
     */
    @PostMapping("/dataset")
    public Result<TrainingDataset> createDataset(@RequestBody Map<String, Object> body) {
        TrainingDataset dataset = aiTrainingDataService.createDataset(
                String.valueOf(body.get("datasetName")),
                String.valueOf(body.get("taskType")),
                Integer.valueOf(String.valueOf(body.get("sampleCount"))),
                String.valueOf(body.get("createdBy"))
        );
        return Result.ok(dataset);
    }

    /**
     * 发布新版本。
     *
     * @param name 数据集名称
     * @param body {version}
     * @return Result<TrainingDataset>
     */
    @PutMapping("/dataset/{name}/version")
    public Result<TrainingDataset> publishVersion(@PathVariable String name,
                                                   @RequestBody Map<String, Object> body) {
        return Result.ok(aiTrainingDataService.publishVersion(name,
                String.valueOf(body.get("version"))));
    }
}
