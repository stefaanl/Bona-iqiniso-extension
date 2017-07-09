# Chrome Extension for Bona Iqiniso

## How to install on developer mode

Extensions can be loaded in unpacked mode by following the following steps:

1. Visit **chrome://extensions** (via omnibox or menu -> Tools -> Extensions).
2. Enable Developer mode by ticking the checkbox in the upper-right corner.
3. Click on the "Load unpacked extension..." button.
4. Select the directory **chrome/bona-iqiniso**

### Note
When the extension is in development mode the extension id (chrome-extension://kbaajpllcilfmalghmpedngkelndnmmb) can change. To avoid CORS issues, add the extension id as an allowed origin in backend conf file.
Ex.
> play.filters.cors.allowedOrigins = [... "chrome-extension://kbaajpllcilfmalghmpedngkelndnmmb" ...]
