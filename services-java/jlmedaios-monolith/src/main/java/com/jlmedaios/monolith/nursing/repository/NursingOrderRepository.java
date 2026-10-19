/*
 * 健澜科技 jlmedaios - 护理医嘱 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nursing.repository;

import com.jlmedaios.monolith.nursing.entity.NursingOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 护理医嘱 Repository。
 */
@Repository
public interface NursingOrderRepository extends JpaRepository<NursingOrder, Long> {
}
