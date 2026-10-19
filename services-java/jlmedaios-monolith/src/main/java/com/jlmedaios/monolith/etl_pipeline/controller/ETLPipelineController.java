/*
 * 健澜科技 jlmedaios - ETL 流水线 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.etl_pipeline.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.etl_pipeline.entity.ETLJob;
import com.jlmedaios.monolith.etl_pipeline.entity.ETLPipeline;
import com.jlmedaios.monolith.etl_pipeline.service.ETLPipelineService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * ETL 流水线 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/etl")
public class ETLPipelineController {

    private final ETLPipelineService etlPipelineService;

    /**
     * 创建 ETL 流水线。
     *
     * @param body {pipelineName, sourceTable, targetTable, transformRulesJSON, scheduleCron}
     * @return Result<ETLPipeline>
     */
    @PostMapping("/pipeline")
    public Result<ETLPipeline> createPipeline(@RequestBody Map<String, Object> body) {
        ETLPipeline pipeline = etlPipelineService.createPipeline(
                String.valueOf(body.get("pipelineName")),
                String.valueOf(body.get("sourceTable")),
                String.valueOf(body.get("targetTable")),
                String.valueOf(body.get("transformRulesJSON")),
                String.valueOf(body.get("scheduleCron"))
        );
        return Result.ok(pipeline);
    }

    /**
     * 手动触发执行。
     *
     * @param id 流水线 ID
     * @return Result<ETLJob>
     */
    @PostMapping("/pipeline/{id}/run")
    public Result<ETLJob> runPipeline(@PathVariable Long id) {
        return Result.ok(etlPipelineService.runPipeline(id));
    }

    /**
     * 历史执行记录。
     *
     * @param id 流水线 ID
     * @return Result<List<ETLJob>>
     */
    @GetMapping("/pipeline/{id}/jobs")
    public Result<List<ETLJob>> pipelineJobs(@PathVariable Long id) {
        return Result.ok(etlPipelineService.pipelineJobs(id));
    }

    /**
     * 全部流水线列表。
     *
     * @return Result<List<ETLPipeline>>
     */
    @GetMapping("/pipelines")
    public Result<List<ETLPipeline>> allPipelines() {
        return Result.ok(etlPipelineService.allPipelines());
    }
}
