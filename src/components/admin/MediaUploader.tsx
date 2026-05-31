import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
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
        <div className="mb-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-700">
          ⚠️ Media server ishlamayapti. Terminalda: <code className="font-mono font-bold">npm run server</code>
        </div>
      )}
      <div
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition ${
          serverOk === false
            ? "border-amber-200 bg-amber-50/50 cursor-not-allowed"
            : "border-orange-200 bg-orange-50/50 hover:border-[#EE7526] hover:bg-orange-50"
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
            <Loader2 className="h-8 w-8 animate-spin text-[#EE7526]" />
            <p className="text-sm font-medium text-[#EE7526]">Yuklanmoqda...</p>
          </div>
        ) : (
          <>
            <span className="text-3xl">📷 🎥</span>
            <p className="text-sm font-semibold text-neutral-700">Rasm yoki video yuklash</p>
            <p className="text-xs text-neutral-400">JPG · PNG · WEBP · MP4 — maks 50 MB</p>
            <p className="text-xs text-neutral-400">Bosing yoki Drag & Drop</p>
          </>
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
          <div key={i} className="group relative overflow-hidden rounded-lg border border-orange-100">
            {isVid ? (
              <div className="flex h-16 w-16 items-center justify-center bg-neutral-100 text-2xl">🎥</div>
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
