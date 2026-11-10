# Teja Akella portfolio recreation

A self-contained static recreation of the public portfolio at
https://takellacodes.vercel.app/, with About me and Portfolio pages based
on Vibhor Gupta’s resume. Portfolio takes the Research slot in the
main navigation. The original research and article URLs still resolve.

## Run the preview

From this directory, run `python3 serve.py` and open
http://127.0.0.1:4173/. Pass `--port 8080` to change the port.
No dependency installation or build is required.

## Project layout

- `dist/` contains the exported HTML for each page, the original production
  browser bundles and styles, the local font, favicon, and resume.
- `dist/_flight/` contains static route data for client-side navigation.
- `dist/static-navigation.js` adapts the original router to static hosting.
- `serve.py` maps extensionless page URLs to their directory indexes.

The HTML and route data are production exports. The original uncompiled
Next.js source is unavailable. Page edits need to account for both the
initial HTML and the corresponding route data. External references and
email links still point to their original destinations.

## Edit website text

Click **Edit text** on any page. Choose a field, change its text, and click
**Save text**. The home page includes separate fields for the terminal title
bar, both ASCII art blocks, the typed output, and the status bar.

The editor saves to this browser on the current site address. To move edits
between browsers or between the local and hosted previews, use **Export
edits** and **Import edits**. **Restore original** resets the selected field.
The editor changes display text. Links keep their existing destinations.
