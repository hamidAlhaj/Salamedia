/* Deterministic Salamedia seed (CLAUDE.md §4.13).
 * Running it twice produces identical rows and identical files in api/uploads/media.
 * All timestamps are offsets from a fixed ANCHOR, never now(). */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import * as bcrypt from 'bcrypt';
import {
  ConversationKind,
  MediaKind,
  MemberRole,
  ModerationState,
  PostKind,
  PrismaClient,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  Role,
  UserStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

// ───────────── fixed inputs ─────────────

const ANCHOR = Date.UTC(2026, 10, 10, 18, 0, 0); // 2026-11-10 18:00 UTC
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const at = (ms: number) => new Date(ms);

const PASSWORD = 'Password123!';
// Fixed bcrypt salt (cost 10) so password_hash is identical on every run. Dev seed only.
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, '$2b$10$SalamediaSeedSalt2026.');

const SEED_MEDIA = path.resolve(__dirname, 'seed-media');
const IMAGES_DIR = path.join(SEED_MEDIA, 'images');
const VIDEOS_DIR = path.join(SEED_MEDIA, 'videos');
const UPLOADS_MEDIA = path.resolve(__dirname, '..', 'uploads', 'media');
const UPLOADS_AVATARS = path.join(UPLOADS_MEDIA, 'avatars');

// Placeholder video metadata until the Phase 4 mp4 probe exists.
const VIDEO_DURATION_MS = 12_000;
const VIDEO_WIDTH = 720;
const VIDEO_HEIGHT = 1280;

/** Fixed media UUIDs: 5a1a3ed1-0000-4000-8000-<12-digit counter>. */
const mediaUuid = (n: number) => `5a1a3ed1-0000-4000-8000-${String(n).padStart(12, '0')}`;

/** Small deterministic PRNG (mulberry32). */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20261110);

// ───────────── users ─────────────

interface SeedUser {
  username: string;
  name: string;
  bio?: string;
  role?: Role;
}

const USERS: SeedUser[] = [
  { username: 'admin', name: 'إدارة سلاميديا', bio: 'حساب الإدارة. للإبلاغ عن أي إساءة استخدموا زر الإبلاغ.', role: Role.ADMIN },
  { username: 'demo', name: 'زائر سلمية', bio: 'حساب تجريبي للعرض 🌿' },
  { username: 'hamid', name: 'حامد', bio: 'من فريق سلاميديا. بحب البرمجة والقهوة المرة ☕' },
  { username: 'rami', name: 'رامي', bio: 'من فريق سلاميديا. باك إند وكرة قدم.' },
  { username: 'badr', name: 'بدر', bio: 'من فريق سلاميديا. بصوّر كل شي بالموبايل 📱' },
  { username: 'yousef', name: 'يوسف', bio: 'من فريق سلاميديا. واجهات ومشي عالقلعة.' },
  { username: 'nawar', name: 'نوار', bio: 'من فريق سلاميديا. تصميم وألوان 💙' },
  { username: 'layla', name: 'ليلى الحسن', bio: 'معلمة لغة عربية. بحب الشعر وصباحات سلمية.' },
  { username: 'omar', name: 'عمر الجندي', bio: 'مهندس زراعي ومحب للرحلات 🏞️' },
  { username: 'samer', name: 'سامر درويش', bio: 'مدرب كرة قدم بنادي المدينة ⚽' },
  { username: 'huda', name: 'هدى سليمان', bio: 'مطبخ ستي هو مدرستي 🍲' },
  { username: 'maya', name: 'مايا الخطيب', bio: 'شاعرة وطالبة أدب عربي 📜' },
  { username: 'karam', name: 'كرم العلي', bio: 'طالب هندسة معلوماتية.' },
  { username: 'fadi', name: 'فادي الأحمد', bio: 'بصوّر الغيوم والسهول ☁️' },
  { username: 'rasha', name: 'رشا يوسف', bio: 'أم وربة منزل وبحب الزراعة 🌸' },
  { username: 'troll', name: 'المشاكس', bio: 'هون لحتى إزعجكم 😈' },
];

// Who follows whom. [follower, ...followees]
const FOLLOWS: [string, string[]][] = [
  ['admin', ['hamid', 'rami']],
  ['demo', ['hamid', 'rami', 'layla', 'omar', 'nawar', 'maya', 'samer']],
  ['hamid', ['demo', 'rami', 'badr', 'yousef', 'nawar', 'layla', 'omar', 'admin']],
  ['rami', ['demo', 'hamid', 'badr', 'yousef', 'nawar', 'samer', 'admin']],
  ['badr', ['hamid', 'rami', 'yousef', 'nawar', 'fadi']],
  ['yousef', ['hamid', 'rami', 'badr', 'nawar', 'omar']],
  ['nawar', ['hamid', 'rami', 'badr', 'yousef', 'demo', 'maya']],
  ['layla', ['demo', 'hamid', 'maya', 'omar', 'huda', 'rasha']],
  ['omar', ['layla', 'hamid', 'samer', 'fadi', 'yousef']],
  ['samer', ['omar', 'karam', 'rami', 'fadi']],
  ['huda', ['layla', 'rasha', 'maya']],
  ['maya', ['layla', 'nawar', 'huda', 'demo']],
  ['karam', ['samer', 'yousef', 'hamid']],
  ['fadi', ['omar', 'samer', 'badr']],
  ['rasha', ['huda', 'layla']],
  ['troll', ['hamid', 'demo', 'layla', 'omar', 'samer', 'maya']],
];

// ───────────── posts and reels (chronological) ─────────────

interface SeedPost {
  key: string;
  author: string;
  body?: string;
  images?: number;
  video?: boolean;
  reel?: boolean;
  repostOf?: string;
  hidden?: { reason: string };
}

