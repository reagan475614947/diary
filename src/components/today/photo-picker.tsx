/* eslint-disable @next/next/no-img-element */
import { MAX_PHOTO_UPLOAD_MB } from "@/lib/upload";

type PhotoPickerProps = {
  previewUrl: string;
  inputName?: string;
  onFileSelected: (file: File) => Promise<void>;
  onRemove: () => void;
  isUploading: boolean;
};

export function PhotoPicker({
  previewUrl,
  inputName,
  onFileSelected,
  onRemove,
  isUploading,
}: PhotoPickerProps) {
  return (
    <div className="rounded-[22px] bg-card-strong p-4">
      <div className="flex items-center gap-3">
        <label className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong">
          {isUploading ? "处理中..." : "选择照片"}
          <input
            name={inputName}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              await onFileSelected(file);
              event.target.value = "";
            }}
          />
        </label>

        {previewUrl ? (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex rounded-full border border-border px-3 py-2 text-sm font-medium text-muted hover:bg-white"
          >
            移除照片
          </button>
        ) : null}
      </div>

      <p className="mt-3 text-xs leading-6 text-muted">
        照片会先单独上传到你的 Mac，本次限制为 {MAX_PHOTO_UPLOAD_MB}MB。
      </p>

      {previewUrl ? (
        <div className="mt-4 overflow-hidden rounded-[20px] border border-border">
          <img src={previewUrl} alt="日记照片预览" className="w-full object-contain" />
        </div>
      ) : null}
    </div>
  );
}
