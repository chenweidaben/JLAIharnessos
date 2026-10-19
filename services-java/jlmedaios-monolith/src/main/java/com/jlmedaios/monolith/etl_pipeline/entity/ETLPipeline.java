/*
 * 健澜科技 jlmedaios - ETL 流水线实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.etl_pipeline.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * ETL 流水线实体。
 *
 * <p>ETL 流水线主数据</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "etl_pipeline")
public class ETLPipeline {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pipeline_name")
    private String pipelineName;

    @Column(name = "source_table")
    private String sourceTable;

    @Column(name = "target_table")
    private String targetTable;

    @Column(name = "transform_rules_json", columnDefinition = "TEXT")
    private String transformRulesJSON;

    @Column(name = "schedule_cron")
    private String scheduleCron;

    @Column(name = "status")
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "last_run_at")
    private LocalDateTime lastRunAt;
}
