from ultralytics import YOLO
import json
import sys
import os
import cv2
import easyocr
import warnings
import re
from datetime import datetime
from dateutil.relativedelta import relativedelta

warnings.filterwarnings('ignore')
os.environ['YOLO_VERBOSE'] = 'false'

model_path = r'C:\Users\victus\project1\expiry-tracker-python\best.pt'
model = YOLO(model_path, verbose=False)
reader = easyocr.Reader(['en'], verbose=False)

MONTHS = {'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
          'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12}

def extract_shelf_life(text):
    """Extract shelf life in months - ALL formats"""
    text_upper = text.upper()
    
    patterns = [
        r'BEST\s+BEFORE\s+(\d+)\s+MONTHS?',
        r'USE\s+WITHIN\s+(\d+)\s+MONTHS?',
        r'USE\s+BEFORE\s+(\d+)\s+MONTHS?',
        r'VALID\s+FOR\s+(\d+)\s+MONTHS?',
        r'SHELF\s+LIFE\s*[:=]\s*(\d+)\s+MONTHS?',
        r'(\d+)\s+MONTHS?\s+FROM',
        r'(\d+)\s+MONTHS?\s+AFTER',
        r'EXPIRY\s+(?:AFTER|IN)\s+(\d+)\s+MONTHS?',
        r'(\d+)\s+YEARS?\s+FROM',
        r'VALID\s+FOR\s+(\d+)\s+YEARS?',
        r'(\d+)\s+WEEKS?\s+FROM',
        r'(\d+)\s+DAYS?\s+FROM',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text_upper)
        if match:
            try:
                value = int(match.group(1))
                
                if 'YEAR' in pattern:
                    value = value * 12
                elif 'WEEK' in pattern:
                    value = max(1, value // 4)
                elif 'DAY' in pattern:
                    value = max(1, value // 30)
                
                if 1 <= value <= 120:
                    return value
            except:
                continue
    
    return None

def extract_all_dates(text):
    """Extract ALL date formats"""
    dates = []
    text_upper = text.upper()
    
    # Format 1: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
    for m in re.finditer(r'(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})', text):
        d, mo, y = m.groups()
        dates.append(f"{y}-{mo.zfill(2)}-{d.zfill(2)}")
    
    # Format 2: YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD
    for m in re.finditer(r'(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})', text):
        y, mo, d = m.groups()
        dates.append(f"{y}-{mo.zfill(2)}-{d.zfill(2)}")
    
    # Format 3: DD/MM/YY, DD-MM-YY, DD.MM.YY
    for m in re.finditer(r'(\d{1,2})[/.-](\d{1,2})[/.-](\d{2})(?!\d)', text):
        d, mo, y = m.groups()
        y = '20' + y if int(y) < 80 else '19' + y
        dates.append(f"{y}-{mo.zfill(2)}-{d.zfill(2)}")
    
    # Format 4: DD MON YYYY (24 AUG 2026)
    for m in re.finditer(r'(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{4})', text_upper):
        d, mon_str, y = m.groups()
        mon_short = mon_str[:3]
        if mon_short in MONTHS:
            mo = MONTHS[mon_short]
            dates.append(f"{y}-{mo:02d}-{d.zfill(2)}")
    
    # Format 5: MON YYYY (AUG 2026)
    for m in re.finditer(r'(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{4})', text_upper):
        mon_str, y = m.groups()
        mon_short = mon_str[:3]
        if mon_short in MONTHS:
            mo = MONTHS[mon_short]
            dates.append(f"{y}-{mo:02d}-01")
    
    # Format 6: DD/MON/YY (24/AUG/26)
    for m in re.finditer(r'(\d{1,2})/(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/(\d{2})', text_upper):
        d, mon_str, y = m.groups()
        mon_short = mon_str[:3]
        if mon_short in MONTHS:
            mo = MONTHS[mon_short]
            y = '20' + y if int(y) < 80 else '19' + y
            dates.append(f"{y}-{mo:02d}-{d.zfill(2)}")
    
    # Format 7: MM/YYYY, MM-YYYY (08/2026)
    for m in re.finditer(r'(\d{1,2})[/-](\d{4})', text):
        mo, y = m.groups()
        dates.append(f"{y}-{mo.zfill(2)}-01")
    
    return sorted(set(dates))

def detect_dates(image_path):
    """Main detection function"""
    try:
        image = cv2.imread(image_path)
        if image is None:
            return {'mfg_date': 'Not detected', 'exp_date': 'Not detected', 'success': False}
        
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # OCR
        ocr_results = reader.readtext(gray)
        text = ' '.join([r[1] for r in ocr_results])
        
        # Extract shelf life
        shelf_life = extract_shelf_life(text)
        
        # Extract all dates
        all_dates = extract_all_dates(text)
        
        mfg_date = 'Not detected'
        exp_date = 'Not detected'
        
        # Logic:
        # 1. If shelf life + date: MFG = first date, EXP = MFG + shelf life
        # 2. If 2+ dates: MFG = first, EXP = second
        # 3. If 1 date + shelf life: MFG = that date, EXP = MFG + shelf life
        # 4. If 1 date, no shelf life: MFG = that date (at least detect something)
        # 5. No dates, no shelf life: both not detected
        
        if shelf_life and len(all_dates) > 0:
            # Case 1: Shelf life + date
            mfg_date = all_dates[0]
            try:
                mfg_dt = datetime.strptime(mfg_date, '%Y-%m-%d')
                exp_dt = mfg_dt + relativedelta(months=shelf_life)
                exp_date = exp_dt.strftime('%Y-%m-%d')
            except:
                pass
        
        elif len(all_dates) >= 2:
            # Case 2: Two or more dates
            mfg_date = all_dates[0]
            exp_date = all_dates[1]
        
        elif len(all_dates) == 1 and shelf_life:
            # Case 3: One date + shelf life
            mfg_date = all_dates[0]
            try:
                mfg_dt = datetime.strptime(mfg_date, '%Y-%m-%d')
                exp_dt = mfg_dt + relativedelta(months=shelf_life)
                exp_date = exp_dt.strftime('%Y-%m-%d')
            except:
                pass
        
        elif len(all_dates) == 1:
            # Case 4: Only one date, no shelf life
            mfg_date = all_dates[0]
        
        return {
            'mfg_date': mfg_date,
            'exp_date': exp_date,
            'success': True
        }
    
    except:
        return {'mfg_date': 'Not detected', 'exp_date': 'Not detected', 'success': False}

if __name__ == '__main__':
    image_path = sys.argv[1]
    result = detect_dates(image_path)
    print(json.dumps(result))