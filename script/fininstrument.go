package main

import (
	"bufio"
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"os"
	"strings"
)

type Instrument struct {
	Name           string
	Symbol         string
	ISIN           string
	AssetClass     string
	InstrumentType string
	Provider       string
}

func main() {
	var masterList []Instrument
	
	// 1. Fetch all Banks from local CSV
	fmt.Println("Fetching Bank data...")
	banks := fetchBanks()
	masterList = append(masterList, banks...)

	// 2. Fetch all listed Stocks from NSE
	fmt.Println("Fetching Stock data...")
	stocks := fetchNSEData()
	masterList = append(masterList, stocks...)

	// 3. Fetch all Mutual Funds from AMFI
	fmt.Println("Fetching Mutual Fund data...")
	mfs := fetchMFData()
	masterList = append(masterList, mfs...)


	// 4. Save to CSV
	file, err := os.Create("./db/data/financial_instruments.csv")
	if err != nil {
		fmt.Println("Error creating file:", err)
		return
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	// Header
	writer.Write([]string{"name", "symbol", "isin", "asset_class", "instrument_type", "provider"})

	for _, inst := range masterList {
		writer.Write([]string{inst.Name, inst.Symbol, inst.ISIN, inst.AssetClass, inst.InstrumentType, inst.Provider})
	}

	fmt.Println("Success! CSV generated with", len(masterList), "records.")
}

func fetchNSEData() []Instrument {
	url := "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv"

	jar, _ := cookiejar.New(nil)
	client := &http.Client{Jar: jar}

	// NSE requires a session cookie — visit the homepage first
	homeReq, _ := http.NewRequest("GET", "https://www.nseindia.com", nil)
	homeReq.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
	homeResp, err := client.Do(homeReq)
	if err != nil {
		fmt.Println("Error fetching NSE homepage:", err)
		return nil
	}
	homeResp.Body.Close()

	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")

	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Error fetching NSE CSV:", err)
		return nil
	}
	defer resp.Body.Close()

	reader := csv.NewReader(resp.Body)
	// Skip header
	reader.Read()

	var list []Instrument
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			fmt.Println("Error reading record:", err)
			continue
		}
		list = append(list, Instrument{
			Name:           record[1],
			Symbol:         record[0],
			ISIN:           record[6],
			AssetClass:     "EQUITY",
			InstrumentType: "COMMON_STOCK",
			Provider:       "NSE",
		})
	}
	return list
}

// amcMapping maps scheme name keywords to short AMC names.
var amcMapping = []struct {
	keyword   string
	shortName string
}{
	// Longer/more-specific keywords first to avoid false positives
	{"360 ONE", "360ONE AMC"},
	{"Aditya Birla Sun Life", "ABSL AMC"},
	{"Abakkus", "Abakkus AMC"},
	{"Angel One", "Angel One AMC"},
	{"Bajaj Finserv", "Bajaj AMC"},
	{"Bank of India", "BOI AMC"},
	{"Baroda BNP Paribas", "Baroda AMC"},
	{"Canara Robeco", "Canara AMC"},
	{"Capitalmind", "Capitalmind AMC"},
	{"Choice", "Choice AMC"},
	{"Edelweiss", "Edelweiss AMC"},
	{"Franklin India", "Franklin AMC"},
	{"Templeton India", "Franklin AMC"},
	{"Franklin U.S.", "Franklin AMC"},
	{"Franklin Asian", "Franklin AMC"},
	{"Helios", "Helios AMC"},
	{"HSBC", "HSBC AMC"},
	{"ICICI Prudential", "ICICI Pru AMC"},
	{"IDFC", "IDFC AMC"},
	{"IL&FS", "ILFS AMC"},
	{"Invesco India", "Invesco AMC"},
	{"ITI", "ITI AMC"},
	{"JioBlackRock", "JioBlackRock AMC"},
	{"JM ", "JM AMC"},
	{"Kotak", "Kotak AMC"},
	{"LIC MF", "LIC AMC"},
	{"Mahindra Manulife", "Mahindra AMC"},
	{"Mirae Asset", "Mirae Asset AMC"},
	{"Motilal Oswal", "Motilal Oswal AMC"},
	{"Nippon India", "Nippon India AMC"},
	{"NJ ", "NJ AMC"},
	{"Old Bridge", "Old Bridge AMC"},
	{"Parag Parikh", "PPFAS AMC"},
	{"PPFAS", "PPFAS AMC"},
	{"PGIM India", "PGIM AMC"},
	{"Reliance", "Reliance AMC"},
	{"Samco", "Samco AMC"},
	{"Shriram", "Shriram AMC"},
	{"Sundaram", "Sundaram AMC"},
	{"Taurus", "Taurus AMC"},
	{"The Wealth Company", "TWC AMC"},
	{"TRUSTMF", "TrustMF AMC"},
	{"TRUST MF", "TrustMF AMC"},
	{"Unifi", "Unifi AMC"},
	{"Union", "Union AMC"},
	{"WhiteOak Capital", "WhiteOak AMC"},
	{"Whiteoak Capital", "WhiteOak AMC"},
	{"HDFC", "HDFC AMC"},
	{"SBI", "SBI AMC"},
	{"Axis", "Axis AMC"},
	{"UTI", "UTI AMC"},
	{"DSP", "DSP AMC"},
	{"Tata", "Tata AMC"},
	{"Bandhan", "Bandhan AMC"},
	{"Quant", "Quant AMC"},
	{"Zerodha", "Zerodha AMC"},
	{"Groww", "Groww AMC"},
	{"Navi", "Navi AMC"},
}

