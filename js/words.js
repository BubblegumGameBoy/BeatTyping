// ─── Word-mode vocabulary ──────────────────────────────────────────────────────
//
// Word-input mode: instead of one note per highlighted key, the player types
// real words. Each romaji letter = one keystroke = one melody note. Typing
// "neko" (ねこ) fires four notes in a row — so fast/dense passages become a
// fluent typing run rather than single-key hunting.
//
// romaji uses plain a–z only (each char maps to a letter key).

const WORD_LIST = [
  // 動物
  { kana: "ねこ",   romaji: "neko" },
  { kana: "いぬ",   romaji: "inu" },
  { kana: "うさぎ", romaji: "usagi" },
  { kana: "きつね", romaji: "kitsune" },
  { kana: "くま",   romaji: "kuma" },
  { kana: "ぞう",   romaji: "zou" },
  { kana: "ぱんだ", romaji: "panda" },
  { kana: "りす",   romaji: "risu" },
  { kana: "かえる", romaji: "kaeru" },
  { kana: "へび",   romaji: "hebi" },
  { kana: "とんぼ", romaji: "tonbo" },
  { kana: "せみ",   romaji: "semi" },
  { kana: "ほたる", romaji: "hotaru" },
  { kana: "かもめ", romaji: "kamome" },
  { kana: "いるか", romaji: "iruka" },
  { kana: "くじら", romaji: "kujira" },
  { kana: "たこ",   romaji: "tako" },
  { kana: "かに",   romaji: "kani" },
  { kana: "えび",   romaji: "ebi" },
  { kana: "とり",   romaji: "tori" },
  // 自然
  { kana: "はな",   romaji: "hana" },
  { kana: "さくら", romaji: "sakura" },
  { kana: "もみじ", romaji: "momiji" },
  { kana: "たけ",   romaji: "take" },
  { kana: "きのこ", romaji: "kinoko" },
  { kana: "うみ",   romaji: "umi" },
  { kana: "やま",   romaji: "yama" },
  { kana: "かわ",   romaji: "kawa" },
  { kana: "そら",   romaji: "sora" },
  { kana: "ほし",   romaji: "hoshi" },
  { kana: "つき",   romaji: "tsuki" },
  { kana: "たいよう", romaji: "taiyou" },
  { kana: "にじ",   romaji: "niji" },
  { kana: "あめ",   romaji: "ame" },
  { kana: "ゆき",   romaji: "yuki" },
  { kana: "かぜ",   romaji: "kaze" },
  { kana: "くも",   romaji: "kumo" },
  { kana: "みずうみ", romaji: "mizuumi" },
  // 食べもの
  { kana: "すいか", romaji: "suika" },
  { kana: "りんご", romaji: "ringo" },
  { kana: "ぶどう", romaji: "budou" },
  { kana: "みかん", romaji: "mikan" },
  { kana: "いちご", romaji: "ichigo" },
  { kana: "もも",   romaji: "momo" },
  { kana: "めろん", romaji: "meron" },
  { kana: "たまご", romaji: "tamago" },
  { kana: "おにぎり", romaji: "onigiri" },
  { kana: "すし",   romaji: "sushi" },
  { kana: "みそ",   romaji: "miso" },
];

// Build a word stream long enough to cover `noteCount` notes.
// Returns:
//   units     : [{ kana, romaji, startNote, len }]  — display units
//   noteChars : [char, …]  one lowercase letter per note (length >= noteCount)
function buildWordStream(noteCount) {
  const units = [];
  let total = 0;
  let last = -1;
  while (total < noteCount) {
    let i = Math.floor(Math.random() * WORD_LIST.length);
    if (i === last && WORD_LIST.length > 1) i = (i + 1) % WORD_LIST.length;
    last = i;
    const w = WORD_LIST[i];
    units.push({ kana: w.kana, romaji: w.romaji, startNote: total, len: w.romaji.length });
    total += w.romaji.length;
  }
  const noteChars = [];
  for (const u of units) {
    for (let i = 0; i < u.len; i++) noteChars.push(u.romaji[i]);
  }
  return { units, noteChars };
}
