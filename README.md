# HouseConstruction

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.2.21.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Progressive web app

The production build includes Angular's service worker and the web app manifest. Deploy the contents of `dist/house-construction/browser` over HTTPS to enable installation and offline loading. The development server does not register the service worker.

On iPhone or iPad, open the deployed site in Safari, tap **Share**, then **Add to Home Screen**. Launch the installed app from its Home Screen icon for standalone display.

The floating navigation uses Safari-compatible backdrop blur with an opaque fallback when blur is unavailable or reduced transparency is requested. Its position includes the Home indicator and landscape safe-area insets. After deploying UI changes, verify the installed app in portrait and landscape: the dock should stay above the Home indicator, all three tabs should remain tappable, and the final content should scroll clear of the dock.

All device PNG icons and the favicon use the artwork from `public/icons/apple-touch-icon.png`; the SVG icon uses the same design. Icon assets are precached with the app. Existing iOS Home Screen icons may require removing and re-adding the app after deployment to pick up artwork changes.

## Vercel deployment

The root `vercel.json` configures `npm ci`, the production build, and the Angular browser output directory. It also rewrites app routes to `index.html` and prevents stale app-shell and service-worker metadata from delaying PWA updates. Import the repository into Vercel and deploy; no additional build settings are needed.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
