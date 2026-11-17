import type { FieldErrorDetail } from "./types";

export const GENERIC_ERROR = "حدث خطأ غير متوقع. حاول مرة أخرى بعد قليل.";

/** Every API error code (CLAUDE.md §4.8) → a short, friendly Arabic message. */
const MESSAGES: Record<string, string> = {
  VALIDATION_FAILED: "بعض الحقول غير صحيحة. راجعها وحاول مرة أخرى.",
  UNAUTHENTICATED: "انتهت جلستك. سجّل الدخول من جديد.",
  FORBIDDEN: "ليس لديك صلاحية للقيام بهذا.",
  NOT_FOUND: "لم نجد ما تبحث عنه. ربما حُذف.",
  INVALID_CREDENTIALS: "البيانات غير صحيحة. تأكد من البريد أو اسم المستخدم وكلمة المرور.",
  EMAIL_TAKEN: "هذا البريد الإلكتروني مستخدم في حساب آخر.",
  USERNAME_TAKEN: "اسم المستخدم هذا محجوز. جرّب اسماً آخر.",
  ACCOUNT_SUSPENDED: "حسابك موقوف من قِبل الإدارة.",
  MEDIA_TOO_LARGE: "الملف كبير جداً. الحد ٥ ميغابايت للصور و٥٠ ميغابايت للفيديو.",
  MEDIA_TYPE_UNSUPPORTED: "نوع الملف غير مدعوم. استخدم صور JPG أو PNG أو WebP، وفيديو MP4.",
  VIDEO_TOO_LONG: "الفيديو أطول من ٦٠ ثانية.",
  VIDEO_CODEC_UNSUPPORTED:
    "صيغة الفيديو غير مدعومة (يجب أن تكون H.264). على الآيفون: الإعدادات ← الكاميرا ← التنسيقات ← «الأكثر توافقاً».",
  REEL_REQUIRES_VIDEO: "الريل يحتاج فيديو واحداً.",
  REEL_NOT_VERTICAL: "فيديو الريل يجب أن يكون عمودياً.",
  MEDIA_NOT_OWNED: "لا يمكنك استخدام هذا الملف.",
  MEDIA_ALREADY_ATTACHED: "هذا الملف مستخدم في منشور آخر.",
  POST_EMPTY: "اكتب شيئاً أو أضف صورة أو فيديو.",
  POST_MEDIA_INVALID: "يمكنك إضافة حتى ٤ صور أو فيديو واحد، وليس الاثنين معاً.",
  CANNOT_REPOST: "لا يمكن مشاركة هذا المنشور.",
  ALREADY_REPOSTED: "شاركت هذا المنشور من قبل.",
  CANNOT_FOLLOW_SELF: "لا يمكنك متابعة نفسك.",
  DM_REQUIRES_MUTUAL_FOLLOW: "المحادثة الخاصة متاحة فقط عندما تتابعان بعضكما.",
  NOT_A_MEMBER: "أنت لست عضواً في هذه المحادثة.",
  GROUP_FULL: "المجموعة ممتلئة (الحد ٣٠ عضواً).",
  OWNER_CANNOT_LEAVE: "مالك المجموعة لا يمكنه المغادرة، لكن يمكنه حذفها.",
  RATE_LIMITED: "أرسلت رسائل كثيرة بسرعة. انتظر قليلاً.",
  INVALID_TRANSITION: "لا يمكن تنفيذ هذا الإجراء في الحالة الحالية.",
  CANNOT_REPORT_OWN: "لا يمكنك الإبلاغ عن محتواك أو عن نفسك.",
  REPORT_ALREADY_OPEN: "أبلغت عن هذا من قبل، والبلاغ قيد المراجعة.",
  CANNOT_SUSPEND: "لا يمكن إيقاف هذا الحساب.",
  INTERNAL_ERROR: GENERIC_ERROR,
};

export function errorMessage(code?: string | null): string {
  return (code && MESSAGES[code]) || GENERIC_ERROR;
}

/** Per-field Arabic messages for VALIDATION_FAILED details. */
const FIELD_MESSAGES: Record<string, string> = {
  name: "الاسم يجب أن يكون بين ٢ و٥٠ حرفاً.",
  username: "اسم المستخدم من ٣ إلى ٢٠ حرفاً: أحرف إنجليزية صغيرة وأرقام و _ فقط.",
  email: "أدخل بريداً إلكترونياً صحيحاً.",
  password: "كلمة المرور يجب أن تكون ٨ أحرف على الأقل.",
  identifier: "أدخل البريد الإلكتروني أو اسم المستخدم.",
  body: "النص طويل جداً. الحد ٢٠٠٠ حرف.",
};

export function fieldErrors(details: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!Array.isArray(details)) return out;
  for (const d of details as FieldErrorDetail[]) {
    if (d && typeof d.field === "string" && !out[d.field]) {
      out[d.field] = FIELD_MESSAGES[d.field] ?? "قيمة غير صالحة.";
    }
  }
  return out;
}
