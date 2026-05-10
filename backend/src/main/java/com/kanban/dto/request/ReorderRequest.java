package com.kanban.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReorderRequest {

    @NotNull(message = "A lista de IDs ordenados é obrigatória")
    private List<Long> orderedIds;
}
