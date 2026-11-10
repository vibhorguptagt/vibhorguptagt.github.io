# Vibhor Gupta portfolio

A static portfolio with a terminal-style home page, an About Me page,
a semiconductor blog, a project portfolio, and a hosted one-page resume.

## Run the preview

From this directory, run `python3 serve.py` and open
http://127.0.0.1:4173/. Pass `--port 8080` to change the port.
No dependency installation or build is required.

## Host the site

Publish the contents of `dist/` at the web root. Configure your host to
serve each directory’s `index.html` when its route is requested.

- `dist/` contains the static pages, browser bundles, styles, assets, and resume.
- `dist/_flight/` contains route data for client-side navigation.
- `dist/static-navigation.js` adapts the router to static hosting.
- `serve.py` maps extensionless page URLs to their directory indexes.

When updating page content in source, update both the initial HTML and
its corresponding route data.

## Edit website text

Click the green terminal dot on Home, or press **Alt + Shift + E**
(**Option + Shift + E** on Mac) on another page. Enter the editor passcode,
choose a field, and click **Save text**.

Edits save in the current browser. Use **Export edits** and **Import edits**
to move them to another browser or site address. **Restore original** resets
the selected field. The browser-side passcode controls the editor interface.
