/*
 * 健澜科技 jlmedaios - 满意度评分 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_satisfaction.repository;

import com.jlmedaios.monolith.patient_satisfaction.entity.SurveyResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 满意度评分 Repository。
 */
@Repository
public interface SurveyResponseRepository extends JpaRepository<SurveyResponse, Long> {

    /**
     * 按科室查询评分。
     *
     * @param department 科室
     * @return 评分列表
     */
    List<SurveyResponse> findByDepartment(String department);
}