const TIMELINE: SeedPost[] = [
  { key: 'welcome', author: 'hamid', body: 'أهلاً وسهلاً بالجميع على سلاميديا 👋 أول منصة من سلمية ولسلمية. اكتبوا، صوّروا، وشاركونا يومياتكم.' },
  { key: 'morning', author: 'layla', body: 'صباح الخير من سلمية ☀️ القهوة على البلكون وصوت العصافير، شو بدكن أحلى من هيك؟', images: 1 },
  { key: 'castle', author: 'omar', body: 'طلعنا امبارح على قلعة شميميس قبل الغروب، المنظر من فوق ما بينوصف. اللي ما طلعها لهلق عم يفوّت كتير.', images: 3 },
  { key: 'bootcamp1', author: 'rami', body: 'اليوم أول يوم بالبوتكامب. متحمسين كتير، وإن شاء الله نطلّع شي يرفع الراس 💪' },
  { key: 'match', author: 'samer', body: 'مين نازل يحضر مباراة الأحد بالملعب البلدي؟ الحماس واصل للسما ⚽' },
  { key: 'spam', author: 'troll', body: 'اربح ١٠٠٠ دولار باليوم وانت قاعد ببيتك!! راسلني عالخاص فوراً 💰💰💰', hidden: { reason: 'سبام واحتيال' } },
  { key: 'market', author: 'huda', body: 'سوق الهال اليوم مليان خير: بندورة، خيار، وتين أول الموسم. الأسعار نزلت شوي الحمد لله.', images: 1 },
  { key: 'poetry', author: 'maya', body: 'أمسية شعرية الخميس الجاي بالمركز الثقافي، الدعوة عامة. تعالوا نسمع قصايد من شباب وصبايا سلمية 📜', images: 1 },
  { key: 'reel-oldcity', author: 'badr', reel: true, body: 'جولة سريعة بشوارع سلمية القديمة 🎥' },
  { key: 'phone', author: 'karam', body: 'حدا بيعرف محل بيصلّح موبايلات منيح بالسوق؟ شاشتي انكسرت 😩' },
  { key: 'logo', author: 'nawar', body: 'خلصنا تصميم الشعار الأولي لسلاميديا، الأزرق الفراتي صار رسمي 💙 شو رأيكم؟', images: 1 },
  { key: 'demo-hello', author: 'demo', body: 'مرحبا! أنا جديد هون، مبسوط إني لقيت مكان يجمع أهل سلمية 🌿' },
  { key: 'weather', author: 'fadi', body: 'الطقس اليوم بارد الصبح ودافي الضهر، يعني لا تطلعوا بلا جاكيت ولا تتحمّسوا كتير 😄' },
  { key: 'reel-makdous', author: 'rasha', reel: true, body: 'تحضير المكدوس مع ستي، تقليد كل سنة 🍆' },
  { key: 'rp-castle', author: 'layla', repostOf: 'castle', body: 'لازم نعملها رحلة جماعية الشهر الجاي!' },
  { key: 'advice', author: 'yousef', body: 'نصيحة لكل المبرمجين الجدد: اكتبوا كود بسيط ومفهوم قبل ما تفكروا بالشطارة.' },
  { key: 'castle-video', author: 'omar', body: 'فيديو قصير من طريق القلعة، الهوا كان قوي بس الجو خرافي 🌬️', video: true },
  { key: 'hundred', author: 'hamid', body: 'شكراً لكل اللي سجّل باليوم الأول، وصلنا أكتر من ١٠٠ حساب! 🎉' },
  { key: 'insult', author: 'troll', body: 'هالمنصة فاشلة وكل اللي فيها فاشلين 🙄' },
  { key: 'win', author: 'samer', body: 'الحمد لله فزنا ٢-١ 🔥 الجمهور كان رهيب', images: 2 },
  { key: 'reel-poem', author: 'maya', reel: true, body: 'قصيدة قصيرة على أطراف المدينة عند الغروب' },
  { key: 'rp-logo', author: 'demo', repostOf: 'logo' },
  { key: 'maamoul', author: 'huda', body: 'عملت اليوم معمول بالجوز للعيد، الريحة عبّت البناية كلها 😋', images: 2 },
  { key: 'phone-fixed', author: 'karam', body: 'شكراً لكل اللي دلّني، صلّحت الموبايل وصار متل الجديد 🙏' },
  { key: 'reel-bootcamp', author: 'rami', reel: true, body: 'كواليس يوم كامل بالبوتكامب 💻' },
  { key: 'rp-win', author: 'fadi', repostOf: 'win', body: 'أحلى مباراة هالموسم!' },
  { key: 'cafe', author: 'layla', body: 'مقهى جديد فتح قرب الساحة، القهوة طيبة والقعدة حلوة. جربوه وقولولي رأيكم ☕', images: 1 },
  { key: 'dark-mode', author: 'nawar', body: 'سؤال للمصممين: بتفضلوا الوضع الليلي ولا النهاري؟ 🌙☀️' },
  { key: 'reel-logo', author: 'nawar', reel: true, body: 'تصميم الشعار خطوة بخطوة' },
  { key: 'night-video', author: 'badr', body: 'تجربة كاميرا الموبايل الجديد بالليل بسلمية ✨', video: true },
  { key: 'school', author: 'omar', body: 'ذكريات المدرسة بالحارة القديمة... مين بيتذكر بياع الفول عالزاوية؟' },
  { key: 'reel-trick', author: 'yousef', reel: true, body: 'حيلة صغيرة بتوفّر عليكم ساعات بالكود' },
  { key: 'rain', author: 'rasha', body: 'مساء الخير، المطر بلش يرشّ شوي 🌧️ ريحة التراب بعد أول شتوة ما في متلها.' },
  { key: 'rp-makdous', author: 'hamid', repostOf: 'reel-makdous', body: 'هيك التراث ولا بلا 😍' },
  { key: 'training', author: 'samer', body: 'تمرين اليوم الساعة ٥ بالملعب، اللي حابب يشارك أهلا وسهلا' },
  { key: 'poetry-photos', author: 'maya', body: 'صور من أمسية الشعر، شكراً لكل الحضور 🌹', images: 4 },
  { key: 'demo-thanks', author: 'demo', body: 'أحلى شي بسلمية الناس الطيبين. شكراً على الترحيب يا جماعة ❤️' },
  { key: 'reel-zaatar', author: 'huda', reel: true, body: 'طريقة سريعة لعمل الزعتر البلدي' },
  { key: 'study', author: 'karam', body: 'مين عنده اقتراح لمكان هادي للدراسة؟ المكتبة صارت عجقة.' },
  { key: 'rp-poetry', author: 'layla', repostOf: 'poetry-photos', body: 'كانت أمسية بتجنن' },
  { key: 'deadline', author: 'rami', body: 'يوم التسليم قرّب، دعواتكم يا جماعة 🤞' },
  { key: 'f4f', author: 'troll', body: 'تابعوني وأنا بتابعكم 🔁🔁 follow4follow' },
  { key: 'clouds', author: 'fadi', body: 'غيوم العصر فوق السهل الشرقي ☁️', images: 1 },
  { key: 'rp-deadline', author: 'nawar', repostOf: 'deadline', body: 'الله يوفقكن، فريق بطل 💙' },
  { key: 'reel-souq', author: 'badr', reel: true, body: 'لقطات سريعة من سوق سلمية يوم الجمعة' },
  { key: 'goodnight', author: 'omar', body: 'تصبحون على خير يا أهل سلمية 🌙' },
  { key: 'trip', author: 'yousef', body: 'مين جاهز لرحلة الجمعة على شميميس؟ نتجمع ٧ الصبح عند الساحة 🚶‍♂️' },
  { key: 'flowers', author: 'rasha', body: 'زهور الحديقة بلشت تفتّح 🌸', images: 2 },
  { key: 'two-weeks', author: 'hamid', body: 'أسبوعين على الإطلاق، شكراً لكل واحد فيكن 💙 لسا الجاي أحلى.' },
];

