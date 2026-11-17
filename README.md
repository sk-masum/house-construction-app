# HouseConstruction

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.2.21.

The interface uses IBM Plex Sans, loaded from Google Fonts, including form controls, drawers, and dashboard charts.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Menu managers

The header menu provides project import/export and managers for materials, builders, and contractors.
Its animated, typography-led sidebar uses a transparent, blurred green background, large manager links, and a divided import/export footer. It supports reduced-motion and reduced-transparency preferences and uses an opaque fallback when backdrop blur is unavailable.
Builders store a default delivery charge; contractors store a default rate per square foot. Each row has **Edit** and **Delete** actions. Editing lets you change the name and default amount; **Save Changes** applies the edit, and **Cancel** discards it. Deletion requires confirmation and leaves historical purchases, projects, and payments intact.

These lists persist in the configured database. Existing builder names and contractors are added once during database initialization without overwriting saved defaults. Deleted entries are not recreated on restart. Contractor defaults are initially taken from their latest square-foot project when available, otherwise zero.

Selecting a builder fills the delivery charge on a material purchase. Selecting a contractor fills the service rate only for **Sq Ft** projects. The transaction receiver dropdown separates **Builders** and **Contractors** into groups and refreshes when the form opens. A name belonging to both lists appears in both groups; saved receiver values remain names. Historical names no longer in either directory appear under **Previous Receivers**. Changing defaults does not rewrite existing purchases or projects.

Renaming updates the matching purchase/project/contractor-bill names and ledger receiver/provider names in one transaction, without changing historical amounts. Duplicate names and renames that would merge existing histories are rejected. Names shared between builder and contractor histories cannot be renamed because the ledger cannot distinguish those identities; their default amounts remain editable.

## Local data storage

Materials and ledger entries are stored locally in SQLite. OPFS is used when available; the current main-thread implementation uses SQLite's persistent `localStorage` backend otherwise. It does not fall back to temporary memory storage.

Data survives page refreshes on the same origin (scheme, hostname, and port). Clearing site data removes the database; private browsing and browser storage quotas can restrict persistence. Use the dashboard CSV exports for backups. Data already lost from the previous temporary-memory backend cannot be recovered by this change.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Progressive web app

The production build includes Angular's service worker and the web app manifest. Deploy the contents of `dist/house-construction/browser` over HTTPS to enable installation and offline loading. The development server does not register the service worker.

On iPhone or iPad, open the deployed site in Safari, tap **Share**, then **Add to Home Screen**. Launch the installed app from its Home Screen icon for standalone display.

The floating navigation uses Safari-compatible backdrop blur with an opaque fallback when blur is unavailable or reduced transparency is requested. Its position includes the Home indicator and landscape safe-area insets. After deploying UI changes, verify the installed app in portrait and landscape: the dock should stay above the Home indicator, all three tabs should remain tappable, and the final content should scroll clear of the dock.

Safe-area variables are defined globally in `src/styles.scss` so routed pages and overlay drawers share the same insets. Full-screen History drawers protect all four edges; bottom drawers omit the top inset. Keep safe-area padding on these shared containers rather than adding it to individual buttons or pages.

All device PNG icons and the favicon use the artwork from `public/icons/apple-touch-icon.png`; the SVG icon uses the same design. Icon assets are precached with the app. Existing iOS Home Screen icons may require removing and re-adding the app after deployment to pick up artwork changes.

## Vercel deployment

The root `vercel.json` configures `npm ci`, the production build, and the Angular browser output directory. It also rewrites app routes to `index.html` and prevents stale app-shell and service-worker metadata from delaying PWA updates. Import the repository into Vercel and deploy; no additional build settings are needed.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
