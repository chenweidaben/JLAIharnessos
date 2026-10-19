/*
 * 健澜科技 jlmedaios - 调查问卷 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_satisfaction.repository;

import com.jlmedaios.monolith.patient_satisfaction.entity.SurveyQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 调查问卷 Repository。
 */
@Repository
public interface SurveyQuestionRepository extends JpaRepository<SurveyQuestion, Long> {

    /**
     * 按类别查询问题。
     *
     * @param category 类别
     * @return 问题列表
     */
    List<SurveyQuestion> findByCategory(String category);
}
