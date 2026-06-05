import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { BoxLoader } from "@/components/BoxLoader";
import { toast } from "sonner";

export function MediaUploader({ onAdd }: { onAdd: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/media-list").then(r => setServerOk(r.ok)).catch(() => setServerOk(false));
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    if (serverOk === false) {
      toast.error("Media server ishlamayapti. npm run server buyrug'ini ishga tushiring.");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach(f => formData.append("files", f));
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(`Yuklashda xato: ${(err as { error?: string }).error ?? res.statusText}`);
        return;
      }
      const { urls } = await res.json() as { urls: string[] };
      urls.forEach(url => onAdd(url));
      toast.success(`${urls.length} ta fayl yuklandi!`);
    } catch {
      toast.error("Server bilan aloqa yo'q. npm run server ni ishga tushiring.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      {serverOk === false && (
        <div className="mb-2 rounded-xl bg-blue-50 border border-blue-200 px-4 py-2.5 text-sm text-amber-700">
          ⚠️ Media server ishlamayapti. Terminalda: <code className="font-mono font-bold">npm run server</code>
        </div>
      )}
      <div
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition ${
          serverOk === false
            ? "border-blue-200 bg-blue-50/50 cursor-not-allowed"
            : "border-blue-200 bg-blue-50/50 hover:border-[#1d4f8a] hover:bg-blue-50"
        }`}
        onClick={() => serverOk !== false && inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); void handleFiles(e.dataTransfer.files); }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          className="hidden"
          onChange={e => void handleFiles(e.target.files)}
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
              <p className="text-xs text-neutral-400">JPG · PNG · WEBP · MP4 — maks 50 MB</p>
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>
              </div>
            ) : (
              <img src={url} alt="" className="h-16 w-16 object-cover"
                onError={e => { e.currentTarget.style.display = "none"; }} />
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
