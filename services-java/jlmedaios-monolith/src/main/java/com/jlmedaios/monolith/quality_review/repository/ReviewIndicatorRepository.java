/*
 * 健澜科技 jlmedaios - 等级评审指标 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.quality_review.repository;

import com.jlmedaios.monolith.quality_review.entity.ReviewIndicator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 等级评审指标 Repository。
 */
@Repository
public interface ReviewIndicatorRepository extends JpaRepository<ReviewIndicator, Long> {

    /**
     * 按类别查询指标。
     *
     * @param category 类别
     * @return 指标列表
     */
    List<ReviewIndicator> findByCategory(String category);

    /**
     * 按状态查询指标。
     *
     * @param status 状态
     * @return 指标列表
     */
    List<ReviewIndicator> findByStatus(String status);
}
