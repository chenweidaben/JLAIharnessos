/*
 * 健澜科技 jlmedaios - 病案室管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_records_archive.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.medical_records_archive.entity.ArchiveRecord;
import com.jlmedaios.monolith.medical_records_archive.service.MedicalRecordsArchiveService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 病案室管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/archive")
public class ArchiveRecordController {

    private final MedicalRecordsArchiveService medicalRecordsArchiveService;

    /**
     * 病案入库归档。
     *
     * @param body {recordNo, patientId, visitId, recordType, storageLocation}
     * @return Result<ArchiveRecord>
     */
    @PostMapping("/store")
    public Result<ArchiveRecord> store(@RequestBody Map<String, Object> body) {
        ArchiveRecord record = medicalRecordsArchiveService.store(
                String.valueOf(body.get("recordNo")),
                Long.valueOf(String.valueOf(body.get("patientId"))),
                Long.valueOf(String.valueOf(body.get("visitId"))),
                String.valueOf(body.get("recordType")),
                String.valueOf(body.get("storageLocation"))
        );
        return Result.ok(record);
    }

    /**
     * 病案借阅。
     *
     * @param id   归档记录 ID
     * @param body {borrowerId, borrowDate, dueDate}
     * @return Result<ArchiveRecord>
     */
    @PutMapping("/{id}/borrow")
    public Result<ArchiveRecord> borrow(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return medicalRecordsArchiveService.borrow(
                id,
                String.valueOf(body.get("borrowerId")),
                LocalDate.parse(String.valueOf(body.get("borrowDate"))),
                LocalDate.parse(String.valueOf(body.get("dueDate")))
        ).map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 病案归还。
     *
     * @param id 归档记录 ID
     * @return Result<ArchiveRecord>
     */
    @PutMapping("/{id}/return")
    public Result<ArchiveRecord> returnRecord(@PathVariable Long id) {
        return medicalRecordsArchiveService.returnRecord(id)
                .map(Result::ok)
                .orElseGet(() -> Result.ok(null));
    }

    /**
     * 超期未还列表。
     *
     * @return Result<List<ArchiveRecord>>
     */
    @GetMapping("/overdue")
    public Result<List<ArchiveRecord>> overdueList() {
        return Result.ok(medicalRecordsArchiveService.overdueList());
    }
}
