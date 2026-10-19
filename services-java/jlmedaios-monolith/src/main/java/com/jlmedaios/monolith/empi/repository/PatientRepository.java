/*
 * 健澜科技 jlmedaios - 患者主索引 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.empi.repository;

import com.jlmedaios.monolith.empi.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 患者主索引 Repository。
 */
@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {

    /**
     * 按身份证号查询患者。
     *
     * @param idCard 身份证号
     * @return 患者 Optional
     */
    Optional<Patient> findByIdCard(String idCard);
}
