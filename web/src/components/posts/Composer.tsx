"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { CloseIcon, ImageIcon, ReelsIcon, VideoIcon } from "@/components/layout/nav";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { createPost, type ComposerState } from "@/lib/actions/posts";
import { formatNumber } from "@/lib/format";
import { useAppSelector } from "@/store/hooks";

const MAX_BODY = 2000;
const MAX_IMAGES = 4;
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

interface Picked {
  file: File;
  url: string;
  kind: "IMAGE" | "VIDEO";
}

const initial: ComposerState = {};

const ROW_BUTTON =
  "flex h-10 items-center justify-center gap-2 rounded-lg text-[15px] font-semibold text-muted transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const PICK_LABEL =
  "inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-surface-2 px-3 text-sm font-semibold text-text transition-colors hover:bg-border focus-within:ring-2 focus-within:ring-ring";

/**
 * Facebook-style composer card on /home. It opens the composer as a dialog (desktop) or a
 * full-height sheet (phones). Files are previewed locally; on submit a Server Action uploads them
 * to /media/* and creates the post. The API is the authority; the limits here are hints.
 */
export function Composer({ autoOpen = false }: { autoOpen?: boolean }) {
  const user = useAppSelector((s) => s.currentUser);
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [picked, setPicked] = useState<Picked[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [state, dispatch, pending] = useActionState(createPost, initial);

  // Object URLs are revoked when a file is removed, after a successful post, and on unmount.
  const pickedRef = useRef(picked);
  pickedRef.current = picked;
  useEffect(() => () => pickedRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  // Success: clear everything and close. (On failure the text and files stay.)
  useEffect(() => {
    if (!state.ok) return;
    pickedRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    setPicked([]);
    setBody("");
    setHint(null);
    dialogRef.current?.close();
  }, [state.ok, state.nonce]);

  // /home?compose=1 (the header "+") opens the composer directly.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!autoOpen || !dialog) return;
    if (!dialog.open) dialog.showModal();
    textRef.current?.focus();
  }, [autoOpen]);

  if (!user) return null;
  const firstName = user.name.trim().split(/\s+/)[0] ?? user.name;
  const placeholder = `بماذا تفكر يا ${firstName}؟`;
  const hasVideo = picked.some((p) => p.kind === "VIDEO");
  const images = picked.filter((p) => p.kind === "IMAGE").length;
  const empty = body.trim() === "" && picked.length === 0;

  function open(pick?: "image" | "video") {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    if (pick === "image") imageInput.current?.click();
    else if (pick === "video") videoInput.current?.click();
    else textRef.current?.focus();
  }

  function onClose() {
    // Drop ?compose=1 so the header "+" can open the composer again.
    if (autoOpen) router.replace("/home", { scroll: false });
  }

  function addImages(list: FileList | null) {
    if (!list?.length) return;
    if (hasVideo) {
      setHint("المنشور فيه حتى ٤ صور أو فيديو واحد. أزل الفيديو أولاً لإضافة صور.");
      return;
    }
    const next = [...picked];
    const problems: string[] = [];
    for (const file of Array.from(list)) {
      if (next.length >= MAX_IMAGES) {
        problems.push("يمكنك إضافة ٤ صور كحد أقصى.");
        break;
      }
      if (file.size > IMAGE_MAX_BYTES) {
        problems.push(`الصورة «${file.name}» أكبر من ٥ ميغابايت.`);
        continue;
      }
      next.push({ file, url: URL.createObjectURL(file), kind: "IMAGE" });
    }
    setPicked(next);
    setHint(problems.join(" ") || null);
  }

  function addVideo(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    if (images > 0) {
      setHint("المنشور فيه حتى ٤ صور أو فيديو واحد. أزل الصور أولاً لإضافة فيديو.");
      return;
    }
    if (file.size > VIDEO_MAX_BYTES) {
      setHint(`الفيديو «${file.name}» أكبر من ٥٠ ميغابايت.`);
      return;
    }
    picked.forEach((p) => URL.revokeObjectURL(p.url));
    setPicked([{ file, url: URL.createObjectURL(file), kind: "VIDEO" }]);
    setHint(null);
  }

  function remove(index: number) {
    URL.revokeObjectURL(picked[index].url);
    setPicked(picked.filter((_, i) => i !== index));
    setHint(null);
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData();
    fd.set("body", body);
    for (const p of picked) fd.append(p.kind === "VIDEO" ? "video" : "images", p.file, p.file.name);
    startTransition(() => dispatch(fd));
  }

  return (
    <>
      {/* The entry card */}
      <section aria-label="إنشاء منشور" className="mb-2 rounded-none bg-surface shadow-sm sm:mb-4 sm:rounded-lg">
        <div className="flex items-center gap-2 px-4 pb-2 pt-3">
          <Avatar name={user.name} userId={user.id} src={user.avatarUrl} size="md" />
          <button
            type="button"
            onClick={() => open()}
            className="h-10 min-w-0 flex-1 truncate rounded-full bg-surface-2 px-4 text-start text-[15px] text-muted transition-colors hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {placeholder}
          </button>
        </div>
        <div className="mx-4 grid grid-cols-3 gap-1 border-t border-border py-1">
          <button type="button" onClick={() => open("image")} className={ROW_BUTTON}>
            <ImageIcon size={20} className="text-success" />
            صورة
          </button>
          <button type="button" onClick={() => open("video")} className={ROW_BUTTON}>
            <VideoIcon size={20} className="text-accent" />
            فيديو
          </button>
          <Link href="/reels/new" className={ROW_BUTTON}>
            <ReelsIcon size={20} className="text-primary" />
            ريل
          </Link>
        </div>
      </section>

      {/* The composer: a centred dialog on sm+, a full-height sheet on phones. */}
      <dialog
        ref={dialogRef}
        aria-labelledby="composer-title"
        onClose={onClose}
        className="m-0 h-dvh max-h-none w-full max-w-none border-0 bg-surface p-0 text-text shadow-lg backdrop:bg-overlay/60 sm:m-auto sm:h-auto sm:max-h-[90dvh] sm:max-w-lg sm:rounded-lg"
      >
        <form onSubmit={submit} className="flex h-full max-h-[inherit] flex-col">
          <div className="relative flex h-14 shrink-0 items-center justify-center border-b border-border px-12">
            <h2 id="composer-title" className="text-lg font-bold">
              إنشاء منشور
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="إغلاق"
              className="absolute end-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface-2 text-muted transition-colors hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CloseIcon size={20} />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
            <div className="flex items-center gap-2">
              <Avatar name={user.name} userId={user.id} src={user.avatarUrl} size="md" />
              <span className="font-semibold">{user.name}</span>
            </div>

            <label htmlFor="composer-body" className="sr-only">
              نص المنشور
            </label>
            <textarea
              id="composer-body"
              ref={textRef}
              name="body"
              dir="auto"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={MAX_BODY}
              rows={picked.length ? 3 : 6}
              placeholder={placeholder}
              aria-describedby="composer-counter"
              className="w-full resize-none bg-transparent text-lg leading-8 text-text placeholder:text-muted focus:outline-none"
            />
            <p
              id="composer-counter"
              className={`-mt-2 text-end text-xs ${body.length >= MAX_BODY ? "text-danger" : "text-muted"}`}
            >
              {formatNumber(body.length)} / {formatNumber(MAX_BODY)}
            </p>

            {picked.length > 0 && (
              <ul className={`grid gap-1 ${picked.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                {picked.map((p, i) => (
                  <li key={p.url} className="relative overflow-hidden rounded-lg bg-surface-2">
                    {p.kind === "VIDEO" ? (
                      <video src={p.url} muted playsInline preload="metadata" controls className="max-h-72 w-full bg-overlay" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                      <img src={p.url} alt={`معاينة الصورة ${formatNumber(i + 1)}`} className="aspect-square w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      aria-label={p.kind === "VIDEO" ? "إزالة الفيديو" : `إزالة الصورة ${formatNumber(i + 1)}`}
                      className="absolute end-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text shadow-sm transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <CloseIcon size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {hint && <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-text">{hint}</p>}
            {state.message && !pending && (
              <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {state.message}
              </p>
            )}
          </div>

          <div className="shrink-0 border-t border-border px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:pb-3">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="me-auto text-sm font-semibold text-muted">أضف إلى منشورك</span>
              <label className={PICK_LABEL}>
                <ImageIcon size={18} className="text-success" />
                صور
                <input
                  ref={imageInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    addImages(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              <label className={PICK_LABEL}>
                <VideoIcon size={18} className="text-accent" />
                فيديو
                <input
                  ref={videoInput}
                  type="file"
                  accept="video/mp4,video/quicktime"
                  className="sr-only"
                  onChange={(e) => {
                    addVideo(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <p className="mb-3 text-xs leading-5 text-muted">
              حتى ٤ صور (٥ ميغابايت لكل صورة)، أو فيديو واحد MP4 بترميز H.264 حتى ٦٠ ثانية و٥٠ ميغابايت.
            </p>
            <Button type="submit" fullWidth pending={pending} disabled={empty}>
              {pending ? "جارٍ النشر…" : "نشر"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
