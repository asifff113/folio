"use client";

import { useActionState, useState } from "react";
import type { SeoSettings } from "@/config/customize";
import { saveSeo } from "@/app/admin/actions";
import { Check, Group } from "./controls";
import { ImageUpload } from "./ImageUpload";
import { SaveBar } from "./ui";

/** Search title and description, site address, share image, tab icon. */
export function SeoForm({
  seo: initial,
  fallback,
}: {
  seo: SeoSettings;
  /** What is used when a field is left empty: your name, tagline, the address found automatically, your picture. */
  fallback: { title: string; description: string; siteUrl: string; avatar: string; letter: string };
}) {
  const [state, action] = useActionState(saveSeo, null);
  const [seo, setSeo] = useState(initial);
  const set = <K extends keyof SeoSettings>(key: K, value: SeoSettings[K]) => setSeo((s) => ({ ...s, [key]: value }));
  const title = seo.title || fallback.title;
  const description = seo.description || fallback.description;
  const address = (seo.siteUrl || fallback.siteUrl).replace(/^https?:\/\//, "");

  return (
    <form action={action} className="grid items-start gap-4 xl:grid-cols-2">
      <input type="hidden" name="seo" value={JSON.stringify(seo)} />

      <Group title="search">
        <label className="flex flex-col gap-1.5">
          <span className="field-label m-0">page title</span>
          <input
            value={seo.title}
            maxLength={70}
            placeholder={fallback.title}
            onChange={(e) => set("title", e.target.value)}
            className="text-input"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="field-label m-0">description · {seo.description.length} / 160</span>
          <textarea
            rows={3}
            value={seo.description}
            maxLength={160}
            placeholder={fallback.description}
            onChange={(e) => set("description", e.target.value)}
            className="text-input resize-y leading-relaxed"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="field-label m-0">site address</span>
          <input
            type="url"
            value={seo.siteUrl}
            maxLength={200}
            placeholder={fallback.siteUrl}
            onChange={(e) => set("siteUrl", e.target.value)}
            className="text-input"
          />
          <span className="text-[12px] text-muted">Leave empty to use the Vercel address. Fill it in if you add your own domain.</span>
        </label>
        <Check
          label="Let search engines list my site"
          hint="Turned off automatically while maintenance mode is on. Admin and preview pages are never listed."
          checked={seo.indexable}
          onChange={(v) => set("indexable", v)}
        />

        <div className="mt-1 flex flex-col gap-1 border border-white/10 bg-[#0d1117] px-4 py-3.5">
          <span className="font-mono text-[11px] text-muted">SEARCH RESULT PREVIEW</span>
          <span className="truncate text-[13px] text-[#bfc8d0]">{address}</span>
          <span className="truncate text-[19px] text-[#8ab4f8]">{title}</span>
          <span className="line-clamp-2 text-[14px] leading-normal text-[#bfc8d0]">{description}</span>
        </div>
      </Group>

      <div className="flex flex-col gap-4">
        <Group title="share image">
          <div role="radiogroup" aria-label="Share image" className="flex flex-wrap gap-2">
            {(["auto", "upload"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={seo.shareImage === v}
                onClick={() => set("shareImage", v)}
                className="chip"
              >
                {v === "auto" ? "made for me" : "upload my own"}
              </button>
            ))}
          </div>
          {seo.shareImage === "auto" ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- live share image */}
              <img
                src="/og"
                alt="The share image made from your name, tagline, picture and colors"
                className="aspect-[1200/630] w-full border border-holo/35 object-cover"
              />
              <p className="text-[13px] text-muted">
                Made from your name, tagline, picture and colors. It updates when you save changes to those.
              </p>
            </>
          ) : (
            <>
              <ImageUpload
                folder="share"
                label="Share image"
                value={seo.shareImageUrl}
                onChange={(url) => set("shareImageUrl", url)}
              />
              <p className="text-[13px] text-muted">Best at 1200 × 630 pixels. PNG, JPG or WebP, up to 2 MB.</p>
            </>
          )}
        </Group>

        <Group title="browser tab icon">
          <div role="radiogroup" aria-label="Icon" className="flex flex-col gap-2.5">
            <IconChoice
              checked={seo.icon === "letter"}
              onPick={() => set("icon", "letter")}
              label="First letter of your name, in your colors"
              preview={
                <span className="grid size-11 place-items-center border border-pink bg-void font-display text-[22px] font-extrabold text-holo [text-shadow:0_0_8px_var(--holo)]">
                  {fallback.letter}
                </span>
              }
            />
            <IconChoice
              checked={seo.icon === "avatar"}
              onPick={() => set("icon", "avatar")}
              label={fallback.avatar ? "Your profile picture" : "Your profile picture (upload one on the profile page first)"}
              preview={
                // eslint-disable-next-line @next/next/no-img-element -- picture preview
                <img
                  src={fallback.avatar || "/avatar-placeholder.svg"}
                  alt=""
                  className="size-11 rounded-[9px] border border-holo/30 object-cover"
                />
              }
            />
          </div>
        </Group>
      </div>

      <div className="panel max-w-none py-4 xl:col-span-2">
        <SaveBar state={state} />
      </div>
    </form>
  );
}

function IconChoice({
  checked,
  onPick,
  label,
  preview,
}: {
  checked: boolean;
  onPick: () => void;
  label: string;
  preview: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onPick}
      className={`flex cursor-pointer items-center gap-3 border px-3 py-2 text-left text-[14px] ${
        checked ? "border-pink bg-pink/10" : "border-holo/20 hover:border-holo/50"
      }`}
    >
      {preview}
      {label}
    </button>
  );
}
