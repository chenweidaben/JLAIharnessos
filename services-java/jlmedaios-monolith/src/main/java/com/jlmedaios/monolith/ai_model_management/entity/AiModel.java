/*
 * 健澜科技 jlmedaios - AI 模型实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ai_model_management.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * AI 模型实体。
 *
 * <p>AI 模型主数据；生产接 vLLM+MLflow，H2 下 mock</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "ai_model")
public class AiModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "model_name")
    private String modelName;

    @Column(name = "version")
    private String version;

    @Column(name = "framework")
    private String framework;

    @Column(name = "task_type")
    private String taskType;

    @Column(name = "status")
    @Builder.Default
    private String status = "DEPLOYING";

    @Column(name = "deploy_time")
    @Builder.Default
    private LocalDateTime deployTime = LocalDateTime.now();
}
