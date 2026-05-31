import pypdfium2 as pdfium
import sys
import re
import time

def main():
    path = "/Users/shreyansh/Pump Scans Image/Transactions_Report_14:03:2025-28:05:2026.pdf"
    target_date = "28-05-2026"
    if len(sys.argv) > 1:
        target_date = sys.argv[1]
        
    print(f"Searching for date: {target_date} in PDF...")
    start_time = time.time()
    
    try:
        pdf = pdfium.PdfDocument(path)
        total_pages = len(pdf)
        print(f"Loaded PDF with {total_pages} pages in {time.time() - start_time:.2f} seconds.")
        
        matches = []
        
        for i in range(total_pages):
            page = pdf[i]
            textpage = page.get_textpage()
            text = textpage.get_text_range()
            
            # Simple line-by-line scanning
            lines = text.split("\n")
            for line in lines:
                if target_date in line:
                    matches.append((i + 1, line))
                    
        end_time = time.time()
        print(f"Scanned all {total_pages} pages in {end_time - start_time:.2f} seconds. Found {len(matches)} matches.")
        
        # Display first 20 matches
        print("\nFirst 20 Matches:")
        for page_num, line in matches[:20]:
            print(f"Page {page_num}: {line}")
            
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)

if __name__ == '__main__':
    main()
