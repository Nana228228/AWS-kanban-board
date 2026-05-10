package com.kanban.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "kanban_column")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class KanbanColumn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", nullable = false)
    @JsonBackReference
    private Board board;

    @Column(name = "title", nullable = false, length = 100)
    private String title;

    @Column(name = "position", nullable = false)
    private int position = 0;

    @Column(name = "is_done_column", nullable = false)
    private boolean isDoneColumn = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "column", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    @JsonManagedReference
    private List<Card> cards = new ArrayList<>();
}
