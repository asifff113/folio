"use client";

import { useActionState, useState } from "react";
import type { SiteConfig } from "@/config/site";
import { saveProfile } from "@/app/admin/actions";
import { ImageUpload } from "./ImageUpload";
import { Field, SaveBar } from "./ui";

export function ProfileForm({ site }: { site: SiteConfig }) {
  const [state, action] = useActionState(saveProfile, null);
  const [avatar, setAvatar] = useState(site.avatar);

  return (
    <form action={action} className="panel max-w-none">
      <p className="eyebrow">{"// 01 opening screen"}</p>
      <div className="mb-5">
        <span className="field-label">profile picture</span>
        <ImageUpload
          name="avatar_url"
          folder="avatar"
          label="Upload profile picture"
          value={avatar}
          onChange={setAvatar}
          placeholder="/avatar-placeholder.svg"
          round
        />
      </div>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="name" htmlFor="name" hint="The big title on the opening screen.">
          <input id="name" name="name" defaultValue={site.name} maxLength={40} required className="text-input" />
        </Field>
        <Field label="handle" htmlFor="handle" hint="Shown as SYS://HANDLE in the corner.">
          <input
            id="handle"
            name="handle"
            defaultValue={site.handle}
            maxLength={32}
            required
            pattern="[A-Za-z0-9_.\-]+"
            className="text-input"
          />
        </Field>
      </div>
      <Field label="tagline" htmlFor="tagline" hint="Used in search results and link previews. Not shown on the page.">
        <input id="tagline" name="tagline" defaultValue={site.tagline} maxLength={140} className="text-input" />
      </Field>

      <p className="eyebrow mt-6">{"// 02 about"}</p>
      <Field label="heading" htmlFor="about_heading">
        <input
          id="about_heading"
          name="about_heading"
          defaultValue={site.about.heading}
          maxLength={120}
          className="text-input"
        />
      </Field>
      <Field label="text" htmlFor="about_body" hint="Two or three sentences is plenty.">
        <textarea
          id="about_body"
          name="about_body"
          defaultValue={site.about.body}
          maxLength={1200}
          rows={4}
          className="text-input resize-y"
        />
      </Field>

      <p className="eyebrow mt-6">{"// 03 interests"}</p>
      <Field label="heading" htmlFor="interests_heading">
        <input
          id="interests_heading"
          name="interests_heading"
          defaultValue={site.interests.heading}
          maxLength={120}
          className="text-input"
        />
      </Field>
      <Field label="tags" htmlFor="interests_tags" hint="Separate with commas. Up to 24 tags.">
        <input
          id="interests_tags"
          name="interests_tags"
          defaultValue={site.interests.tags.join(", ")}
          className="text-input"
        />
      </Field>

      <SaveBar state={state} />
    </form>
  );
}
