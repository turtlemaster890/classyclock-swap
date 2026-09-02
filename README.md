# Classy Clock

A Pebble watchface that displays when your current class ends / your next class begins.

![Banner](https://raw.githubusercontent.com/myfreeweb/classyclock/master/graphics/banner.png)

[Available on the Rebble Store](https://apps.rebble.io/en_US/application/52fd08542ace7afe350001de)

## Hosting the settings page on GitHub Pages

The settings page is static HTML/JS, so it can be hosted on GitHub Pages.

1. Push this repo to GitHub.
2. Open GitHub → Settings → Pages.
3. Select the main branch and the repo root (or use a docs folder if preferred).
4. Copy the generated URL, for example:
   `https://your-user.github.io/classyclock/settings-app/settings.html`
5. Update the URL in `pebble-app/src/js/pebble-js-app.js`:
   `var SERVER_HOST = 'https://your-user.github.io/classyclock'`

This lets the Pebble app open the public settings page from anywhere.

Note: GitHub Pages is fine for the settings UI itself, but the timeline/backend features still need a real server endpoint.

## License

This is free and unencumbered software released into the public domain.  
For more information, please refer to the `UNLICENSE` file or [unlicense.org](http://unlicense.org).
