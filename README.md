# Mattsoft

Matt Reynolds's text-first portfolio, with a secret room full of computers.

[Live portfolio](https://psstmatt.com/) · [Computer prototype](https://matt-konami-computers.psstmatt.chatgpt.site/) · [Development](#development)

## Find the computers

The homepage starts with the original green Portfolio computer. Click or tap its screen to enter, or use Tab and Enter. **Skip intro** opens the portfolio directly.

To unlock the other computers, enter the Konami code while the entrance is open:

- **Keyboard:** ↑ ↑ ↓ ↓ ← → ← → B A
- **Phone or tablet:** swipe ↑ ↑ ↓ ↓ ← → ← → on the computer. The touch sequence is eight directional swipes, with no B or A.

Once unlocked, use the previous/next buttons, left/right arrow keys, or horizontal swipes to choose a machine. Click or tap its screen to enter its site.

## Meet the machines

This release ports the reviewed v60 factory into the production application. The four computers were already present in [baseline 18c588b](https://github.com/psstmatt/mattsoft/commit/18c588b5c22fc8546e40675528d522d2eccc78a4); this update adds the shared lighting, multi-angle views, and factory navigation described below. The public deployment is [psstmatt.com](https://psstmatt.com/).

| Computer            | Look                                   | Destination                                                 | Entry and factory lighting                                                                         |
| ------------------- | -------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Portfolio**       | Original green desktop                 | [psstmatt.com](https://psstmatt.com/)                       | The camera enters the CRT and reveals the portfolio. Green factory lighting.                       |
| **Scout**           | Orange inflatable vinyl                | [scout.psstmatt.com](https://scout.psstmatt.com/)           | The case inflates before the camera passes through the screen. Warm orange factory lighting.       |
| **References**      | Puffy stickers and chrome foil         | [references.psstmatt.com](https://references.psstmatt.com/) | The case tilts as stickers orbit around the opening page. Soft silver factory lighting.            |
| **Anduril / Sonar** | Upright navy case with sculpted ridges | [anduril.psstmatt.com](https://anduril.psstmatt.com/)       | A quiet approach through the curved screen into Descent. Blue factory lighting and Echo lettering. |

### The case art

|                                                         Scout                                                         |                                                                    References                                                                    |                                                         Anduril / Sonar                                                          |
| :-------------------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------------------------: |
| ![Orange Scout computer with inflated vinyl seams and a valve](public/experience/models/scout-inflatable-v1/case.png) | ![References computer covered in colorful puffy stickers and chrome foil](public/experience/models/references-chrome-baked/frames/case-1-9.webp) | ![Upright navy Sonar computer with concentric case ridges and a silver knob](public/experience/models/anduril-sonar-v2/case.png) |

These are the original approved case assets, shown without the runtime page previews and effects. They are artwork, not screenshots of a working screen. Image sources and capture notes are in [the image guide](docs/computers/README.md).

### Motion, screens, and sound

- Portfolio keeps its original green material and screen-entry transition. The rainbow remains visible for four seconds after entry, then fades.
- Scout and References use their approved “Absurd” entry animations. Sonar uses its own curved screen mesh for both the idle preview and entry, keeping the page fitted to the CRT aperture.
- External computers show captured previews of their destinations. A short 280 ms departure leads directly to the actual site. The transition does not enlarge and hold a screenshot while pretending the page is live; the destination paints normally as it loads. Green Portfolio retains its local live-page transition.
- Captions use the machine names without number eyebrows. The navigation still shows the position count.
- The shared spotlights follow the selected machine. Pointer movement inside the case changes its angle; moving outside lets it return to center. Keyboard focus belongs to the active machine and clears during pointer selection and entry. Reduced motion uses static focus cues and immediate entry. Forced-colors mode keeps a visible caption focus cue.
- Escape during any computer's entry cancels the transition and restores that computer. Escape from the expanded factory, or **Exit factory**, collapses the room to the green computer; the secret code reopens the room. There is no public **Show computers** button. Escape from the single green entrance skips to Portfolio.
- After entering Portfolio, Escape returns to the factory, including after navigating to About, Catalog, or a case study. Local controls, visible overlays, and fullscreen content get first use of Escape. Direct visits to content pages keep normal navigation.
- The earned unlock and selection survive within the tab for up to six hours. A URL never grants an unlock. Browser Back from an external site restores the factory. Factory-launched visits to live Scout, References, and Anduril have a cooperative Escape return. It restores the originating machine and earned unlock using a 30-minute, tab-session-bound visit. Direct visits stay unarmed; inputs, dialogs, inspectors, fullscreen and pointer lock get first use of Escape. Browser Back remains the mobile alternative. If storage or referrer information is blocked, or sign-in redirects discard the visit, use browser Back.

Sound is on by default, using the original retro cues. A silent AudioContext is prepared before screen-on; the boot chime plays only if the browser allows it then. A blocked boot chime is never replayed late. Konami input and activation gestures resume one shared audio context, drop stale feedback, and recover after interruptions. Browser autoplay rules and device volume still apply.

## Factory screenshots

The following images are from the [public prototype workbench](https://matt-konami-computers.psstmatt.chatgpt.site/) used to review the factory. They show the approved appearance, rather than screenshots of the production deployment.

|                                                                               Portfolio                                                                                |                                                                                  Scout                                                                                  |
| :--------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|      ![Actual green Portfolio computer selected in the dark v59 prototype, with green factory lighting](docs/computers/factory-v59-portfolio-return-desktop.jpg)       |              ![Orange Scout computer selected in the dark v59 prototype, with warm factory lighting](docs/computers/factory-v59-scout-return-desktop.jpg)               |
|                                                                             **References**                                                                             |                                                                           **Anduril / Sonar**                                                                           |
| ![Sticker-covered References computer selected in the dark v59 prototype, with soft silver factory lighting](docs/computers/factory-v59-references-return-desktop.jpg) | ![Navy Sonar computer selected in the dark v59 prototype, showing the Descent preview and blue factory lighting](docs/computers/factory-v59-anduril-return-desktop.jpg) |

Actual desktop screenshots of **public prototype v59**, captured October 11, 2026 (UTC), after returning to each machine with Escape. The factory lights and **Exit factory** shown here are included in this release. The green Portfolio color comes from the running renderer. [View the narrow light-theme capture and image details](docs/computers/README.md#prototype-screenshots).

### Multi-angle computers

References uses all 57 original case views. Scout and Sonar each have **19 yaw angles × 3 pitch angles**, with a matched case image, glass image, and screen registration for every pose. The runtime loads the center first and nearby views on demand, with two frame loads at a time and a normal six-frame cache.

References smoothly returns to its center pose before the original sticker entry animation. Scout and Sonar keep their case, glass, and screen fitted together as the view changes.

The new Scout and Sonar views use calibrated **2.5D relief projected from the approved artwork**, over a narrow range around the original pose. Lighting remains baked into the source image. Unseen rear geometry, physical materials, and changing reflections have not been reconstructed. The v59 screenshots above predate this angle work, which was reviewed in v60.

### Prototype boundaries

Earlier prototype versions used local destination captures to test return behavior. The current review and production applications navigate to the real destination sites. Idle CRT previews remain captures; Scout's contains only its public header and no private account or project data.

Review controls, type selectors, replay controls, labs, and query unlocks are excluded from production. The five Easter eggs below are planned separately. Their implementation is not part of this navigation release.

The reviewed v60 prototype had 297 passing automated tests plus cloud-browser Canvas checks of pointer-driven views and Escape cancellation. The production port has its own automated checks. Physical-device Safari and WebGL-specific behavior remain unverified.

## Easter eggs on the drawing board

The Konami unlock is already real. These five extra ideas are **planned**, with no implementation claimed in the production or prototype versions documented here.

| Idea                         | Intended interaction                                                  |
| ---------------------------- | --------------------------------------------------------------------- |
| **Sonar ping**               | Turn or click the Sonar knob for a ping, with a creature to discover. |
| **Let the air out**          | Use Scout's orange valve for a squeak and a deflate gag.              |
| **Secret under the sticker** | Rub the holographic sticker to uncover a secret.                      |
| **LAN party**                | Leave the computers idle and discover them having a little LAN party. |
| **HOTDOG technician**        | Type `HOTDOG` to summon a technician.                                 |

## Development

The project uses Bun and its committed lockfile.

```bash
bun install --frozen-lockfile
bun run dev
```

Available checks:

```bash
bun test tests
bun run typecheck
bun run lint
bun run build
bun run check
```

`bun run check` runs typecheck, lint, and build. Run `bun test tests` separately for the entrance, input, renderer, motion, sound, and telemetry tests.

The entrance lives in `src/components/portfolio-experience.tsx` and `src/components/secret-computer-deck.tsx`. Input matching is in `src/lib/konami-input.ts`; the browser renderers, screen geometry, transitions, and case assets are under `public/experience/`.

## Production safety

- Only the seven canonical HTML routes on `https://psstmatt.com` are indexable.
- Preview and generated `vercel.app` hosts, unknown routes, and server errors remain `noindex, nofollow`.
- Canonical links, Open Graph URLs, `robots.txt`, and `sitemap.xml` resolve to the apex domain.
- Vercel Web Analytics and Speed Insights are present, but their `beforeSend` guards allow telemetry only when the page URL is on the exact `psstmatt.com` host.
- Legacy hash URLs from the previous portfolio resolve to the closest surviving case study or catalog entry.

A Vercel Production artifact can be staged without assigning a domain. Production deployment, moving `psstmatt.com`, changing aliases, and changing DNS require an explicit release decision. Publishing the separate computer prototype does not ship those changes to the portfolio.

## Source provenance

- Original Lovable project: `b791c73d-1837-469e-b9f9-67d654d497b7`
- Private source backup: `psstmatt/motion-whisper-portfolio`
- Imported source commit: `50de093c6d9a3935225a7de0672c0618d905e095`
- Import method: the tracked tree at that commit was copied without its Git history.
- Visual baseline: [motion-whisper-portfolio.lovable.app](https://motion-whisper-portfolio.lovable.app)

The first commit is the untouched source snapshot. Later commits add independent development and Vercel deployment support, the computer entrance, the secret deck, and subsequent portfolio refinements. This public repository is separate from the project connected to Lovable.
