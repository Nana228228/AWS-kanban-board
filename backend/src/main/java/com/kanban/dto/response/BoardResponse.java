package com.kanban.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BoardResponse {

    private Long id;
    private Long projectId;
    private String title;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer durationDays;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ColumnResponse> columns;
}
