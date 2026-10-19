/*
 * 健澜科技 jlmedaios - 患者主索引 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.empi.service;

import com.jlmedaios.monolith.empi.entity.Patient;
import com.jlmedaios.monolith.empi.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * 患者主索引 Service。
 */
@Service
@RequiredArgsConstructor
public class EmpiService {

    private final PatientRepository patientRepository;

    /**
     * 建档。
     *
     * @param name    姓名
     * @param gender  性别
     * @param idCard  身份证号
     * @param phone   手机号
     * @return 已持久化的患者
     */
    public Patient register(String name, String gender, String idCard, String phone) {
        Patient patient = Patient.builder()
                .name(name)
                .gender(gender)
                .idCard(idCard)
                .phone(phone)
                .build();
        return patientRepository.save(patient);
    }

    /**
     * 按 EMPI ID 查询患者。
     *
     * @param empiId EMPI ID
     * @return 患者 Optional
     */
    public Optional<Patient> getByEmpiId(Long empiId) {
        return patientRepository.findById(empiId);
    }

    /**
     * 按身份证号查询患者。
     *
     * @param idCard 身份证号
     * @return 患者 Optional
     */
    public Optional<Patient> searchByIdCard(String idCard) {
        return patientRepository.findByIdCard(idCard);
    }
}
