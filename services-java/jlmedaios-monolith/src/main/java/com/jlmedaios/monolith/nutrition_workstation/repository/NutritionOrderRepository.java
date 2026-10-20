/*
 * 健澜科技 jlmedaios - 营养医嘱 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nutrition_workstation.repository;

import com.jlmedaios.monolith.nutrition_workstation.entity.NutritionOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 营养医嘱 Repository。
 */
@Repository
public interface NutritionOrderRepository extends JpaRepository<NutritionOrder, Long> {

    /**
     * 按状态查询营养医嘱。
     *
     * @param status 状态
     * @return 营养医嘱列表
     */
    List<NutritionOrder> findByStatus(String status);

    /**
     * 按患者 ID 查询营养医嘱。
     *
     * @param patientId 患者 ID
     * @return 营养医嘱列表
     */
    List<NutritionOrder> findByPatientId(String patientId);

    /**
     * 按医嘱编号查询营养医嘱（P5 性能优化：替代 findAll().filter()）。
     *
     * @param orderNo 医嘱编号
     * @return 营养医嘱
     */
    NutritionOrder findByOrderNo(String orderNo);
}
