"use client";
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [upscaledUrl, setUpscaledUrl] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [sliderPosition, setSliderPosition] = useState(50);

  const handleReset = () => {
    setFile(null);
    setPreviewUrl("");
    setUpscaledUrl("");
    setStatus("");
    setError("");
    setAnalysis(null);
    setSliderPosition(50);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(""); 
    
    if (selectedFile) {
      // Hanya mengizinkan JPG dan PNG
      const allowedTypes = ['image/jpeg', 'image/png'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError("Format file tidak didukung. Harap gunakan JPG atau PNG.");
        setFile(null);
        setPreviewUrl("");
        return;
      }

      // Maksimal 5MB
      const maxSize = 5 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        setError("Ukuran gambar terlalu besar. Maksimal adalah 5MB.");
        setFile(null);
        setPreviewUrl("");
        return;
      }

      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setUpscaledUrl("");
      setAnalysis(null);
      setStatus("Gambar siap diproses.");
    }
  };

  const handleUpscale = async () => {
    if (!file) return;
    
    setLoading(true);
    setStatus("Sedang mengirim gambar...");
    setError("");

    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `originals/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file, {
      contentType: file.type,
      upsert: true
    });

    if (uploadError) {
      setError("Terjadi kendala saat mengirim gambar. Silakan coba lagi.");
      setLoading(false);
    } else {
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
      setStatus("Sedang meningkatkan kualitas gambar...");

      try {
        const response = await fetch("https://raflyrd123-purevision-backend.hf.space/upscale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: publicUrl, file_name: fileName })
        });

        const result = await response.json();
        if (result.upscaled_url) {
          setUpscaledUrl(result.upscaled_url);
          setAnalysis(result.analysis);
          setStatus("Proses selesai!");
        } else {
          setError("Gagal memproses gambar.");
        }
      } catch (err) {
        setError("Sistem sedang sibuk. Silakan coba sesaat lagi.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-slate-200 font-sans overflow-x-hidden pb-20">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[50%] bg-emerald-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-24 flex flex-col items-center">
        <div className="text-center mb-16">
          <h1 className="text-7xl md:text-8xl font-black tracking-tighter bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent leading-[1.4] py-2">
            PURE VISION
          </h1>
          <p className="text-blue-400 text-[10px] tracking-[1em] font-bold uppercase opacity-80">Ultra Resolution AI</p>
        </div>

        <div className="w-full max-w-3xl bg-slate-900/40 border border-white/5 backdrop-blur-2xl p-6 md:p-10 rounded-[2.5rem] shadow-2xl">
          <div className={`relative group min-h-[350px] border rounded-3xl overflow-hidden bg-slate-950/50 flex items-center justify-center transition-all ${error ? 'border-red-500/50' : 'border-slate-800 hover:border-blue-500/30'}`}>
            <input type="file" accept="image/jpeg,image/png" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
            <div className="flex flex-col items-center justify-center text-center p-4">
              {previewUrl ? (
                <img src={previewUrl} className="max-h-[300px] rounded-xl shadow-2xl" alt="Preview" />
              ) : (
                <>
                  <div className="w-16 h-16 mb-6 rounded-2xl bg-blue-500/5 flex items-center justify-center group-hover:scale-110 transition-all">
                    <div className={`w-3 h-3 rounded-full animate-pulse ${error ? 'bg-red-500' : 'bg-blue-500'}`} />
                  </div>
                  <p className={`${error ? 'text-red-400' : 'text-slate-400'} font-medium`}>Pilih Gambar JPG atau PNG</p>
                  <p className="text-slate-600 text-[9px] mt-2 tracking-[0.3em] font-black uppercase">Ukuran Maksimal: 5MB</p>
                </>
              )}
            </div>
          </div>

          <button onClick={handleUpscale} disabled={loading || !file} className="w-full mt-8 bg-white text-black font-black py-5 rounded-2xl transition-all active:scale-[0.97] disabled:opacity-30 uppercase tracking-[0.2em] text-[10px]">
            {loading ? "Sedang Memproses..." : "Tingkatkan Kualitas"}
          </button>

          <div className="mt-6 flex flex-col items-center gap-2">
            {status && !error && (
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <p className="text-[9px] tracking-[0.3em] font-black text-slate-500 uppercase">{status}</p>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-3 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <p className="text-[9px] tracking-[0.2em] font-black text-red-400 uppercase">{error}</p>
              </div>
            )}
          </div>
        </div>

        {upscaledUrl && (
          <div className="w-full mt-24 animate-in fade-in zoom-in-95 duration-700">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black tracking-tight mb-2">HASIL PERBANDINGAN</h2>
              <p className="text-slate-500 text-[10px] tracking-widest uppercase">Geser slider untuk melihat perbedaan detail</p>
            </div>

            <div className="relative w-full max-w-4xl mx-auto aspect-[4/3] md:aspect-video rounded-[2.5rem] overflow-hidden border-4 border-white/5 shadow-2xl bg-slate-900 group">
              <img src={upscaledUrl} className="absolute inset-0 w-full h-full object-contain" alt="Hasil" />
              
              <div 
                className="absolute inset-0 w-full h-full overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <img src={previewUrl} className="absolute inset-0 w-full h-full object-contain bg-slate-950" alt="Sebelum" />
                <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                  Sebelum
                </div>
              </div>

              <div className="absolute top-6 right-6 bg-emerald-500/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black text-black uppercase tracking-widest">
                Hasil AI
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={(e) => setSliderPosition(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
              />
              
              <div className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_20px_rgba(255,255,255,0.8)] z-20 pointer-events-none" style={{ left: `${sliderPosition}%` }}>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-2xl flex items-center justify-center">
                  <div className="flex gap-1">
                    <div className="w-0.5 h-4 bg-slate-300 rounded-full" />
                    <div className="w-0.5 h-4 bg-slate-300 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 flex justify-center gap-4">
              <a href={upscaledUrl} target="_blank" className="bg-emerald-500 text-black text-[11px] font-black px-12 py-5 rounded-2xl uppercase tracking-[0.2em] hover:bg-emerald-400 transition-all active:scale-95 shadow-xl shadow-emerald-500/20">
                Simpan Gambar
              </a>
              <button onClick={handleReset} className="bg-slate-800 text-white text-[11px] font-black px-8 py-5 rounded-2xl uppercase tracking-[0.2em] hover:bg-slate-700 transition-all active:scale-95">
                Mulai Baru
              </button>
            </div>

            {analysis && (
              <div className="w-full max-w-4xl mx-auto mt-20 bg-slate-900/50 border border-white/5 rounded-[2rem] overflow-hidden backdrop-blur-sm">
                <div className="bg-white/5 px-6 py-3 border-b border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Laporan Analisa Gambar</span>
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-700" />
                    <div className="w-2 h-2 rounded-full bg-slate-700" />
                  </div>
                </div>
                <div className="p-8 font-mono text-xs md:text-sm grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-4">
                      <p className="text-blue-400 font-bold">`[` PROSES AI `]`</p>
                      <div className="space-y-3 text-slate-400">
                        <p className="flex justify-between border-b border-white/5 pb-2"><span>Arsitektur:</span><span className="text-white">ESRGAN</span></p>
                        <p className="flex justify-between border-b border-white/5 pb-2"><span>Waktu Proses:</span><span className="text-emerald-400 font-bold">{analysis.duration}</span></p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-purple-400 font-bold">`[` KUALITAS `]`</p>
                      <div className="bg-blue-500/5 p-5 rounded-2xl border border-blue-500/10">
                        <div className="flex justify-between items-end">
                          <span className="text-slate-500 text-[10px] uppercase tracking-wider">Skor Akurasi Pixel</span>
                          <span className="text-3xl text-yellow-400 font-black italic">{analysis.psnr}</span>
                        </div>
                        <div className="mt-4 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                           <div className="bg-yellow-400 h-full w-[85%] animate-in slide-in-from-left duration-1000" />
                        </div>
                      </div>
                    </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
