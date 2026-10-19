/*
 * 健澜科技 jlmedaios - 患者门户 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_portal.service;

import com.jlmedaios.monolith.patient_portal.entity.PatientPortalUser;
import com.jlmedaios.monolith.patient_portal.repository.PatientPortalUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 患者门户 Service。
 *
 * <p>患者只读病历，写操作走医生端</p>
 */
@Service
@RequiredArgsConstructor
public class PatientPortalService {

    private final PatientPortalUserRepository patientPortalUserRepository;

    /**
     * 注册患者门户用户（mock 验证码校验）。
     *
     * @param patientId 患者 ID
     * @param phone     手机号
     * @return 已持久化的门户用户
     */
    public PatientPortalUser register(Long patientId, String phone) {
        // mock：验证码校验通过，设为 VERIFIED
        PatientPortalUser user = PatientPortalUser.builder()
                .patientId(patientId)
                .phone(phone)
                .verifiedStatus("VERIFIED")
                .build();
        return patientPortalUserRepository.save(user);
    }

    /**
     * 查询患者病历列表（mock）。
     *
     * @param patientId 患者 ID
     * @return 病历列表
     */
    public List<Map<String, Object>> myRecords(Long patientId) {
        List<Map<String, Object>> records = new ArrayList<>();
        Map<String, Object> record = new HashMap<>();
        record.put("docType", "出院小结");
        record.put("date", "2026-10-01");
        record.put("dept", "消化内科");
        record.put("diagnosis", "急性胃炎");
        records.add(record);
        return records;
    }

    /**
     * 查询患者预约列表（mock）。
     *
     * @param patientId 患者 ID
     * @return 预约列表
     */
    public List<Map<String, Object>> myAppointments(Long patientId) {
        List<Map<String, Object>> appointments = new ArrayList<>();
        Map<String, Object> appt = new HashMap<>();
        appt.put("examType", "CT");
        appt.put("scheduledTime", "2026-10-20T09:00:00");
        appt.put("dept", "放射科");
        appointments.add(appt);
        return appointments;
    }

    /**
     * 查询患者账单列表（mock）。
     *
     * @param patientId 患者 ID
     * @return 账单列表
     */
    public List<Map<String, Object>> myBills(Long patientId) {
        List<Map<String, Object>> bills = new ArrayList<>();
        Map<String, Object> bill = new HashMap<>();
        bill.put("itemName", "住院费");
        bill.put("amount", "5000.00");
        bill.put("status", "已结清");
        bills.add(bill);
        return bills;
    }
}
