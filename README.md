# BeatTyping (Typing Piano)

キーボードのキーを押すと名曲を演奏できる、ブラウザベースのリズム／タイピングゲーム。
タイルが降ってきたら光ったキーを押す → ピアノ音が鳴り、コンボを繋ぐとオーケストラが
レイヤーで重なっていく。

## 起動

ビルド不要。静的ファイルだけなので、ローカルサーバで開くだけ。

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

`index.html` を直接開いてもよいが、Tone.js のサンプル読み込みのため http(s) 経由を推奨。

## 構成

| ファイル | 役割 |
|---|---|
| `index.html` | 画面構造（タイトル / プレイ / 完了 / ホームポジション overlay） |
| `css/style.css` | スタイル |
| `js/songs.js` | **曲データ**（音符・伴奏・ヒント）。`SONGS` 配列 |
| `js/audio.js` | Tone.js ラッパ。ピアノ(Salamander) + オーケストラ(violin/cello/french-horn)。Tone.Transport の steady backing clock |
| `js/effects.js` | Canvas 2D の演出（落下タイル・鍵盤・指の色分け） |
| `js/game.js` | ゲームロジック（キー割り当て・コンボ・レイヤー判定）。**wait-mode**: 既定で `autoAdvance=false`、正しいキーが押されるまで現在の音符は待機（速度プレッシャー無し・自動miss無し）。`true` で旧テンポ駆動の自動前進に戻せる |
| `js/main.js` | 画面遷移・曲選択・overlay 制御 |

## 曲データ形式 (`js/songs.js`)

```js
{
  id: "turkish_march",
  title: "トルコ行進曲",
  composer: "W.A. モーツァルト",
  level: 2,
  bpm: 60,
  tutorial: true,          // 任意。true なら maxLayer=0（ピアノのみ）＋ホームポジ説明
  events: [
    // notes:   メロディー（押すと鳴る音）。和音は配列で複数
    // accomp:  伴奏の和音（backing clock が拾う。tutorial では鳴らない）
    // hint:    任意。チュートリアルのガイド文
    {notes:["B4"], accomp:["A2"], hint:"..."},
    ...
  ],
}
```

- キー割り当ては `game.js` が **出現頻度順に自動**で行う（よく出る音 → ホームポジション F J D K S L…）。
  なのでヒントでは文字キー名ではなく「光ったキーを表示の指で押す」と指の習慣を教える。
- レイヤー: combo≥8 で +cello+drums、≥20 で +violin、≥36 で +french horn。
  tutorial 曲は `maxLayer=0` で純ピアノ。

## 楽曲の音程を「正しく」直すワークフロー — 公式 MIDI から起こす

> ⚠️ 重要: `songs.js` の音符は**耳コピ／記憶で書くと微妙な音程ズレが入る**。
> 信頼できる出典（パブリックドメインの MIDI）から機械的に起こすこと。

### 1. ネットワークポリシーを Full にする（前提）

Claude Code on the web の環境はデフォルト **Trusted**（許可リストのみ）で、
mutopia / kunstderfuge / IMSLP などの楽譜サイトはブロックされている。

- 雲アイコン → 対象環境を **編集** → **Network access** セレクタ
- **Full**（任意ドメイン可）を選択 → **新しいセッションで反映**
  - 全開放が不安なら **Custom** で必要ホストだけ許可:
    ```
    *.mutopiaproject.org
    *.kunstderfuge.com
    imslp.org
    *.imslp.org
    ```

参考: https://code.claude.com/docs/en/claude-code-on-the-web#network-access

### 2. MIDI を取得してパース

パブリックドメイン MIDI ソース例:
- Mutopia Project（LilyPond 典拠の検証済み楽譜＋MIDI）
- Kunst der Fuge
- IMSLP

```bash
curl -sSL -o piece.mid "<MIDI URL>"
```

MIDI ライブラリ（mido / music21 / @tonejs/midi）は未インストールだが、
SMF はシンプルなバイナリ形式なので最小パーサを自作可能（標準ライブラリのみ）。
パースしたノートイベントから:
1. 右手（メロディー）トラックを判定 → `notes`
2. 左手の和音 → `accomp`
3. `songs.js` の該当曲を 1:1 で置換

これで耳コピを介さず音程ズレが原理的に消える。

### 既知のメモ（トルコ行進曲 / Rondo alla Turca K.331 3rd mov.）

- 構造: **A（イ短調）→ B エピソード（ハ長調）→ A → C（イ長調の有名な強奏）→ …**
- 「running scales」エピソードは **ハ長調で正しい**（A メジャーではない）。
  過去に誤って A メジャーへ直して revert した経緯あり → 必ず MIDI 典拠で確認すること。
- **現状**: `songs.js` の `turkish_march` は Mutopia の検証済み MIDI から再構築済み
  （メロディー＝右手トラックの最上声部を 1:1 抽出、装飾音は等間隔ステップ化を避けるため除外）。
  出典: `https://www.mutopiaproject.org/ftp/MozartWA/KV331/KV331_3_RondoAllaTurca/KV331_3_RondoAllaTurca.mid`
  収録範囲: A 主題 → B エピソード → A 再現＋カデンツ → **C（イ長調の有名な行進、新規追加）** → イ長調主和音で終止。

### 既知のメモ（大きな古時計 / tutorial_clock）

- `songs.js` の `tutorial_clock` も MIDI から再構築済み。出典は **ト長調**の SMF
  （`https://www.mfiles.co.uk/downloads/my-grandfathers-clock.mid`）を **ハ長調へ −7 半音移調**。
  チュートリアルの主要音をホームポジション(F J D K S L)に載せるためハ長調を維持している。
- 両手が 1 トラックに混在しているため「鳴っている最高音（スカイライン）」でメロディーを抽出
  （単純な onset 最高音とも全 115 音で一致を確認済み）。
- 冒頭は `G3 C4 B3 C4 D4 C4 D4 E4 F4 E4 A3 …`（ソド・ティド…）。旧データにあった
  E4 重複と A4（オクターブ違い）を修正済み。サビは振り子的に E3 まで下降するが典拠どおり正しい。

## 開発ブランチ

各セッションの作業ブランチ（`claude/...`）で開発し、`main` へマージ。
