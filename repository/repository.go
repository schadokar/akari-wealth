package repository

import (
	"database/sql"
	"time"
)

type Repository struct {
	db *sql.DB
}

func New(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// parseTime parses SQLite timestamp strings into time.Time.
func parseTime(s string) time.Time {
	t, _ := time.Parse("2006-01-02T15:04:05Z", s)
	return t
}
