import torch
from ultralytics import YOLO

# Check if GPU available
print(f"GPU Available: {torch.cuda.is_available()}")

# Load YOLOv5 model
model = YOLO('yolov5s.pt')

# Train
results = model.train(
    data='expdate/data.yaml',
    epochs=40,
    imgsz=640,
    batch=16,
    patience=10,
    device=0 if torch.cuda.is_available() else 'cpu',
    project='runs/detect',
    name='expiry_model',
    exist_ok=True,
    save_period=5
)

print("✅ Training complete!")
print(f"Best model: runs/detect/expiry_model/weights/best.pt")