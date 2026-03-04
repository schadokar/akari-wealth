package repository

import (
	"context"

	"github.com/perfi/model"
)

func (r *Repository) SearchFinancialInstruments(ctx context.Context, query, instrumentType string, limit int) ([]model.FinancialInstrument, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, name, symbol, asset_class, instrument_type, provider, isin_code
		 FROM financial_instruments
		 WHERE asset_class = ?
		   AND (LOWER(name) LIKE LOWER(?) OR LOWER(symbol) LIKE LOWER(?))
		 ORDER BY name
		 LIMIT ?`,
		instrumentType, "%"+query+"%", "%"+query+"%", limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []model.FinancialInstrument
	for rows.Next() {
		var fi model.FinancialInstrument
		if err := rows.Scan(&fi.ID, &fi.Name, &fi.Symbol, &fi.AssetClass, &fi.InstrumentType, &fi.Provider, &fi.ISINCode); err != nil {
			return nil, err
		}
		results = append(results, fi)
	}
	return results, rows.Err()
}
