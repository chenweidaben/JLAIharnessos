/*
 * 健澜科技 jlmedaios - 性能基准测试 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.performance_test.repository;

import com.jlmedaios.monolith.performance_test.entity.BenchmarkResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 性能基准测试 Repository。
 */
@Repository
public interface BenchmarkResultRepository extends JpaRepository<BenchmarkResult, Long> {

    /**
     * 查询最新 10 条测试结果。
     *
     * @return 测试结果列表
     */
    List<BenchmarkResult> findTop10ByOrderByRunAtDesc();
}
