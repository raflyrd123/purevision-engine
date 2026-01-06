import os
import io
import time
import requests
import tensorflow as tf
import tensorflow_hub as hub
from PIL import Image
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# KONFIGURASI SUPABASE
SUPABASE_URL = "https://hozagzkmvbpnjqqwnyan.supabase.co/" 
SUPABASE_KEY = "sb_publishable_08KdztH13g9hGEzJCSzDIA_yM6Z1Gnq" 
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# LOAD MODEL
print("Sedang memuat model ESRGAN...")
model = hub.load("https://tfhub.dev/captain-pool/esrgan-tf2/1")
print("Model berhasil dimuat!")

def preprocess_image_tensor(img_pil):
    hr_image = np.asarray(img_pil)
    if hr_image.shape[-1] == 4:
        hr_image = hr_image[...,:-1]
    hr_size = (tf.convert_to_tensor(hr_image.shape[:-1]) // 4) * 4
    hr_image = tf.image.crop_to_bounding_box(hr_image, 0, 0, hr_size[0], hr_size[1])
    hr_image = tf.cast(hr_image, tf.float32)
    return tf.expand_dims(hr_image, 0)

def calculate_psnr(original, upscale):
    # 1. Samakan ukuran resolusi
    target_size = [tf.shape(upscale)[1], tf.shape(upscale)[2]]
    original_resized = tf.image.resize(original, target_size, method='bicubic')
    
    # 2. Hitung PSNR
    psnr = tf.image.psnr(
        tf.clip_by_value(upscale, 0, 255),
        tf.clip_by_value(original_resized, 0, 255), 
        max_val=255
    )
    
    # 3. FIX: Gunakan tf.reduce_mean agar menjadi angka scalar tunggal
    return float(tf.reduce_mean(psnr))

class UpscaleRequest(BaseModel):
    image_url: str
    file_name: str

@app.post("/upscale")
async def upscale(request: UpscaleRequest):
    try:
        response = requests.get(request.image_url)
        img = Image.open(io.BytesIO(response.content)).convert("RGB")
        
        # Batasi resolusi input (Sweet spot 256px)
        if img.width > 256 or img.height > 256:
            img.thumbnail((256, 256), Image.Resampling.LANCZOS)
        
        input_tensor = preprocess_image_tensor(img)
        
        start_time = time.time()
        fake_image_tensor = model(input_tensor) 
        duration = time.time() - start_time
        
        # Hitung skor kualitas
        psnr_score = calculate_psnr(input_tensor, fake_image_tensor)
        
        print(f"--- ANALISA PROSES ---")
        print(f"PSNR: {psnr_score:.2f} dB")
        print(f"Waktu: {duration:.2f}s")

        # Post-processing
        fake_image = tf.squeeze(fake_image_tensor)
        fake_image = tf.clip_by_value(fake_image, 0, 255)
        final_img = Image.fromarray(tf.cast(fake_image, tf.uint8).numpy())
        
        img_byte_arr = io.BytesIO()
        final_img.save(img_byte_arr, format='JPEG', quality=95)
        
        target_path = f"upscaled/AI-{request.file_name}"
        supabase.storage.from_("images").upload(
            path=target_path,
            file=img_byte_arr.getvalue(),
            file_options={"content-type": "image/jpeg"}
        )
        
        res_url = supabase.storage.from_("images").get_public_url(target_path)
        return {
            "upscaled_url": res_url,
            "analysis": {
                "duration": f"{duration:.2f}s",
                "psnr": f"{psnr_score:.2f} dB",
                "improvement": "4x Resolution Enhancement"
            }
        }
        
    except Exception as e:
        print(f"Error detail: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)