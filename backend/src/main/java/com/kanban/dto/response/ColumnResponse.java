package com.kanban.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ColumnResponse {

    private Long id;
    private Long boardId;
    private String title;
    private Integer position;
    private Boolean isDoneColumn;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<CardResponse> cards;
}