// [postKey, author, body]
const COMMENTS: [string, string, string][] = [
  ['welcome', 'layla', 'مبروك! فكرة حلوة كتير 👏'],
  ['welcome', 'omar', 'أخيراً شي من سلمية ولسلمية'],
  ['welcome', 'rami', 'يلا يا شباب سجّلوا 💪'],
  ['morning', 'huda', 'صباح النور يا ليلى ☀️'],
  ['morning', 'maya', 'بلكونتك أحلى بلكونة بسلمية'],
  ['castle', 'yousef', 'الصور بتجنن! أي ساعة طلعتوا؟'],
  ['castle', 'omar', 'طلعنا الساعة ٤ ونص تقريباً، لحقنا الغروب'],
  ['castle', 'fadi', 'المرة الجاية خبروني بدي إجي معكن'],
  ['castle', 'demo', 'لازم زورها قريباً'],
  ['bootcamp1', 'hamid', 'بالتوفيق يا بطل'],
  ['bootcamp1', 'nawar', 'فريقنا رح يكسّر الدنيا 💙'],
  ['match', 'karam', 'أنا نازل أكيد'],
  ['match', 'fadi', 'حجزلي محل جنبك'],
  ['market', 'rasha', 'التين هالسنة طيب كتير'],
  ['market', 'layla', 'بدي إنزل بكرا الصبح بكير'],
  ['poetry', 'layla', 'أكيد جاية 🌹'],
  ['poetry', 'demo', 'وين بالضبط المركز الثقافي؟'],
  ['poetry', 'maya', 'جنب الساحة الرئيسية، أهلا وسهلا فيك'],
  ['reel-oldcity', 'omar', 'هالحارات فيها ذكريات كتير'],
  ['reel-oldcity', 'yousef', 'تصوير حلو يا بدر'],
  ['phone', 'yousef', 'في محل بأول السوق اسمه أبو سامي، منيح كتير'],
  ['phone', 'samer', 'جرب عند الجسر، أسعاره معقولة'],
  ['logo', 'hamid', 'اللون بيجنن 😍'],
  ['logo', 'maya', 'بسيط وأنيق'],
  ['logo', 'badr', 'أحلى من كل الاقتراحات القديمة'],
  ['demo-hello', 'hamid', 'أهلاً فيك، نوّرت 🌿'],
  ['demo-hello', 'layla', 'أهلا وسهلا!'],
  ['demo-hello', 'troll', 'مين سألك؟ 😂'],
  ['weather', 'rasha', 'والله البرد الصبح قاسي'],
  ['reel-makdous', 'huda', 'ستك فنانة! 😍'],
  ['reel-makdous', 'layla', 'ريحته واصلة لعنا'],
  ['advice', 'karam', 'نصيحة ذهب، شكراً'],
  ['advice', 'rami', 'والتعليقات المفهومة كمان'],
  ['castle-video', 'fadi', 'الهوا عم يصفّر بالفيديو 😄'],
  ['hundred', 'nawar', 'وهاد بس البداية'],
  ['insult', 'layla', 'إذا مو عاجبك لا تفوت 🙂'],
  ['win', 'karam', 'مبروك يا كابتن!'],
  ['win', 'omar', 'الهدف التاني كان خرافي'],
  ['win', 'rami', 'أبطال 🔥'],
  ['reel-poem', 'layla', 'كلمات بتلمس القلب'],
  ['reel-poem', 'demo', 'صوتك حلو كتير'],
  ['maamoul', 'rasha', 'ابعتيلي الوصفة الله يخليكي'],
  ['maamoul', 'maya', 'شكلها بتجنن'],
  ['reel-bootcamp', 'hamid', 'هاد أنا بالزاوية 😂'],
  ['cafe', 'omar', 'جربته، القهوة فعلاً طيبة'],
  ['cafe', 'demo', 'أي ساعة بيفتح؟'],
  ['cafe', 'layla', 'من ٨ الصبح لـ ١١ بالليل'],
  ['dark-mode', 'yousef', 'الليلي أكيد 🌙'],
  ['dark-mode', 'hamid', 'النهاري بالنهار والليلي بالليل، خليه تلقائي'],
  ['night-video', 'fadi', 'الكاميرا ممتازة بالليل'],
  ['school', 'samer', 'أبو محمود! كان الفول عنده ما بيتعوّض'],
  ['school', 'fadi', 'وبياع العرق سوس بالصيف'],
  ['rain', 'huda', 'الله يجعلها سنة خير 🌧️'],
  ['training', 'karam', 'أنا جاي'],
  ['poetry-photos', 'layla', 'أمسية ولا أروع'],
  ['poetry-photos', 'nawar', 'الإضاءة حلوة بالصور'],
  ['demo-thanks', 'hamid', 'أهل سلمية هيك 💙'],
  ['study', 'yousef', 'المقهى الجديد فيه زاوية هادية الصبح'],
  ['deadline', 'hamid', 'قربنا! خلصانة إن شاء الله'],
  ['deadline', 'badr', 'كلنا معكن'],
  ['clouds', 'omar', 'السهل الشرقي بالخريف شي تاني'],
  ['trip', 'omar', 'أنا جاي ومعي الترمس ☕'],
  ['trip', 'demo', 'حطوني معكن'],
  ['flowers', 'huda', 'ما شاء الله، الحديقة بتجنن'],
  ['two-weeks', 'layla', 'شكراً إلكن انتو 💙'],
  ['two-weeks', 'demo', 'لسا الجاي أحلى!'],
];

