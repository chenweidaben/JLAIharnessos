/*
 * 健澜科技 jlmedaios - 营养医嘱 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nutrition.repository;

import com.jlmedaios.monolith.nutrition.entity.NutritionOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 营养医嘱 Repository。
 */
@Repository
public interface NutritionOrderRepository extends JpaRepository<NutritionOrder, Long> {

    /**
     * 按患者 ID 查询营养医嘱列表。
     *
     * @param patientId 患者 ID
     * @return 营养医嘱列表
     */
    List<NutritionOrder> findByPatientId(Long patientId);

    /**
     * 按状态查询营养医嘱列表。
     *
     * @param status 状态
     * @return 营养医嘱列表
     */
    List<NutritionOrder> findByStatus(String status);
}
