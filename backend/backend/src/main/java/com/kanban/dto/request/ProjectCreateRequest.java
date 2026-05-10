package com.kanban.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectCreateRequest {

    @NotBlank(message = "O nome do projeto é obrigatório")
    @Size(max = 100, message = "O nome do projeto deve ter no máximo 100 caracteres")
    private String name;
}
