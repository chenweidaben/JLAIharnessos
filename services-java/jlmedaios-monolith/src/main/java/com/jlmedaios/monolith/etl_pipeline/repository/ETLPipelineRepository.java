/*
 * 健澜科技 jlmedaios - ETL 流水线 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.etl_pipeline.repository;

import com.jlmedaios.monolith.etl_pipeline.entity.ETLPipeline;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ETL 流水线 Repository。
 */
@Repository
public interface ETLPipelineRepository extends JpaRepository<ETLPipeline, Long> {

    /**
     * 按状态查询流水线。
     *
     * @param status 状态
     * @return 流水线列表
     */
    List<ETLPipeline> findByStatus(String status);
}
