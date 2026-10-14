const { spawn } = require('child_process');
const path = require('path');

exports.extractDates = async (req, res) => {
  try {
    console.log("📸 OCR request received");
    
    if (!req.file) {
      console.log("❌ No file uploaded");
      return res.status(400).json({ error: 'No image provided' });
    }

    const imagePath = req.file.path;
    console.log("📁 Image path:", imagePath);
    
    const scriptPath = path.join(__dirname, '../../expiry-tracker-python/inference.py');
    console.log("🐍 Script path:", scriptPath);

    const python = spawn('python', [scriptPath, imagePath]);

    let result = '';
    let error = '';

    python.stdout.on('data', (data) => {
      console.log("✅ Python output:", data.toString());
      result += data.toString();
    });

    python.stderr.on('data', (data) => {
      console.log("❌ Python error:", data.toString());
      error += data.toString();
    });

    python.on('close', (code) => {
      console.log("🔴 Process closed with code:", code);
      try {
        const detected = JSON.parse(result);
        console.log("✅ Detection result:", detected);
        res.json(detected);
      } catch (e) {
        console.log("❌ JSON parse error:", e.message);
        res.status(500).json({ error: 'Parse failed', details: error });
      }
    });

  } catch (error) {
    console.log("❌ Controller error:", error.message);
    res.status(500).json({ error: error.message });
  }
};