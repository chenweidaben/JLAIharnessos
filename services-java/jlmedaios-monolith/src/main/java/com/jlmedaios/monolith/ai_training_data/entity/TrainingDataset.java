/*
 * 健澜科技 jlmedaios - 训练数据集实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ai_training_data.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 训练数据集实体。
 *
 * <p>训练数据集主数据；生产接 DVC/Label Studio，H2 下 mock；PHI 必须脱敏</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "training_dataset")
public class TrainingDataset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dataset_name")
    private String datasetName;

    @Column(name = "version")
    private String version;

    @Column(name = "task_type")
    private String taskType;

    @Column(name = "sample_count")
    private Integer sampleCount;

    @Column(name = "labeled_count")
    private Integer labeledCount;

    @Column(name = "status")
    @Builder.Default
    private String status = "COLLECTING";

    @Column(name = "created_by")
    private String createdBy;
}
