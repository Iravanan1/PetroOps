import pandas as pd
import sys

def main():
    path = "/Users/shreyansh/Pump Scans Image/Transactions_Report_14:03:2025-28:05:2026.xlsx"
    print("Loading Excel headers...")
    try:
        # Read only the first 5 rows to be fast
        df = pd.read_excel(path, nrows=5)
        print("Columns:")
        print(df.columns.tolist())
        print("\nFirst 3 rows:")
        print(df.head(3).to_dict(orient='records'))
    except Exception as e:
        print(f"Error loading Excel: {e}", file=sys.stderr)

if __name__ == '__main__':
    main()
