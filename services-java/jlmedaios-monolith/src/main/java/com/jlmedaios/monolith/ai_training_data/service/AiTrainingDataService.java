/*
 * 健澜科技 jlmedaios - AI 训练数据管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ai_training_data.service;

import com.jlmedaios.monolith.ai_training_data.entity.TrainingDataset;
import com.jlmedaios.monolith.ai_training_data.repository.TrainingDatasetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * AI 训练数据管理 Service。
 *
 * <p>训练数据集主数据；生产接 DVC/Label Studio，H2 下 mock；PHI 必须脱敏</p>
 */
@Service
@RequiredArgsConstructor
public class AiTrainingDataService {

    private final TrainingDatasetRepository trainingDatasetRepository;

    /**
     * 数据集列表。
     *
     * @return 训练数据集列表
     */
    public List<TrainingDataset> datasetList() {
        return trainingDatasetRepository.findAll();
    }

    /**
     * 创建数据集。
     *
     * @param datasetName 数据集名称
     * @param taskType    任务类型
     * @param sampleCount 样本数
     * @param createdBy   创建人
     * @return 已持久化的训练数据集
     */
    public TrainingDataset createDataset(String datasetName, String taskType,
                                          Integer sampleCount, String createdBy) {
        TrainingDataset dataset = TrainingDataset.builder()
                .datasetName(datasetName)
                .version("v0.1")
                .taskType(taskType)
                .sampleCount(sampleCount)
                .labeledCount(0)
                .status("COLLECTING")
                .createdBy(createdBy)
                .build();
        return trainingDatasetRepository.save(dataset);
    }

    /**
     * 发布新版本。
     *
     * @param datasetName 数据集名称
     * @param version     版本号
     * @return 已发布的训练数据集
     */
    public TrainingDataset publishVersion(String datasetName, String version) {
        List<TrainingDataset> datasets = trainingDatasetRepository.findAll();
        for (TrainingDataset dataset : datasets) {
            if (datasetName.equals(dataset.getDatasetName())) {
                dataset.setVersion(version);
                dataset.setStatus("PUBLISHED");
                return trainingDatasetRepository.save(dataset);
            }
        }
        return null;
    }
}
