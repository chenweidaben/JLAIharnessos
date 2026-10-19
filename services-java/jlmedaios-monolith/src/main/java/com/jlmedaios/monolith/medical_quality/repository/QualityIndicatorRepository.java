/*
 * 健澜科技 jlmedaios - 质量指标 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_quality.repository;

import com.jlmedaios.monolith.medical_quality.entity.QualityIndicator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 质量指标 Repository。
 */
@Repository
public interface QualityIndicatorRepository extends JpaRepository<QualityIndicator, Long> {

    /**
     * 按类别查询指标。
     *
     * @param category 类别
     * @return 指标列表
     */
    List<QualityIndicator> findByCategory(String category);
}
