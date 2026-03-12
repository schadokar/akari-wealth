package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/sqlite"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "modernc.org/sqlite"

	"github.com/perfi/handler"
	"github.com/perfi/repository"
	"github.com/perfi/seed"
	"github.com/perfi/usecase"
)

var tableName string

func init() {
	tableName = "perfi"
	if os.Getenv("DB_NAME") != "" {
		tableName = os.Getenv("DB_NAME")
	}
	log.Println("Connecting to db: ", tableName)
}

func main() {
	cleanDB := flag.Bool("clean-db", false, "drop all tables and exit")
	flag.Parse()

	if *cleanDB {
		dropAllTables()
		return
	}

	db, err := sql.Open("sqlite", fmt.Sprintf("./%s.db?_texttotime=true", tableName))

	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		log.Fatal(err)
	}

	runMigrations()

	repo := repository.New(db)

	err = repo.LoadFinancialInstruments(context.Background(), "./db/data/financial_instruments.csv")
	if err != nil {
		log.Fatal("error while loading the financial instruments", err)
	}

	uc := usecase.New(repo)

	seed.Run(context.Background(), uc, repo)

	h := handler.New(uc)

	log.Println("listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", h.Routes()))
}

func dropAllTables() {
	m, err := migrate.New("file://db/migrations", getMigrateDBString())
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
	m, err := migrate.New("file://db/migrations", getMigrateDBString())
	if err != nil {
		log.Fatal("migrations init:", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatal("migrations up:", err)
	}
}

func getMigrateDBString() string {
	return fmt.Sprintf("sqlite://./%s.db", tableName)
}
