# Screenshots: status and the prompt for the two that are left

The README images live in `public/pics/`. Nine are done. Two need redoing, and the README has a
commented-out placeholder for each so you can switch them on once the files are right.

| File | Status | Note |
| --- | --- | --- |
| `home.png` | done | |
| `onboarding.png` | done | |
| `home-personal.png` | done | |
| `search-typo.png` | done | |
| `search-vague.png` | done | |
| `title.png` | done | |
| `watch.png` | done | |
| `quiz.png` | done | |
| `mobile.png` | done | |
| **`ask-pick.png`** | **redo (urgent)** | Shows the generic fallback line "Forrest Gump looks like a great fit for your group." The picker model was rate-limited. It needs a real written reason. |
| **`you.png`** | **redo (urgent)** | The saved file is a white Next.js "404" page, not the Your taste page. |

Other things to know:
- `pics/` (top level, not `public/pics/`) holds two old WhatsApp screenshots of the previous version
  of the app. Don't use them.
- `report.json` and `run_tests.mjs` in the project root were made by an earlier Antigravity run.
  They aren't part of the app. Delete them.
- Every screenshot shows a small black "N" circle in the bottom-left. That is Next.js's dev-mode
  indicator. For a cleaner shot, run `npm run build && npx next start -p 3001` yourself and use
  `http://localhost:3001` in the prompt below.
- The "press `/` opens the search dialog" check failed in the earlier automated run. That run's
  script had crashed on an unrelated error, so it is unproven either way. It is item 3 in the prompt.

## Before you run the prompt

1. `.env.local` must contain `MODEL_SMART=gemini-3.5-flash`. The default `gemini-3.8-flash` was over
   its free quota. Restart the dev server after changing it.
2. The app must be running at `http://localhost:3000` (or change the URL in the prompt).
3. Ask PopChoice calls a paid AI model, so the prompt allows one click.

## Prompt for Antigravity (paste it as is, starting with `/browser`)

```
/browser

Use your BROWSER (the built-in browser subagent and Chrome extension) to photograph and check a web
app that is ALREADY RUNNING at http://localhost:3000 . It is called PopStream, a Netflix-style app
for free classic films.

STRICT RULES
- Do NOT run npm, node, playwright or any install, and do NOT write any script. The app is already
  running. If the page doesn't load, tell me and stop.
- Do NOT edit any source code. Do NOT create any files in the project except the two screenshots below.
- Use ONLY the browser. Take real screenshots of the visible page (the viewport), 1440 x 900.
- Ask PopChoice calls a paid AI model. Click "Ask PopChoice" or open a URL with &ask=1 AT MOST ONCE
  in total, in step 2.

SCREENSHOT 1: ask-pick
1. Open exactly this URL:
   http://localhost:3000/search?q=a%20gripping%20story%20about%20friendship%20and%20hope&ask=1
2. Wait up to 30 seconds for a card headed "PopChoice picks". It should show a poster, a title, and
   a written reason of 2-4 sentences that says WHY the film fits.
3. If the reason is only one plain line like "<Title> looks like a great fit for your group.", the AI
   was rate-limited. Do NOT retry. Take the screenshot anyway and tell me it was the fallback.
4. Take the screenshot with the "PopChoice picks" card fully visible near the top of the window.
   Save as ask-pick.png.

SCREENSHOT 2: you (needs a taste profile first, so do this in a fresh incognito window)
1. Open http://localhost:3000/ . Scroll to "Pick a few films you love". Click 4 posters (each gets a
   green tick), then click "Show my picks". Wait for the page to refresh.
2. Open exactly http://localhost:3000/you  (spelled y-o-u, no trailing characters).
3. It must show the heading "Your taste", a "Films you like" grid with 4 posters and a Remove link
   under each, and a "How this works" box with a "Clear my history" button. If you see a white page
   saying "404", tell me the exact URL you typed and stop.
4. Take the screenshot. Save as you.png.
   Do NOT click "Clear my history".

QUICK CHECKS (report PASS or FAIL with one line each; no screenshot)
1. On http://localhost:3000/ click on an empty part of the page, then press the "/" key. A search
   dialog should open. Press Escape. It should close.
2. In the search box on the home page type "zimm" and wait 1 second. A list should show
   "Hans Zimmer". Press ArrowDown then Enter. It should open a page titled "Hans Zimmer".
3. Open http://localhost:3000/search?q=90s%20comedy%20under%202%20hours . There should be chips
   "1990s", "Under 2 hours" and "Comedy". Click the x on "Comedy". The chip disappears.

SAVING
Your screenshots are saved as artifacts. Copy ONLY these two into
  /Users/lakshaykalra/Desktop/ai engineering path /pop choice ( 4 )/public/pics/
as ask-pick.png and you.png (this overwrites the current bad files). The folder path has spaces and a
space before "/pop choice". Use a plain file copy or your file tools. If you can't write there,
leave them as artifacts and give me each full path.

REPORT
Tell me: the two saved file paths, PASS/FAIL for the three checks, and whether the ask-pick reason
was a real explanation or the one-line fallback.
```

## After the images are right

Tell Claude, or do it yourself: in `README.md`, uncomment the two `<!-- TODO -->` image lines
(`ask-pick.png` and `you.png`), then commit the two PNGs.
