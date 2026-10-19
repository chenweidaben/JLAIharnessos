/*
 * 健澜科技 jlmedaios - 患者教育材料 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_education.repository;

import com.jlmedaios.monolith.patient_education.entity.EducationMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 患者教育材料 Repository。
 */
@Repository
public interface EducationMaterialRepository extends JpaRepository<EducationMaterial, Long> {

    /**
     * 按分类查询教育材料。
     *
     * @param category 分类
     * @return 教育材料列表
     */
    List<EducationMaterial> findByCategory(String category);
}