func resolveAMC(schemeName string) string {
	upper := strings.ToUpper(schemeName)
	for _, amc := range amcMapping {
		if strings.Contains(upper, strings.ToUpper(amc.keyword)) {
			return amc.shortName
		}
	}
	return "OTHER"
}

func parseInstrumentType(categoryLine string) string {
	upper := strings.ToUpper(categoryLine)
	switch {
	case strings.Contains(upper, "EQUITY"):
		return "EQUITY"
	case strings.Contains(upper, "DEBT"):
		return "DEBT"
	case strings.Contains(upper, "HYBRID"):
		return "HYBRID"
	case strings.Contains(upper, "SOLUTION ORIENTED"):
		return "SOLUTION_ORIENTED"
	case strings.Contains(upper, "INDEX"):
		return "INDEX"
	case strings.Contains(upper, "ETF"):
		return "ETF"
	case strings.Contains(upper, "FUND OF FUNDS"):
		return "FUND_OF_FUNDS"
	default:
		return "OTHER"
	}
}

func fetchMFData() []Instrument {
	url := "https://portal.amfiindia.com/spages/NAVAll.txt"

	resp, err := http.Get(url)
	if err != nil {
		fmt.Println("Error fetching AMFI data:", err)
		return nil
	}
	defer resp.Body.Close()

	var list []Instrument
	var currentType string
	scanner := bufio.NewScanner(resp.Body)
	// Skip the header line
	scanner.Scan()

	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}

		// Category headers don't contain semicolons, e.g.:
		// "Open Ended Schemes(Equity Scheme - Large Cap Fund)"
		if !strings.Contains(line, ";") && strings.Contains(line, "Scheme") {
			currentType = parseInstrumentType(line)
			continue
		}

		fields := strings.Split(line, ";")
		if len(fields) < 6 {
			continue
		}

		schemeCode := strings.TrimSpace(fields[0])
		isin := strings.TrimSpace(fields[1])
		schemeName := strings.TrimSpace(fields[3])

		if schemeCode == "" || isin == "" || isin == "-" {
			continue
		}

		list = append(list, Instrument{
			Name:           schemeName,
			Symbol:         schemeCode,
			ISIN:           isin,
			AssetClass:     "MUTUAL_FUND",
			InstrumentType: currentType,
			Provider:       resolveAMC(schemeName),
		})
	}

	if err := scanner.Err(); err != nil {
		fmt.Println("Error reading AMFI data:", err)
	}

	return list
}

func fetchBanks() []Instrument {
	file, err := os.Open("./db/data/banks.csv")
	if err != nil {
		fmt.Println("Error opening banks.csv:", err)
		return nil
	}
	defer file.Close()

	reader := csv.NewReader(file)
	// Skip header
	reader.Read()

	var list []Instrument
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			fmt.Println("Error reading record:", err)
			continue
		}
		list = append(list, Instrument{
			Name:           record[1],
			Symbol:         record[2],
			ISIN:           record[6],
			AssetClass:     record[3],
			InstrumentType: record[4],
			Provider:       record[5],
		})
	}
	return list
}