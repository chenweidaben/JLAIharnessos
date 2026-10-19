/*
 * 健澜科技 jlmedaios - ETL 执行日志实体
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
 * ETL 执行日志实体。
 *
 * <p>append-only: ETL 执行日志不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "etl_job")
public class ETLJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pipeline_id")
    private Long pipelineId;

    @Column(name = "run_type")
    private String runType;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "records_read")
    private Integer recordsRead;

    @Column(name = "records_written")
    private Integer recordsWritten;

    @Column(name = "status")
    private String status;

    @Column(name = "error_log", columnDefinition = "TEXT")
    private String errorLog;
}