// ───────────── chats ─────────────

const PUBLIC_MESSAGES: [string, string][] = [
  ['hamid', 'أهلاً بالجميع بالدردشة العامة لسلاميديا 👋'],
  ['layla', 'مرحبا يا جماعة'],
  ['omar', 'أهلين، الدردشة شغالة تمام'],
  ['rami', 'جربوا تبعتوا رسائل بسرعة، في حد للرسائل 😄'],
  ['samer', 'مساء الخير من الملعب'],
  ['huda', 'مساء النور'],
  ['maya', 'حدا جاي عالأمسية الشعرية؟'],
  ['layla', 'أنا أكيد'],
  ['karam', 'وأنا إذا خلصت دراسة'],
  ['fadi', 'الطقس اليوم حلو للمشي'],
  ['troll', 'كلكن مملين 🙄'],
  ['rasha', 'صباح الخير يا أهل سلمية'],
  ['omar', 'صباح النور يا رشا'],
  ['nawar', 'شو رأيكم بالشعار الجديد؟'],
  ['hamid', 'بيجنن يا نوار 💙'],
  ['badr', 'أنا صوّرت فيديو للمدينة القديمة، رح نزّله ريل'],
  ['yousef', 'نطرانينه'],
  ['samer', 'مباراة الأحد الساعة ٤، لا تنسوا'],
  ['karam', 'مين عنده رقم محل الموبايلات؟'],
  ['yousef', 'شفت تعليقي عالبوست، أبو سامي بأول السوق'],
  ['karam', 'شكراً يوسف 🙏'],
  ['troll', 'اربحوا مصاري من البيت، راسلوني!!! 💰'],
  ['demo', 'مرحبا، أنا جديد هون'],
  ['layla', 'أهلا وسهلا فيك'],
  ['hamid', 'نوّرت يا demo'],
  ['maya', 'أهلين 🌸'],
  ['fadi', 'حدا شاف الغيوم اليوم العصر؟'],
  ['omar', 'شفتها، كانت متل اللوحة'],
  ['huda', 'عملت معمول اليوم، بتمنى لو فيني وزّع عالكل 😋'],
  ['rasha', 'ابعتيلي واحدة 😄'],
  ['samer', 'فزنا ٢-١ 🔥🔥'],
  ['karam', 'مبرووك'],
  ['rami', 'أبطال المدينة'],
  ['fadi', 'كان الجو بالملعب خرافي'],
  ['nawar', 'سؤال: الوضع الليلي ولا النهاري؟'],
  ['yousef', 'الليلي'],
  ['badr', 'الليلي أكيد'],
  ['layla', 'أنا بحب النهاري بصراحة'],
  ['hamid', 'رح نخليه تلقائي حسب جهازك'],
  ['troll', 'تابعوني وبتابعكم 🔁'],
  ['rasha', 'المطر بلش 🌧️'],
  ['huda', 'الله يجعلها سنة خير'],
  ['omar', 'ريحة التراب بعد الشتوة ما في متلها'],
  ['maya', 'شكراً لكل اللي حضر الأمسية امبارح 🌹'],
  ['layla', 'كانت أمسية رائعة'],
  ['demo', 'خسارة ما قدرت إجي، المرة الجاية'],
  ['karam', 'حدا بيعرف مكان هادي للدراسة؟'],
  ['yousef', 'المقهى الجديد قرب الساحة الصبح هادي'],
  ['rami', 'يوم التسليم قرّب يا جماعة 🤞'],
  ['badr', 'الله يوفقكن'],
  ['samer', 'تمرين بكرا الساعة ٥'],
  ['fadi', 'أنا جاي'],
  ['yousef', 'رحلة الجمعة على شميميس، مين جاي؟'],
  ['omar', 'أنا'],
  ['demo', 'وأنا!'],
  ['fadi', 'حطوني معكن'],
  ['rasha', 'الورد بالحديقة بلش يفتح 🌸'],
  ['hamid', 'أسبوعين على الإطلاق، شكراً إلكن كلكن 💙'],
  ['layla', 'شكراً إلكن انتو'],
  ['omar', 'تصبحون على خير يا أهل سلمية 🌙'],
];
const PUBLIC_HIDDEN_INDEX = 10; // troll: "كلكن مملين"
const PUBLIC_REPORTED_INDEX = 21; // troll spam, OPEN report

