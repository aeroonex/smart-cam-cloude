import { useRef, useState } from "react";
import { X } from "lucide-react";
import { BoxLoader } from "@/components/BoxLoader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BUCKET = "product-media";
const FOLDER = "products";

export function MediaUploader({ onAdd }: { onAdd: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);

    const results: string[] = [];
    const errors: string[] = [];

    await Promise.all(
      Array.from(files).map(async (file) => {
        const ext  = file.name.split(".").pop()?.toLowerCase() ?? "bin";
        const name = `${FOLDER}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(name, file, { cacheControl: "2592000", upsert: false }); // 30 kun cache

        if (error) {
          errors.push(file.name);
          return;
        }

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(name);
        results.push(data.publicUrl);
      })
    );

    results.forEach((url) => onAdd(url));

    if (results.length) toast.success(`${results.length} ta fayl yuklandi!`);
    if (errors.length)  toast.error(`${errors.length} ta fayl yuklanmadi: ${errors.join(", ")}`);

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <div
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 py-8 transition hover:border-[#1d4f8a] hover:bg-blue-50"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); void handleFiles(e.dataTransfer.files); }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <BoxLoader />
            <p className="text-sm font-medium text-[#1d4f8a]">Yuklanmoqda...</p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="mu-design">
              <div className="mu-circle-1 mu-color-border">
                <div className="mu-circle-2 mu-color-border">
                  <div className="mu-circle-3 mu-color-border">
                    <div className="mu-circle-4 mu-color-border">
                      <div className="mu-circle-5"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mu-shape mu-shadow mu-mountain-1"></div>
              <div className="mu-shape mu-mountain-2"></div>
              <div className="mu-shape mu-shadow mu-mountain-3"></div>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-neutral-700">Rasm yoki video yuklash</p>
              <p className="text-xs text-neutral-400">JPG · PNG · WEBP · GIF · MP4 — maks 50 MB</p>
              <p className="text-xs text-neutral-400">Bosing yoki Drag & Drop</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function MediaPreviewList({
  urls,
  onRemove,
}: {
  urls: string[];
  onRemove: (i: number) => void;
}) {
  if (!urls.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {urls.map((url, i) => {
        const isVid = /\.(mp4|webm|mov|avi)(\?.*)?$/i.test(url);
        return (
          <div key={i} className="group relative overflow-hidden rounded-lg border border-blue-100">
            {isVid ? (
              <div className="flex h-16 w-16 items-center justify-center bg-neutral-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
                </svg>
              </div>
            ) : (
              <img
                src={url}
                alt=""
                className="h-16 w-16 object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            )}
            <button
              onClick={() => onRemove(i)}
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 text-white transition group-hover:opacity-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
