/*
 * 健澜科技 jlmedaios - 训练数据集 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ai_training_data.repository;

import com.jlmedaios.monolith.ai_training_data.entity.TrainingDataset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 训练数据集 Repository。
 */
@Repository
public interface TrainingDatasetRepository extends JpaRepository<TrainingDataset, Long> {

    /**
     * 按状态查询训练数据集。
     *
     * @param status 状态
     * @return 训练数据集列表
     */
    List<TrainingDataset> findByStatus(String status);

    /**
     * 按任务类型查询训练数据集。
     *
     * @param taskType 任务类型
     * @return 训练数据集列表
     */
    List<TrainingDataset> findByTaskType(String taskType);
}