const DM_DEMO_HAMID: [string, string][] = [
  ['hamid', 'أهلا! كيفك؟ شو رأيك بالمنصة لهلق؟'],
  ['demo', 'أهلين حامد، حلوة كتير وسريعة'],
  ['hamid', 'إذا لاحظت أي مشكلة خبرني'],
  ['demo', 'أكيد. الريلز عجبوني كتير'],
  ['hamid', 'تعبنا عليهن 😄'],
  ['demo', 'مبين! يعطيكن العافية'],
  ['hamid', 'بتجي رحلة الجمعة؟'],
  ['hamid', 'رح نطلع على شميميس الساعة ٧'],
];
const DM_DEMO_LAYLA: [string, string][] = [
  ['layla', 'أهلا وسهلا فيك بسلمية 🌸'],
  ['demo', 'أهلين ليلى، شكراً كتير'],
  ['layla', 'إذا بتحب الشعر لازم تجي عالأمسيات'],
  ['demo', 'أكيد، خبريني بالموعد الجاي'],
  ['layla', 'الخميس الجاي إن شاء الله'],
  ['demo', 'تمام، رح كون هونيك'],
];
const GROUP_TITLE = 'شباب البوتكامب 💻';
const GROUP_MESSAGES: [string, string][] = [
  ['rami', 'عملت هالجروب لننسق الشغل'],
  ['hamid', 'فكرة ممتازة'],
  ['nawar', 'خلصت الأيقونات، رفعتهن عالدرايف'],
  ['demo', 'أهلين يا شباب'],
  ['rami', 'أهلا demo، نوّرت الجروب'],
  ['hamid', 'بكرا اجتماع الساعة ١٠'],
  ['nawar', 'تمام'],
  ['rami', 'لا تنسوا تجهزوا العرض'],
  ['hamid', 'الديمو جاهز تقريباً'],
  ['nawar', 'رح جرب الوضع الليلي اليوم بالليل 🌙'],
];

// ───────────── helpers ─────────────

const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;

function listFiles(dir: string, exts: string[]): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => exts.includes(path.extname(f).toLowerCase()))
    .sort();
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** A vertical two-colour gradient PNG (8-bit RGB). Each row is one colour, so it compresses to a few KB. */
function gradientPng(w: number, h: number, top: number[], bottom: number[]): Buffer {
  const rowLen = 1 + 3 * w;
  const raw = Buffer.alloc(rowLen * h);
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    const o = y * rowLen;
    raw[o] = 1; // filter "Sub": first pixel holds the colour, the rest are zero deltas
    for (let c = 0; c < 3; c++) raw[o + 1 + c] = Math.round(top[c] + (bottom[c] - top[c]) * t);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const GRADIENTS: [number, number, number[], number[]][] = [
  [1080, 1080, [14, 116, 144], [125, 211, 252]],
  [1080, 1080, [234, 88, 12], [253, 186, 116]],
  [1080, 1350, [21, 128, 61], [187, 247, 208]],
  [1080, 1080, [120, 53, 15], [253, 230, 138]],
  [1080, 1080, [30, 58, 138], [165, 180, 252]],
  [1080, 1350, [190, 18, 60], [253, 164, 175]],
  [1080, 1080, [17, 94, 89], [153, 246, 228]],
  [1080, 1080, [113, 63, 18], [254, 215, 170]],
  [1080, 1350, [76, 29, 149], [221, 214, 254]],
  [1080, 1080, [8, 47, 73], [56, 189, 248]],
  [1080, 1080, [133, 77, 14], [254, 240, 138]],
  [1080, 1080, [55, 65, 81], [229, 231, 235]],
];

function ensureSeedImages(): string[] {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  let files = listFiles(IMAGES_DIR, ['.jpg', '.jpeg', '.png']);
  if (files.length === 0) {
    GRADIENTS.forEach(([w, h, top, bottom], i) => {
      const name = `generated-${String(i + 1).padStart(2, '0')}.png`;
      fs.writeFileSync(path.join(IMAGES_DIR, name), gradientPng(w, h, top, bottom));
    });
    console.log(`Generated ${GRADIENTS.length} gradient PNGs in prisma/seed-media/images/`);
    files = listFiles(IMAGES_DIR, ['.jpg', '.jpeg', '.png']);
  }
  return files;
}

/** Width and height from a PNG IHDR or a JPEG SOF marker. */
function imageSize(buf: Buffer): { width: number; height: number } {
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let o = 2;
    while (o + 9 < buf.length) {
      if (buf[o] !== 0xff) {
        o++;
        continue;
      }
      const marker = buf[o + 1];
      const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isSof) return { height: buf.readUInt16BE(o + 5), width: buf.readUInt16BE(o + 7) };
      o += 2 + buf.readUInt16BE(o + 2);
    }
  }
  throw new Error('Unsupported seed image (expected PNG or JPEG)');
}

