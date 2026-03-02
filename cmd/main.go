package main

import (
	"context"
	"database/sql"
	"flag"
	"log"
	"net/http"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/sqlite"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "modernc.org/sqlite"

	"github.com/perfi/handler"
	"github.com/perfi/repository"
	"github.com/perfi/usecase"
)

func main() {
	cleanDB := flag.Bool("clean-db", false, "drop all tables and exit")
	flag.Parse()

	if *cleanDB {
		dropAllTables()
		return
	}

	db, err := sql.Open("sqlite", "./perfi.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		log.Fatal(err)
	}

	runMigrations()

	repo := repository.New(db)
	err = repo.LoadEntityTypes(context.Background(), "./db/data/entity_type.csv")
	if err != nil {
		log.Fatal("error while loading the entity types", err)
	}

	err = repo.LoadFinancialInstruments(context.Background(), "./db/data/financial_instruments.csv")
	if err != nil {
		log.Fatal("error while loading the financial instruments", err)
	}

	uc := usecase.New(repo)
	h := handler.New(uc)

	log.Println("listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", h.Routes()))
}

func dropAllTables() {
	m, err := migrate.New("file://db/migrations", "sqlite://./perfi.db")
	if err != nil {
		log.Fatal("migrations init:", err)
	}
	defer m.Close()

	if err := m.Down(); err != nil && err != migrate.ErrNoChange {
		log.Fatal("migrations down:", err)
	}
	log.Println("all tables dropped")
}

func runMigrations() {
	m, err := migrate.New("file://db/migrations", "sqlite://./perfi.db")
	if err != nil {
		log.Fatal("migrations init:", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatal("migrations up:", err)
	}
}
