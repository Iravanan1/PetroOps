import pypdfium2 as pdfium
import sys
import re
import json
import time

def parse_line(line):
    # Match standard transaction lines like:
    # 1 300073638 28-05-2026 15:10:07 1 3 1 HSD 99.25 5.04 500 0 500
    # Wait, some lines might be split or wrapped across PDF page extraction
    # Let's write a robust parser
    tokens = line.strip().split()
    if len(tokens) < 10:
        return None
        
    # We want to identify Product (HSD/MS/SPEED), Unit Price, Volume, Amount
    # Let's search for HSD or MS or SPEED
    try:
        fuel_idx = -1
        for i, tok in enumerate(tokens):
            if tok.upper() in ["HSD", "MS", "SPEED"]:
                fuel_idx = i
                break
                
        if fuel_idx == -1 or fuel_idx < 3:
            return None
            
        fuel_type = tokens[fuel_idx].upper()
        pump_no = tokens[fuel_idx - 2]
        nozzle_no = tokens[fuel_idx - 1]
        
        # Unit price, volume, amount
        price = float(tokens[fuel_idx + 1].replace(",", ""))
        vol = float(tokens[fuel_idx + 2].replace(",", ""))
        amt = float(tokens[fuel_idx + 3].replace(",", ""))
        
        # Transaction date is before pump_no
        # Mapped date is standard DD-MM-YYYY in the transaction log
        # Let's search for a DD-MM-YYYY token
        date_token = ""
        for tok in tokens:
            if re.match(r'^\d{2}-\d{2}-\d{4}$', tok):
                date_token = tok
                break
                
        if not date_token:
            return None
            
        # Reformat date to standard YYYY-MM-DD
        d, m, y = date_token.split("-")
        date_str = f"{y}-{m}-{d}"
        
        return {
            "date": date_str,
            "pump": pump_no,
            "nozzle": nozzle_no,
            "fuel": fuel_type,
            "price": price,
            "volume": vol,
            "amount": amt
        }
    except Exception:
        return None

def main():
    pdf_path = "/Users/shreyansh/Pump Scans Image/Transactions_Report_14:03:2025-28:05:2026.pdf"
    output_path = "/Users/shreyansh/PumpAI-Compare/PetroOps/scripts/transaction_index.json"
    
    print("Starting full transaction PDF indexer...")
    start_time = time.time()
    
    try:
        pdf = pdfium.PdfDocument(pdf_path)
        total_pages = len(pdf)
        
        index = {} # structure: { "YYYY-MM-DD": { "MS": { "volume": 0, "amount": 0 }, "HSD": { "volume": 0, "amount": 0 } } }
        
        # In addition, we will track detailed nozzle-level logs
        detailed_index = {} # structure: { "YYYY-MM-DD": { "nozzles": { "pump_nozzle": { "volume": 0, "amount": 0 } } } }

        count = 0
        
        for i in range(total_pages):
            page = pdf[i]
            textpage = page.get_textpage()
            text = textpage.get_text_range()
            
            lines = text.split("\n")
            for line in lines:
                tx = parse_line(line)
                if tx:
                    count += 1
                    date = tx["date"]
                    fuel = tx["fuel"]
                    vol = tx["volume"]
                    amt = tx["amount"]
                    nozzle_key = f"{tx['pump']}_{tx['nozzle']}"
                    
                    # 1. Product totals
                    if date not in index:
                        index[date] = {}
                    if fuel not in index[date]:
                        index[date][fuel] = {"volume": 0.0, "amount": 0.0}
                    
                    index[date][fuel]["volume"] = round(index[date][fuel]["volume"] + vol, 2)
                    index[date][fuel]["amount"] = round(index[date][fuel]["amount"] + amt, 2)
                    
                    # 2. Nozzle-level totals
                    if date not in detailed_index:
                        detailed_index[date] = {}
                    if nozzle_key not in detailed_index[date]:
                        detailed_index[date][nozzle_key] = {"volume": 0.0, "amount": 0.0, "fuel": fuel}
                        
                    detailed_index[date][nozzle_key]["volume"] = round(detailed_index[date][nozzle_key]["volume"] + vol, 2)
                    detailed_index[date][nozzle_key]["amount"] = round(detailed_index[date][nozzle_key]["amount"] + amt, 2)

            if (i + 1) % 100 == 0:
                print(f"Processed {i + 1}/{total_pages} pages...")
                
        # Save indices to a single structured JSON database file
        database = {
            "product_totals": index,
            "nozzle_totals": detailed_index,
            "metadata": {
                "total_pages": total_pages,
                "total_transactions": count,
                "indexed_dates_count": len(index),
                "generated_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }
        }
        
        with open(output_path, 'w') as f:
            json.dump(database, f, indent=2)
            
        print(f"Index compiled successfully in {time.time() - start_time:.2f} seconds!")
        print(f"Total Transactions parsed: {count}")
        print(f"Total Unique Mapped Dates: {len(index)}")
        print(f"Saved to {output_path}")
        
    except Exception as e:
        print(f"Error compiling index: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
