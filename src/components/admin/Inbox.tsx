import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CONTACT_PLATFORMS } from "@/config/site";
import { getAdminSession } from "@/lib/admin/session";
import { setItemStatus, setMessageArchived, setMessageRead } from "@/app/admin/actions";
import { CopyButton, DeleteMessageButton, LocalTime, MarkRead } from "./InboxClient";

type Message = {
  id: string;
  item_id: string | null;
  item_kind: "need" | "offer" | "contact";
  item_title: string;
  name: string;
  platform: string;
  contact: string;
  note: string;
  source: string;
  is_read: boolean;
  archived: boolean;
  created_at: string;
};

const FILTERS = [
  { id: "all", label: "all", test: (m: Message) => !m.archived },
  { id: "unread", label: "unread", test: (m: Message) => !m.archived && !m.is_read },
  { id: "offers", label: "offers to help", test: (m: Message) => !m.archived && m.item_kind === "need" },
  { id: "requests", label: "requests for you", test: (m: Message) => !m.archived && m.item_kind === "offer" },
  { id: "contact", label: "contact form", test: (m: Message) => !m.archived && m.item_kind === "contact" },
  { id: "archived", label: "archived", test: (m: Message) => m.archived },
] as const;

/** Label and colour for each kind of note. */
const KIND: Record<Message["item_kind"], { short: string; long: string; color: string }> = {
  need: { short: "OFFER", long: "OFFER TO HELP", color: "var(--pink)" },
  offer: { short: "REQUEST", long: "REQUEST FOR YOU", color: "var(--holo)" },
  contact: { short: "CONTACT", long: "CONTACT FORM", color: "#5dffb0" },
};

const PLATFORM_COLOR: Record<string, string> = {
  discord: "#5865f2",
  telegram: "#2aabee",
  instagram: "#e1306c",
  email: "#2fe3ff",
  other: "#a58bff",
};

/** A link to the visitor's profile when the contact is a plain handle or an email. */
function contactLink(platform: string, contact: string) {
  const handle = contact.replace(/^@/, "");
  if (platform === "email" && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(contact)) return `mailto:${contact}`;
  if (!/^[A-Za-z0-9_.]{2,40}$/.test(handle)) return null;
  if (platform === "telegram") return `https://t.me/${handle}`;
  if (platform === "instagram") return `https://instagram.com/${handle}`;
  return null;
}

