# Character Guide

How to make your own desk-pet character and share it. **No programming required.**

> Other languages: [繁體中文](CHARACTER_GUIDE.md) | [日本語](CHARACTER_GUIDE.ja.md)

---

## 1. Three ways to make one

Open Settings → **Characters** tab → **Character Studio**.

| Way | Good for | You need | Result |
|---|---|---|---|
| **1. From pictures** | You can draw, or already have character art | One or more transparent PNGs | Bounce, wobble, squash and emoji effects are added for you |
| **2. Pixel sprite sheet** | Pixel art, drawing every pose yourself | A pixel-art editor | Plays exactly the frames you drew; most detailed |
| **3. Import** | Someone shared a character with you | A character folder | Works right away |

Your characters live in `%APPDATA%\tw.deskpet.kankan\skins\`. Use **Open characters folder** to get there.

---

## 2. Way 1: from pictures (easiest)

1. Prepare a picture of your character:
   - **PNG with a transparent background**; otherwise a box appears around it
   - **Facing left**; it is flipped automatically when walking right
   - **200-600 px tall**
   - Little empty margin, with the feet touching the bottom edge
2. Settings → Characters → Character Studio → **Way 1**
3. Enter a name and choose the **Idle \*** picture (required)
4. Other poses are **optional**
5. Chat personality and bio are optional
6. Press **Create character**; it switches to your character automatically

| Pose | Effect added automatically |
|---|---|
| Idle, Sitting | Gentle breathing |
| Walk | Hop and sway |
| Sleep | Slight squash + 💤 |
| Dangled | Swinging + 💦 |
| Happy | Jump + ✨ |
| Thinking | Head tilt + 💭 |
| Head pat | Squish + 💕 |
| Snack | Small bounces + 🍪 |

Pictures with a different expression per pose (closed eyes for sleep, and so on) make it even cuter.

- Pixel-art pictures: set `"pixelated": true` in `manifest.json` for crisp scaling
- Size: `"height"` in `manifest.json` (default 128), or Settings → General → Size

---

## 3. Way 2: draw a pixel sprite sheet

1. Settings → Characters → Character Studio → **Way 2** → **Create pixel template & open folder**
2. The folder contains:
   - `sprite.png`: **draw on this one** (keep the background transparent)
   - `guide.png`: a reference grid; each row has a tint, and the dark line is the ground
   - `manifest.json`: settings
   - `lines/zh-TW.json`: example custom lines
3. Draw with [Aseprite](https://www.aseprite.org/), [LibreSprite](https://libresprite.github.io/) or [Piskel](https://www.piskelapp.com/) (in the browser), then save
4. In desk-pet press **Rescan** and pick your character

```
       frame 0  frame 1  frame 2  frame 3
row 0  idle     idle     idle     idle     ← idle
row 1  walk     walk     walk     walk     ← walk
row 2  sleep    sleep                      ← sleep
row 3  drag     drag                       ← dangled
row 4  react    react    react    react    ← happy
row 5  think    think    think    think    ← thinking
row 6  pet      pet                        ← head pat
row 7  eat      eat                        ← snack
row 8  sit      sit                        ← sitting on a window
```

- Cells are **32×32**, shown at 4× scale
- For more detail at 64×64, change three things:
  1. Double the image size
  2. Set `frameWidth` and `frameHeight` to 64
  3. Set `scale` to 2
- **Face left**, with the feet on the guide's ground line
- Keep the character aligned between frames, or it will jitter. Onion skinning helps
- `frames` sets how many frames a pose has, and `fps` sets its speed. Delete a pose's row entry to use its fallback instead

The three built-in characters are drawn by code and make good references: `scripts/gen-default-skin.mjs`, `scripts/gen-kanade-skin.mjs` and `scripts/gen-shiori-skin.mjs` (64×64).

---

## 4. Poses

| Name | When | Falls back to |
|---|---|---|
| `idle` | Normally (**required**) | ─ |
| `walk` | Walking around | idle |
| `sleep` | You've been away a while | idle |
| `drag` | Dangled by the mouse, falling off a window | idle |
| `react` | Clicked, to-do finished | idle |
| `think` | Waiting for Claude's reply | idle |
| `pet` | Head pat | react |
| `eat` | Snack | react |
| `sit` | Sitting on top of a window | idle |

---

## 5. manifest.json fields

| Field | Meaning |
|---|---|
| `name` | Name (required) |
| `names` | Name per language: `zh-TW` / `ja` / `en` |
| `bio` | Bio per language (shown in Settings → About) |
| `persona` | Chat personality per language |
| `mode` | `"image"` for picture mode; leave it out for sprite mode |
| `image` / `frameWidth` / `frameHeight` / `scale` / `animations` | Sprite mode |
| `images` / `height` / `pixelated` | Picture mode (`images` needs at least `idle`) |

Supported images are PNG, JPG, WebP and GIF (GIF shows its first frame only). File names must point to files in the same folder. The folder name is the character id and may only use letters, digits, `-` and `_`.

---

## 6. Custom lines

Create `lines/en.json` inside the character folder:

```json
{
  "greeting": ["Hi! Let's have a good day."],
  "click": ["Hm? Did you call me?"],
  "todo_done": ["You did it!"]
}
```

- Only the categories you write replace the shared lines
- No comma after the last item
- Press Settings → Lines → **Reload** after editing

Categories: `greeting` (+`_morning`/`_afternoon`/`_evening`), `idle`, `busy`, `away_return`, `late_night`, `todo_done`, `todo_all_done`, `click`, `drag`, `drop`, `pet`, `feed`, `feed_full`, `love_up`, `pomodoro_start`, `pomodoro_break`, `pomodoro_break_end`, `reminder`.

---

## 7. Chat personality (persona)

With an Anthropic API key you can chat with your character. `persona` is the character brief given to Claude:

1. **Who**: name, look, what they are
2. **Personality**: 3-5 adjectives plus concrete habits
3. **How to talk**: which language, short replies (1-3 sentences), no Markdown, any catchphrases

```
You are "Kit", a little orange fox who lives on the user's desktop and loves sweets.
Personality: gentle, a bit shy; curls up its tail when nervous.
Rules: always reply in English; short replies (1-3 sentences); soft tone; no Markdown.
```

Don't make a character impersonate real people, brands or official mascots.

---

## 8. Sharing and importing

- **Share**: right-click your character folder → **Compress to ZIP file**, and send the zip
- **Import**: unzip it first, then use Character Studio → **Way 3** and pick the folder that contains `manifest.json`
- **Want it built into desk-pet?** Open a Pull Request on GitHub. The steps are in section 8 of the [Traditional Chinese guide](CHARACTER_GUIDE.md#8-分享給別人匯入別人的角色)

---

## 9. FAQ

- **A box around the character**: the background isn't transparent
- **Blurry**: set `pixelated: true` for pixel art, or use a larger picture (300 px or taller)
- **Jittery**: align frames, especially the feet
- **Doesn't show up**: check that the folder name uses only letters and digits, that `manifest.json` exists, and that the JSON is valid (check it at <https://jsonlint.com/>)

---

## 10. Copyright

- Only use art you have the right to use: your own drawings, things you generated yourself, or licensed work
- Characters based on existing anime, games or brand mascots are **for personal use only; please don't share them**
- desk-pet's code and built-in characters (Kankan, Kanade, Shiori) are [MIT licensed](../LICENSE)
