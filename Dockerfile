# Gunakan Python versi 3.9
FROM python:3.9

# Atur folder kerja di dalam server
WORKDIR /code

# Copy daftar belanjaan dan instal
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy semua kode (main.py, dll)
COPY . .

# Jalankan server FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]