export async function InboxView({ db, params }: { db: SupabaseClient; params: Promise<{ filter?: string; m?: string }> }) {
  const { filter: filterParam, m } = await params;
  const { data, error } = await db
    .from("inbox")
    .select("id,item_id,item_kind,item_title,name,platform,contact,note,source,is_read,archived,created_at")
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<Message[]>();

  if (error) {
    return (
      <div className="panel max-w-none">
        <p className="eyebrow">{"// read error"}</p>
        <p className="panel-text">
          Could not load the inbox: {error.message}. Check that <code className="text-fg">supabase/phase4_help.sql</code>{" "}
          was run.
        </p>
      </div>
    );
  }

  const all = data ?? [];
  const filter = FILTERS.find((f) => f.id === filterParam) ?? FILTERS[0];
  const shown = all.filter(filter.test);
  const selected = shown.find((x) => x.id === m) ?? shown[0];
  const href = (f: string, id?: string) => `/admin/inbox?filter=${f}${id ? `&m=${id}` : ""}`;

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Filter" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const n = all.filter(f.test).length;
          const active = f.id === filter.id;
          return (
            <Link
              key={f.id}
              href={href(f.id)}
              aria-current={active ? "page" : undefined}
              className={`chip ${active ? "border-pink bg-pink/15 font-bold text-[#ffd6f6]" : "text-muted"}`}
            >
              {f.label}
              {f.id !== "archived" && ` · ${n}`}
            </Link>
          );
        })}
      </nav>

      {shown.length === 0 ? (
        <div className="border border-dashed border-holo/25 px-5 py-10 text-center text-[16px] text-muted">
          {all.length === 0
            ? "No notes yet. When visitors respond to your help items, they show up here."
            : "Nothing in this view."}
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <ul aria-label="Messages" className="flex flex-col gap-2">
            {shown.map((msg) => {
              const active = msg.id === selected?.id;
              return (
                <li key={msg.id}>
                  <Link
                    href={href(filter.id, msg.id)}
                    aria-current={active ? "true" : undefined}
                    className={`flex flex-col gap-1.5 border px-4 py-3.5 ${
                      active ? "border-holo bg-holo/[.07]" : "border-holo/15 bg-[rgba(2,10,16,.5)] hover:border-holo/40"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {!msg.is_read && <i aria-label="unread" className="size-2 rounded-full bg-pink" />}
                      <span className={`min-w-0 flex-1 truncate text-[15px] ${msg.is_read ? "" : "font-bold"}`}>
                        {msg.name}
                      </span>
                      <LocalTime iso={msg.created_at} short className="font-mono text-[11px] text-muted" />
                    </span>
                    <span className="truncate font-mono text-[11px]" style={{ color: KIND[msg.item_kind].color }}>
                      {KIND[msg.item_kind].short}
                      {msg.item_kind !== "contact" && ` · ${msg.item_title}`}
                    </span>
                    <span className="line-clamp-2 text-[14px] leading-snug text-[#b9d6e2]">{msg.note}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {selected && <MessageDetail msg={selected} />}
        </div>
      )}
    </div>
  );
}

function MessageDetail({ msg }: { msg: Message }) {
  const platform = CONTACT_PLATFORMS.find((p) => p.id === msg.platform);
  const link = contactLink(msg.platform, msg.contact);
  const color = PLATFORM_COLOR[msg.platform] ?? "#a58bff";
  const offer = msg.item_kind === "need";

  return (
    <article className="panel flex max-w-none flex-col gap-5">
      {!msg.is_read && <MarkRead id={msg.id} />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-[22px] font-semibold">{msg.name}</h2>
          <span className="font-mono text-[12px] text-[#9fc3d3]">
            <LocalTime iso={msg.created_at} /> · came from {msg.source}
          </span>
        </div>
        <span
          className="border px-2 py-1 font-mono text-[10px] font-bold tracking-[0.12em]"
          style={{ color: KIND[msg.item_kind].color, borderColor: KIND[msg.item_kind].color }}
        >
          {KIND[msg.item_kind].long}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 border px-4 py-3" style={{ borderColor: color }}>
        <span className="font-mono text-[11px] font-bold uppercase" style={{ color }}>
          {platform?.label ?? msg.platform}
        </span>
        <span className="min-w-0 flex-1 font-mono text-[15px] break-all">{msg.contact}</span>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="ghost-btn text-holo">
            open ↗
          </a>
        )}
        <CopyButton text={msg.contact} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="field-label m-0">{msg.item_kind === "contact" ? "message" : `re: ${msg.item_title}`}</span>
        <p className="text-[16px] leading-relaxed whitespace-pre-line">{msg.note}</p>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-holo/15 pt-4">
        {msg.item_id && (
          <form action={setItemStatus.bind(null, msg.item_id, "in_progress")}>
            <button type="submit" className="chip">
              mark item {offer ? "in progress" : "limited"}
            </button>
          </form>
        )}
        {msg.item_id && (
          <form action={setItemStatus.bind(null, msg.item_id, "solved")}>
            <button type="submit" className="chip">
              mark item {offer ? "solved" : "paused"}
            </button>
          </form>
        )}
        <form action={setMessageRead.bind(null, msg.id, false)}>
          <button type="submit" className="chip">
            mark unread
          </button>
        </form>
        <form action={setMessageArchived.bind(null, msg.id, !msg.archived)}>
          <button type="submit" className="chip">
            {msg.archived ? "move to inbox" : "archive"}
          </button>
        </form>
        <span className="flex-1" />
        <DeleteMessageButton id={msg.id} />
      </div>
    </article>
  );
}

/** Unread count for the admin menu. */
export async function UnreadBadge() {
  const session = await getAdminSession();
  if (session.state !== "admin") return null;
  const { count } = await session.supabase
    .from("inbox")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false)
    .eq("archived", false);
  if (!count) return null;
  return <span className="bg-pink px-1.5 font-mono text-[11px] font-bold text-[#14020f]">{count}</span>;
}
