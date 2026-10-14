import json
import os
from pathlib import Path
import shutil

os.makedirs('expdate/labels/train', exist_ok=True)
os.makedirs('expdate/images/train', exist_ok=True)

def convert_custom_json(json_file, images_dir):
    """Convert custom JSON format to YOLO"""
    
    with open(json_file) as f:
        data = json.load(f)
    
    for img_name, img_data in data.items():
        height = img_data['height']
        width = img_data['width']
        
        # Create label file
        label_name = Path(img_name).stem
        label_file = f'expdate/labels/train/{label_name}.txt'
        
        for ann in img_data.get('ann', []):
            bbox = ann['bbox']  # [x1, y1, x2, y2]
            
            # Convert to YOLO format (center x, center y, width, height - normalized)
            x_center = (bbox[0] + bbox[2]) / 2 / width
            y_center = (bbox[1] + bbox[3]) / 2 / height
            box_width = (bbox[2] - bbox[0]) / width
            box_height = (bbox[3] - bbox[1]) / height
            
            with open(label_file, 'a') as f:
                f.write(f"0 {x_center} {y_center} {box_width} {box_height}\n")
        
        # Copy image
        img_path = os.path.join(images_dir, img_name)
        if os.path.exists(img_path):
            shutil.copy(img_path, 'expdate/images/train/')
            print(f"✅ {img_name}")

# Process all folders
folders = ['Date-Real', 'Components-Real']
for folder in folders:
    json_file = f'{folder}/annotations.json'
    images_dir = f'{folder}/images'
    
    if os.path.exists(json_file):
        print(f"\nProcessing {folder}...")
        convert_custom_json(json_file, images_dir)

# Products-Real nested
for split in ['train', 'evaluation']:
    json_file = f'Products-Real/{split}/annotations.json'
    images_dir = f'Products-Real/{split}/images'
    
    if os.path.exists(json_file):
        print(f"\nProcessing Products-Real/{split}...")
        convert_custom_json(json_file, images_dir)

print("\n✅ All conversions complete!")