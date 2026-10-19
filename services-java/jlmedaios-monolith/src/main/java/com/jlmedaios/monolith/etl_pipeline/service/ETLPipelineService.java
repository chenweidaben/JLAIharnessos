/*
 * 健澜科技 jlmedaios - ETL 流水线 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.etl_pipeline.service;

import com.jlmedaios.monolith.etl_pipeline.entity.ETLJob;
import com.jlmedaios.monolith.etl_pipeline.entity.ETLPipeline;
import com.jlmedaios.monolith.etl_pipeline.repository.ETLJobRepository;
import com.jlmedaios.monolith.etl_pipeline.repository.ETLPipelineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * ETL 流水线 Service。
 */
@Service
@RequiredArgsConstructor
public class ETLPipelineService {

    private final ETLPipelineRepository etlPipelineRepository;
    private final ETLJobRepository etlJobRepository;

    /**
     * 创建 ETL 流水线。
     *
     * @param pipelineName       流水线名称
     * @param sourceTable         源表
     * @param targetTable         目标表
     * @param transformRulesJSON 转换规则 JSON
     * @param scheduleCron       调度 cron
     * @return 已持久化的流水线
     */
    public ETLPipeline createPipeline(String pipelineName, String sourceTable,
                                       String targetTable, String transformRulesJSON,
                                       String scheduleCron) {
        ETLPipeline pipeline = ETLPipeline.builder()
                .pipelineName(pipelineName)
                .sourceTable(sourceTable)
                .targetTable(targetTable)
                .transformRulesJSON(transformRulesJSON)
                .scheduleCron(scheduleCron)
                .build();
        return etlPipelineRepository.save(pipeline);
    }

    /**
     * 手动触发执行。
     *
     * @param id 流水线 ID
     * @return 执行日志
     */
    public ETLJob runPipeline(Long id) {
        // mock：创建执行日志
        ETLJob job = ETLJob.builder()
                .pipelineId(id)
                .runType("全量")
                .startTime(LocalDateTime.now())
                .status("running")
                .build();
        ETLJob saved = etlJobRepository.save(job);

        // 更新流水线 lastRunAt
        Optional<ETLPipeline> opt = etlPipelineRepository.findById(id);
        if (opt.isPresent()) {
            ETLPipeline pipeline = opt.get();
            pipeline.setLastRunAt(LocalDateTime.now());
            etlPipelineRepository.save(pipeline);
        }
        return saved;
    }

    /**
     * 历史执行记录。
     *
     * @param id 流水线 ID
     * @return 执行记录列表
     */
    public List<ETLJob> pipelineJobs(Long id) {
        return etlJobRepository.findByPipelineId(id);
    }

    /**
     * 全部流水线列表。
     *
     * @return 流水线列表
     */
    public List<ETLPipeline> allPipelines() {
        return etlPipelineRepository.findAll();
    }
}
