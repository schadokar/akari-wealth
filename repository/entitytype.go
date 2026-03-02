package repository

import (
	"context"
	"encoding/csv"
	"os"
)

func (r *Repository) LoadEntityTypes(ctx context.Context, filePath string) error {
	f, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer f.Close()

	records, err := csv.NewReader(f).ReadAll()
	if err != nil {
		return err
	}

	for _, row := range records[1:] { // skip header row
		_, err := r.db.ExecContext(ctx,
			`INSERT INTO entity_types (id, category, name, kind) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING`,
			row[0], row[1], row[2], row[3],
		)
		if err != nil {
			return err
		}
	}
	return nil
}
