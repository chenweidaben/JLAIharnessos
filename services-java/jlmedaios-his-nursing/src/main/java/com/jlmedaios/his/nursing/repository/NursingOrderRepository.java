/*
 * 健澜科技 jlmedaios - 护理医嘱 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.nursing.repository;

import com.jlmedaios.his.nursing.entity.NursingOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 护理医嘱 Repository。
 */
@Repository
public interface NursingOrderRepository extends JpaRepository<NursingOrder, Long> {

    /**
     * 按患者 ID 查询护理医嘱列表。
     *
     * @param patientId 患者 ID
     * @return 护理医嘱列表
     */
    List<NursingOrder> findByPatientId(Long patientId);
}
