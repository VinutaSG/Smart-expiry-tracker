import os
os.environ['TESSDATA_PREFIX'] = r'C:\Program Files\Tesseract-OCR\tessdata'
from flask import Flask, request, jsonify
from flask_cors import CORS
import pytesseract
import cv2
import numpy as np
import os
from PIL import Image
import re

app = Flask(__name__)
CORS(app)

# Configure Tesseract path
# Windows:
pytesseract.pytesseract.pytesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
# Mac/Linux: pytesseract finds it automatically
@app.route('/api/health', methods=['GET'])
@app.route("/")
def home():
    return "OCR Service Running"
# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/api/ocr/extract', methods=['POST'])
def extract_text_and_dates():
    """
    Receives image from Node.js
    Returns: MFG date, EXP date, shelf life
    """
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400

        image_file = request.files['image']
        
        # Save image temporarily
        image_path = os.path.join(UPLOAD_FOLDER, image_file.filename)
        image_file.save(image_path)

        # Process image
        result = process_product_image(image_path)

        # Delete temporary file
        os.remove(image_path)

        return jsonify(result), 200

    except Exception as e:
        import traceback
        print(f"ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

def process_product_image(image_path):
    """
    Main processing function
    """
    # Read image
    image = cv2.imread(image_path)
    
    if image is None:
        return {'error': 'Could not read image'}
    
    # Preprocess image for better OCR
    processed_image = preprocess_image(image)

    # Extract text using Tesseract
    extracted_text = pytesseract.image_to_string(processed_image)
    extracted_text_lower = extracted_text.lower()

    # Parse dates and shelf life
    dates = extract_dates_and_shelf_life(extracted_text_lower)

    return {
        'success': True,
        'extracted_text': extracted_text,
        'mfg_date': dates['mfg'],
        'exp_date': dates['exp'],
        'shelf_life_months': dates['shelf_life'],
        'expiry_type': dates['expiry_type'],
        'confidence': 85,
        'suggestions': dates['suggestions']
    }

def preprocess_image(image):
    """
    Improve image quality for better OCR
    """
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Increase contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # Threshold (black and white)
    _, binary = cv2.threshold(enhanced, 150, 255, cv2.THRESH_BINARY)

    # Denoise
    denoised = cv2.fastNlMeansDenoising(binary)

    return denoised

def extract_dates_and_shelf_life(text):
    """
    Extract dates and shelf life from text
    """
    result = {
        'mfg': None,
        'exp': None,
        'shelf_life': None,
        'expiry_type': 'fixed_date',
        'suggestions': []
    }

    # Pattern for MFG date (flexible format)
    mfg_patterns = [
        r'(?:mfg|manufactured|made|batch|batch\s+no)[:\s-]*(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})',
        r'mfg\s*date[:\s-]*(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})',
        r'(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})',  # Generic DD/MM/YY
    ]

    for pattern in mfg_patterns:
        mfg_match = re.search(pattern, text, re.IGNORECASE)
        if mfg_match:
            result['mfg'] = format_date(mfg_match.groups())
            if result['mfg']:
                break

    # Pattern for EXP date
    exp_patterns = [
        r'(?:exp|expiry|expiration|best\s+before|best\s+by|use\s+by|use\s+before)[:\s-]*(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})',
        r'(?:exp|expiry)[:\s-]*(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})',
    ]

    for pattern in exp_patterns:
        exp_match = re.search(pattern, text, re.IGNORECASE)
        if exp_match:
            result['exp'] = format_date(exp_match.groups())
            if result['exp']:
                break

    return result

def format_date(groups):
    """
    Format date from regex groups
    Returns YYYY-MM-DD format
    """
    months = {
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
    }

    # If first group is month name
    if not groups[0].isdigit():
        month = months.get(groups[0].lower()[:3], '01')
        day = str(groups[1]).zfill(2)
        year = str(groups[2])
    else:
        day = str(groups[0]).zfill(2)
        month = str(groups[1]).zfill(2)
        year = str(groups[2])

    # Handle 2-digit years
    if len(year) == 2:
        year = '19' + year if int(year) > 50 else '20' + year

    return f"{year}-{month}-{day}"

def calculate_expiry_date(mfg_date, months_to_add):
    """
    Calculate expiry date from MFG date
    """
    from datetime import datetime
    from dateutil.relativedelta import relativedelta

    try:
        mfg = datetime.strptime(mfg_date, '%Y-%m-%d')
        exp = mfg + relativedelta(months=months_to_add)
        return exp.strftime('%Y-%m-%d')
    except:
        return None

@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Simple health check endpoint
    """
    return jsonify({'status': 'Python OCR service is running', 'port': 5001}), 200

if __name__ == '__main__':
    print("🐍 Starting Python OCR Service...")
    print("📍 Running on http://localhost:5001")
    print("📸 Ready to process images")
    app.run(debug=True, port=5001)