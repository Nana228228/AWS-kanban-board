-- Kanban Board DDL - H2 (for tests)
-- H2 does not support ON UPDATE CURRENT_TIMESTAMP, so updated_at uses only DEFAULT CURRENT_TIMESTAMP

CREATE TABLE project (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE board (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_days INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_board_project FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE,
    CONSTRAINT chk_duration_positive CHECK (duration_days > 0),
    CONSTRAINT chk_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_board_project_id ON board(project_id);
CREATE INDEX idx_board_dates ON board(project_id, start_date, end_date);

CREATE TABLE kanban_column (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    board_id BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL,
    position INT NOT NULL DEFAULT 0,
    is_done_column BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_column_board FOREIGN KEY (board_id) REFERENCES board(id) ON DELETE CASCADE
);

CREATE INDEX idx_column_board_id ON kanban_column(board_id);

CREATE TABLE card (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    column_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    story_points INT NOT NULL DEFAULT 0,
    position INT NOT NULL DEFAULT 0,
    completed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_card_column FOREIGN KEY (column_id) REFERENCES kanban_column(id) ON DELETE CASCADE,
    CONSTRAINT chk_story_points_non_negative CHECK (story_points >= 0)
);

CREATE INDEX idx_card_column_id ON card(column_id);
CREATE INDEX idx_card_completed_at ON card(completed_at);
