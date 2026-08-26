# Portfolio cleanup pass

## Changes

**Header**
- Replace the `psstmatt` wordmark with `Matt Reynolds`.
- Remove the Sound toggle control entirely; sound is always on.

**Sound**
- Sound defaults to on for every visitor, with no toggle and no saved preference. Hover, click, and reveal tones play as before.

**Home page**
- Remove the "A few numbers" section (the animated metric list at the bottom). Hover-revealed metrics on the work list stay.

**Contact / footer**
- Email becomes `mr@hey.com`.
- TikTok handle becomes `psttmatt`.
- Remove the "psstmatt.com — Matt Reynolds" line at the bottom of the footer.

**Remove domain name from the site**
- Drop the `psstmatt.com` line at the end of the About page and remove the domain value from the content file so it isn't rendered anywhere.
- LinkedIn and calendar links keep their current placeholder URLs unless you send replacements.

**About — what I want next**
- New item #1: "Robots and human-machine interfaces".
- Remove "Founding or early design".

## Technical notes

- `src/lib/sound.tsx`: force `enabled` to true, drop the localStorage read/write and the `toggle` API; keep the AudioContext resume-on-interaction behavior so browsers allow playback.
- `src/components/chrome.tsx`: remove the sound button and its `useSound` usage, update wordmark text, delete the domain line.
- `src/content/site.ts`: update the contact array, remove `domain`, reorder/edit `lookingFor`.
- `src/routes/index.tsx`: delete the numbers section (and the `CountUp` import if unused).
- `src/routes/about.tsx`: delete the domain paragraph.
