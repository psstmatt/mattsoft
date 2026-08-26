# Remove independent work, enforce reverse-chronological order

## What changes

1. **Drop all independent work**
   - Remove the PetLoop case study (and its `/work/petloop` page falls away automatically).
   - Remove the "Independent" catalog group: PetLoop, Electronic Mail, Interaction experiments.
   - Update the catalog page's SEO title/description text so it no longer mentions independent products.

2. **Reverse-chronological everywhere (newest first)**
   - Selected work on the home page becomes: Symphony (2024—26), Consent Platform (2022—24), Uber Reserve (2019—22), Boeing Deliveries (2010—16). Today Boeing sits before Uber; that gets fixed.
   - Catalog groups stay TikTok → Meta → Uber → Expedia → Boeing, and items inside each group are re-sorted newest first (e.g. Uber leads with Fleet Match 2022, Boeing leads with Aircraft deliveries 2013—16).

3. **Case-page next links** continue to follow the new order automatically.

## Technical notes

All edits are in `src/content/site.ts` (reorder `cases`, delete the PetLoop entry, reorder/prune `catalog`) plus meta copy in `src/routes/catalog.tsx`. No component or routing changes needed.
