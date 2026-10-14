# Smart Expiry Tracker

ML-based backend system for automatic expiry date detection from product images using YOLOv5.

## Tech Stack
- Node.js + Express (Backend)
- Python + YOLOv5 + EasyOCR (ML)
- MySQL (Database)
- JWT + bcryptjs (Auth)
- Docker

## Features
- Automatic date detection (85.8% accuracy)
- Supports 9+ date formats
- JWT authentication
- Product inventory management
- Automated expiry alerts

## Quick Start

### Backend
```bash
cd expiry-tracker-backend
npm install
npm start 
```

### Python ML
```bash
cd expiry-tracker-python
pip install -r requirements.txt
python inference.py <image_path>  
```

## API Endpoints
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `POST /api/ocr/extract` - Detect dates
- `POST /api/products/add` - Add product
- `GET /api/products/inventory` - Get inventory
- `DELETE /api/products/:id` - Delete

## Database Setup
```sql
CREATE DATABASE expiry_tracker;
```
