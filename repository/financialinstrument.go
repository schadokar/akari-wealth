package repository

import (
	"context"
	"encoding/csv"
	"os"
)

func (r *Repository) LoadFinancialInstruments(ctx context.Context, filePath string) error {
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
		// CSV columns: name, symbol, isin, asset_class, instrument_type, provider
		_, err := r.db.ExecContext(ctx,
			`INSERT INTO financial_instruments (name, symbol, isin_code, asset_class, instrument_type, provider)
			 VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
			row[0], row[1], row[2], row[3], row[4], row[5],
		)
		if err != nil {
			return err
		}
	}
	return nil
}
