/*
 * 健澜科技 jlmedaios - 评级指标 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ehr_rating.repository;

import com.jlmedaios.monolith.ehr_rating.entity.EHRRatingItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 评级指标 Repository。
 */
@Repository
public interface EHRRatingItemRepository extends JpaRepository<EHRRatingItem, Long> {

    /**
     * 按类别查询评级指标。
     *
     * @param category 类别
     * @return 评级指标列表
     */
    List<EHRRatingItem> findByCategory(String category);

    /**
     * 按状态查询评级指标。
     *
     * @param status 状态
     * @return 评级指标列表
     */
    List<EHRRatingItem> findByStatus(String status);
}
