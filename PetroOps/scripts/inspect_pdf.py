import pypdfium2 as pdfium
import sys

def main():
    path = "/Users/shreyansh/Pump Scans Image/Transactions_Report_14:03:2025-28:05:2026.pdf"
    print("Loading PDF...")
    try:
        pdf = pdfium.PdfDocument(path)
        print("Total Pages:", len(pdf))
        
        # Load page 1
        page = pdf[0]
        textpage = page.get_textpage()
        text = textpage.get_text_range()
        print("Page 1 Text Content:")
        print(text[:2000]) # print first 2000 chars
    except Exception as e:
        print(f"Error loading PDF: {e}", file=sys.stderr)

if __name__ == '__main__':
    main()
