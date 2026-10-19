/*
 * 健澜科技 jlmedaios - ETL 执行日志 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.etl_pipeline.repository;

import com.jlmedaios.monolith.etl_pipeline.entity.ETLJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ETL 执行日志 Repository。
 */
@Repository
public interface ETLJobRepository extends JpaRepository<ETLJob, Long> {

    /**
     * 按流水线 ID 查询执行记录。
     *
     * @param pipelineId 流水线 ID
     * @return 执行记录列表
     */
    List<ETLJob> findByPipelineId(Long pipelineId);
}
