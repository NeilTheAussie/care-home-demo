# Care Home Demo

Phone-first web app (installable PWA) for care home operations. **Demo only: every resident, staff member and figure is made up.**

- Roles: Owner, Manager, Nurse, Carer, Cook (no logins in the demo; tabs at the bottom)
- Voice: press Speak and say what happened. Uses the browser's speech recognition (Safari on iPhone, Chrome on Android). Parsing and write-up run on the phone; the live app will use AI for the write-up.
- Saving: everything is stored on the device (localStorage). Reset from the (i) menu.
- Offline: service worker caches the app.

Run locally: `node serve.js` then open http://localhost:3401
