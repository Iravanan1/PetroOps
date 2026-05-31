import os
import re
import easyocr

def extract_jpg_from_pdf(pdf_path, output_jpg_path):
    print(f"Extracting image from {pdf_path}...")
    with open(pdf_path, 'rb') as f:
        data = f.read()
    
    # Look for JFIF / JPEG start and end markers
    start_marker = b'\xff\xd8'
    end_marker = b'\xff\xd9'
    
    start_idx = data.find(start_marker)
    if start_idx == -1:
        print("JPEG start marker not found.")
        return False
        
    end_idx = data.find(end_marker, start_idx)
    if end_idx == -1:
        print("JPEG end marker not found.")
        return False
        
    # Include the end marker in the sliced data
    jpg_data = data[start_idx:end_idx + 2]
    
    with open(output_jpg_path, 'wb') as out_f:
        out_f.write(jpg_data)
    print(f"Saved image to {output_jpg_path} ({len(jpg_data)} bytes)")
    return True

def run_ocr(image_path):
    print("Initializing EasyOCR...")
    reader = easyocr.Reader(['en'])
    print("Running OCR on image...")
    result = reader.readtext(image_path, detail=0)
    print("OCR Results:")
    for line in result:
        print(line)
    return result

if __name__ == '__main__':
    pdf = "/Users/shreyansh/Pump Scans Image/14.03.2025 to 08.07.2025/14.03.2025 to 08.07.2025_page_1.pdf"
    jpg = "./page_1_extracted.jpg"
    
    if extract_jpg_from_pdf(pdf, jpg):
        run_ocr(jpg)
