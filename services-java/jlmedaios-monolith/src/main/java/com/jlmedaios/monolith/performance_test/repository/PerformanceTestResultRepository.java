/*
 * 健澜科技 jlmedaios - 压测结果 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.performance_test.repository;

import com.jlmedaios.monolith.performance_test.entity.PerformanceTestResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 压测结果 Repository。
 */
@Repository
public interface PerformanceTestResultRepository extends JpaRepository<PerformanceTestResult, Long> {

    /**
     * 按测试名查询压测结果。
     *
     * @param testName 测试名
     * @return 压测结果列表
     */
    List<PerformanceTestResult> findByTestName(String testName);
}
