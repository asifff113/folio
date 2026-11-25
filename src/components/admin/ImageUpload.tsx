"use client";

import { useId, useState, useTransition } from "react";
import { uploadImage } from "@/app/admin/actions";

type Props = {
  /** Form field the URL is saved under (hidden input). Omit when the parent keeps the value. */
  name?: string;
  folder: "avatar" | "qr" | "section" | "share";
  value: string;
  onChange: (url: string) => void;
  /** Shown when there is no image yet. */
  placeholder?: string;
  label: string;
  round?: boolean;
};

/** Pick an image, upload it right away, keep its URL. The form's save button stores it. */
export function ImageUpload({ name, folder, value, onChange, placeholder, label, round = false }: Props) {
  const id = useId();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const preview = value || placeholder;

  return (
    <div className="flex flex-wrap items-center gap-4">
      {name && <input type="hidden" name={name} value={value} />}
      <div
        className={`grid size-24 flex-none place-items-center overflow-hidden border border-holo/30 bg-[rgba(2,10,16,.6)] ${
          round ? "rounded-full" : ""
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- preview of an uploaded image
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <span className="font-mono text-[11px] text-muted">none</span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <label htmlFor={id} className={`btn cursor-pointer ${pending ? "opacity-60" : ""}`}>
            {pending ? "uploading..." : value ? "replace" : "upload"}
          </label>
          <input
            id={id}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label={label}
            className="sr-only"
            disabled={pending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setError("");
              const data = new FormData();
              data.set("file", file);
              data.set("folder", folder);
              start(async () => {
                const result = await uploadImage(data);
                if (result.ok) onChange(result.url);
                else setError(result.message);
              });
            }}
          />
          {value && (
            <button type="button" className="ghost-btn" onClick={() => onChange("")}>
              remove
            </button>
          )}
        </div>
        <p className={`font-mono text-[12px] ${error ? "text-pink" : "text-muted"}`} role={error ? "alert" : undefined}>
          {error || "PNG, JPG or WebP, up to 2 MB. Save the form to apply it."}
        </p>
      </div>
    </div>
  );
}