function resetUploads(): void {
  fs.rmSync(UPLOADS_MEDIA, { recursive: true, force: true });
  fs.mkdirSync(UPLOADS_AVATARS, { recursive: true });
}

// ───────────── main ─────────────

async function main(): Promise<void> {
  const images = ensureSeedImages();
  const videos = listFiles(VIDEOS_DIR, ['.mp4']);
  if (videos.length === 0) {
    console.warn(
      yellow(
        '⚠ No videos in prisma/seed-media/videos/. Video posts and reels are SKIPPED (and reposts of them).\n' +
          '  Add vertical H.264 .mp4 clips (≤15 s, ≤8 MB) and run `npm run db:seed` again.',
      ),
    );
  }

  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE reports, messages, conversation_members, conversations, reel_views, comments, likes, media, posts, follows, users RESTART IDENTITY CASCADE',
  );
  resetUploads();

  // Users
  const userId = new Map<string, number>();
  for (const [i, u] of USERS.entries()) {
    const createdAt = at(ANCHOR - 30 * DAY + i * HOUR);
    const row = await prisma.user.create({
      data: {
        username: u.username,
        name: u.name,
        email: `${u.username}@salamedia.test`,
        passwordHash: PASSWORD_HASH,
        bio: u.bio,
        role: u.role ?? Role.USER,
        status: UserStatus.ACTIVE,
        createdAt,
        updatedAt: createdAt,
      },
    });
    userId.set(u.username, row.id);
  }
  const uid = (username: string): number => {
    const id = userId.get(username);
    if (id === undefined) throw new Error(`Unknown seed user ${username}`);
    return id;
  };
  const adminId = uid('admin');
  const trollId = uid('troll');

  // Follows
  const followRows = FOLLOWS.flatMap(([follower, followees], i) =>
    followees.map((followee, j) => ({
      followerId: uid(follower),
      followeeId: uid(followee),
      createdAt: at(ANCHOR - 20 * DAY + i * HOUR + j * MIN),
    })),
  );
  await prisma.follow.createMany({ data: followRows });

  // Posts, reels, media
  const postId = new Map<string, number>();
  const postTime = new Map<string, number>();
  const postAuthor = new Map<string, number>();
  const reelKeys: string[] = [];
  let mediaCounter = 0;
  let imageCursor = 0;
  let videoCursor = 0;
  let skipped = 0;

  const span = 14 * DAY - 6 * HOUR;
  const step = span / TIMELINE.length;
  const start = ANCHOR - 14 * DAY + 2 * HOUR;

  for (const [i, p] of TIMELINE.entries()) {
    const needsVideo = p.reel || p.video;
    if ((needsVideo && videos.length === 0) || (p.repostOf && !postId.has(p.repostOf))) {
      skipped++;
      continue;
    }
    const createdMs = start + i * step + ((i * 7919) % 97) * (step / 2 / 97);
    const createdAt = at(createdMs);
    const authorId = uid(p.author);
    const hiddenAt = p.hidden ? at(createdMs + 3 * HOUR) : null;

    const post = await prisma.post.create({
      data: {
        authorId,
        kind: p.reel ? PostKind.REEL : PostKind.POST,
        body: p.body ?? null,
        repostOfId: p.repostOf ? postId.get(p.repostOf) : null,
        moderationState: p.hidden ? ModerationState.HIDDEN : ModerationState.VISIBLE,
        hiddenAt,
        hiddenById: p.hidden ? adminId : null,
        hiddenReason: p.hidden?.reason ?? null,
        createdAt,
        updatedAt: hiddenAt ?? createdAt,
      },
    });
    postId.set(p.key, post.id);
    postTime.set(p.key, createdMs);
    postAuthor.set(p.key, authorId);
    if (p.reel) reelKeys.push(p.key);

    const mediaRows = [];
    for (let pos = 0; pos < (p.images ?? 0); pos++) {
      const src = images[imageCursor++ % images.length];
      const buf = fs.readFileSync(path.join(IMAGES_DIR, src));
      const isPng = src.toLowerCase().endsWith('.png');
      const id = mediaUuid(++mediaCounter);
      const fileName = `${id}.${isPng ? 'png' : 'jpg'}`;
      fs.writeFileSync(path.join(UPLOADS_MEDIA, fileName), buf);
      mediaRows.push({
        id,
        ownerId: authorId,
        postId: post.id,
        kind: MediaKind.IMAGE,
        fileName,
        mimeType: isPng ? 'image/png' : 'image/jpeg',
        sizeBytes: buf.length,
        ...imageSize(buf),
        position: pos,
        createdAt: at(createdMs - MIN),
      });
    }
    if (needsVideo) {
      const src = videos[videoCursor++ % videos.length];
      const id = mediaUuid(++mediaCounter);
      const fileName = `${id}.mp4`;
      fs.copyFileSync(path.join(VIDEOS_DIR, src), path.join(UPLOADS_MEDIA, fileName));
      mediaRows.push({
        id,
        ownerId: authorId,
        postId: post.id,
        kind: MediaKind.VIDEO,
        fileName,
        mimeType: 'video/mp4',
        sizeBytes: fs.statSync(path.join(UPLOADS_MEDIA, fileName)).size,
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        durationMs: VIDEO_DURATION_MS,
        position: 0,
        createdAt: at(createdMs - MIN),
      });
    }
    if (mediaRows.length > 0) await prisma.media.createMany({ data: mediaRows });
  }

  // Comments (sorted by time so ids follow time)
  const commentKey = new Map<string, number>();
  const commentRows = COMMENTS.filter(([key]) => postId.has(key)).map(([key, author, body], i) => {
    const base = postTime.get(key)!;
    const offset = (20 + ((i * 37) % 180)) * MIN + (i % 5) * 7 * MIN;
    return { key, author, body, createdMs: Math.min(base + offset, ANCHOR - MIN) };
  });
  commentRows.sort((a, b) => a.createdMs - b.createdMs);
  for (const c of commentRows) {
    const row = await prisma.comment.create({
      data: {
        postId: postId.get(c.key)!,
        authorId: uid(c.author),
        body: c.body,
        createdAt: at(c.createdMs),
        updatedAt: at(c.createdMs),
      },
    });
    commentKey.set(`${c.key}|${c.author}|${c.body}`, row.id);
  }

  // Likes: deterministic PRNG, never by the author, troll's posts get few
  const allIds = USERS.map((u) => uid(u.username));
  const likeRows: { userId: number; postId: number; createdAt: Date }[] = [];
  for (const [key, id] of postId) {
    const author = postAuthor.get(key)!;
    const candidates = allIds.filter((u) => u !== author && u !== adminId);
    const max = author === trollId ? 2 : candidates.length;
    const n = Math.floor(rng() * max * 0.75);
    const shuffled = [...candidates].sort(() => rng() - 0.5).slice(0, n);
    shuffled.forEach((u, j) =>
      likeRows.push({
        userId: u,
        postId: id,
        createdAt: at(Math.min(postTime.get(key)! + (j + 1) * 11 * MIN, ANCHOR - MIN)),
      }),
    );
  }
  await prisma.like.createMany({ data: likeRows });

  // Reel views: up to one per user per reel per UTC day
  const viewRows: { reelId: number; userId: number; viewedOn: Date }[] = [];
  for (const key of reelKeys) {
    const created = postTime.get(key)!;
    for (const u of allIds) {
      if (rng() < 0.3) continue;
      const days = 1 + Math.floor(rng() * 3);
      for (let d = 0; d < days; d++) {
        const ms = created + d * DAY;
        if (ms > ANCHOR) break;
        const day = new Date(ms);
        viewRows.push({
          reelId: postId.get(key)!,
          userId: u,
          viewedOn: new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate())),
        });
      }
    }
  }
  await prisma.reelView.createMany({ data: viewRows, skipDuplicates: true });

  // Conversations and messages
  async function addMessages(
    conversationId: number,
    lines: [string, string][],
    startMs: number,
    stepMs: number,
  ): Promise<number[]> {
    const ids: number[] = [];
    for (const [i, [author, body]] of lines.entries()) {
      const createdAt = at(startMs + i * stepMs + ((i * 13) % 7) * MIN);
      const row = await prisma.message.create({
        data: { conversationId, senderId: uid(author), body, createdAt },
      });
      ids.push(row.id);
    }
    const last = await prisma.message.findUniqueOrThrow({ where: { id: ids[ids.length - 1] } });
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: last.createdAt, updatedAt: last.createdAt },
    });
    return ids;
  }

  const publicCreated = at(ANCHOR - 15 * DAY);
  const publicRoom = await prisma.conversation.create({
    data: { kind: ConversationKind.PUBLIC, createdAt: publicCreated, updatedAt: publicCreated },
  });
  const publicIds = await addMessages(
    publicRoom.id,
    PUBLIC_MESSAGES,
    ANCHOR - 14 * DAY + HOUR,
    (14 * DAY - 3 * HOUR) / PUBLIC_MESSAGES.length,
  );
  const hiddenMsgId = publicIds[PUBLIC_HIDDEN_INDEX];
  const hiddenMsg = await prisma.message.findUniqueOrThrow({ where: { id: hiddenMsgId } });
  const msgHiddenAt = at(hiddenMsg.createdAt.getTime() + 2 * HOUR);
  await prisma.message.update({
    where: { id: hiddenMsgId },
    data: {
      moderationState: ModerationState.HIDDEN,
      hiddenAt: msgHiddenAt,
      hiddenById: adminId,
      hiddenReason: 'إساءة للمستخدمين',
    },
  });

  async function direct(a: string, b: string, lines: [string, string][], startMs: number, demoReadUpTo: number) {
    const [lo, hi] = [uid(a), uid(b)].sort((x, y) => x - y);
    const createdAt = at(startMs - MIN);
    const conv = await prisma.conversation.create({
      data: {
        kind: ConversationKind.DIRECT,
        directKey: `${lo}:${hi}`,
        createdById: uid(lines[0][0]),
        createdAt,
        updatedAt: createdAt,
      },
    });
    const ids = await addMessages(conv.id, lines, startMs, 25 * MIN);
    await prisma.conversationMember.createMany({
      data: [a, b].map((u) => ({
        conversationId: conv.id,
        userId: uid(u),
        role: MemberRole.MEMBER,
        lastReadMessageId: u === 'demo' ? ids[demoReadUpTo - 1] : ids[ids.length - 1],
        joinedAt: createdAt,
      })),
    });
  }
  await direct('demo', 'hamid', DM_DEMO_HAMID, ANCHOR - 2 * DAY, 6); // 2 unread for demo
  await direct('demo', 'layla', DM_DEMO_LAYLA, ANCHOR - 3 * DAY, DM_DEMO_LAYLA.length);

  const groupCreated = at(ANCHOR - 4 * DAY);
  const group = await prisma.conversation.create({
    data: {
      kind: ConversationKind.GROUP,
      title: GROUP_TITLE,
      createdById: uid('rami'),
      createdAt: groupCreated,
      updatedAt: groupCreated,
    },
  });
  const groupIds = await addMessages(group.id, GROUP_MESSAGES, ANCHOR - 4 * DAY + HOUR, 3 * HOUR);
  await prisma.conversationMember.createMany({
    data: ['rami', 'hamid', 'nawar', 'demo'].map((u) => ({
      conversationId: group.id,
      userId: uid(u),
      role: u === 'rami' ? MemberRole.OWNER : MemberRole.MEMBER,
      lastReadMessageId: u === 'demo' ? groupIds[6] : groupIds[groupIds.length - 1], // demo: 3 unread
      joinedAt: groupCreated,
    })),
  });

  // Reports
  const spamHiddenAt = postId.has('spam') ? at(postTime.get('spam')! + 3 * HOUR) : null;
  const trollComment = commentKey.get('demo-hello|troll|مين سألك؟ 😂');
  type ReportInput = {
    reporter: string;
    targetType: ReportTargetType;
    postId?: number;
    commentId?: number;
    messageId?: number;
    userId?: number;
    reason: ReportReason;
    details?: string;
    status: ReportStatus;
    createdMs: number;
    resolvedAt?: Date;
  };
  const reports: ReportInput[] = [
    // OPEN, all against troll
    { reporter: 'demo', targetType: ReportTargetType.POST, postId: postId.get('insult'), reason: ReportReason.HARASSMENT, status: ReportStatus.OPEN, createdMs: postTime.get('insult')! + HOUR },
    { reporter: 'layla', targetType: ReportTargetType.POST, postId: postId.get('insult'), reason: ReportReason.HATE, details: 'إهانة لكل المستخدمين', status: ReportStatus.OPEN, createdMs: postTime.get('insult')! + 2 * HOUR },
    { reporter: 'demo', targetType: ReportTargetType.COMMENT, commentId: trollComment, reason: ReportReason.HARASSMENT, status: ReportStatus.OPEN, createdMs: postTime.get('demo-hello')! + 5 * HOUR },
    { reporter: 'hamid', targetType: ReportTargetType.MESSAGE, messageId: publicIds[PUBLIC_REPORTED_INDEX], reason: ReportReason.SPAM, status: ReportStatus.OPEN, createdMs: ANCHOR - 9 * DAY },
    { reporter: 'omar', targetType: ReportTargetType.USER, userId: trollId, reason: ReportReason.SPAM, details: 'حساب مزعج وبيبعت سبام بكل مكان', status: ReportStatus.OPEN, createdMs: ANCHOR - 2 * DAY },
    // ACTIONED: the hidden spam post and the hidden public message
    ...(postId.has('spam')
      ? [
          { reporter: 'omar', targetType: ReportTargetType.POST, postId: postId.get('spam'), reason: ReportReason.SPAM, status: ReportStatus.ACTIONED, createdMs: postTime.get('spam')! + HOUR, resolvedAt: spamHiddenAt! },
          { reporter: 'maya', targetType: ReportTargetType.POST, postId: postId.get('spam'), reason: ReportReason.SPAM, details: 'احتيال', status: ReportStatus.ACTIONED, createdMs: postTime.get('spam')! + 2 * HOUR, resolvedAt: spamHiddenAt! },
        ]
      : []),
    { reporter: 'layla', targetType: ReportTargetType.MESSAGE, messageId: hiddenMsgId, reason: ReportReason.HATE, status: ReportStatus.ACTIONED, createdMs: hiddenMsg.createdAt.getTime() + HOUR, resolvedAt: msgHiddenAt },
    // DISMISSED
    { reporter: 'karam', targetType: ReportTargetType.POST, postId: postId.get('match'), reason: ReportReason.OTHER, details: 'ما عجبني', status: ReportStatus.DISMISSED, createdMs: postTime.get('match')! + 4 * HOUR, resolvedAt: at(postTime.get('match')! + 20 * HOUR) },
    { reporter: 'troll', targetType: ReportTargetType.POST, postId: postId.get('welcome'), reason: ReportReason.SPAM, status: ReportStatus.DISMISSED, createdMs: postTime.get('welcome')! + 6 * HOUR, resolvedAt: at(postTime.get('welcome')! + 26 * HOUR) },
  ];
  for (const r of reports) {
    await prisma.report.create({
      data: {
        reporterId: uid(r.reporter),
        targetType: r.targetType,
        postId: r.postId,
        commentId: r.commentId,
        messageId: r.messageId,
        userId: r.userId,
        reason: r.reason,
        details: r.details,
        status: r.status,
        resolvedById: r.status === ReportStatus.OPEN ? null : adminId,
        resolvedAt: r.resolvedAt ?? null,
        createdAt: at(r.createdMs),
      },
    });
  }

  // Summary
  const counts = {
    users: await prisma.user.count(),
    follows: await prisma.follow.count(),
    posts: await prisma.post.count({ where: { kind: PostKind.POST } }),
    'posts (reposts)': await prisma.post.count({ where: { repostOfId: { not: null } } }),
    reels: await prisma.post.count({ where: { kind: PostKind.REEL } }),
    media: await prisma.media.count(),
    likes: await prisma.like.count(),
    comments: await prisma.comment.count(),
    reel_views: await prisma.reelView.count(),
    conversations: await prisma.conversation.count(),
    conversation_members: await prisma.conversationMember.count(),
    messages: await prisma.message.count(),
    reports: await prisma.report.count(),
    'files in uploads/media': fs.readdirSync(UPLOADS_MEDIA).filter((f) => f !== 'avatars').length,
  };
  console.log('\nSeed complete. Rows per table:');
  console.table(counts);
  if (skipped > 0) console.warn(yellow(`⚠ ${skipped} timeline items skipped (no videos).`));
  console.log(`Every account's password: ${PASSWORD}`);
  console.table([
    { account: 'demo', email: 'demo@salamedia.test', role: 'USER (presenter)' },
    { account: 'admin', email: 'admin@salamedia.test', role: 'ADMIN' },
    { account: 'troll', email: 'troll@salamedia.test', role: 'USER (reported)' },
  ]);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
