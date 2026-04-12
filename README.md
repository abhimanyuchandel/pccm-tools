# PCCM Tools

PCCM Tools is a static website for pulmonary and critical care medicine clinical calculators and decision-support tools. The site is deployed at [pccmtools.org](https://pccmtools.org) and published from this repository through Cloudflare Pages.

## Included tools

- `/asthma/` - Asthma Management
- `/copd/` - COPD Management
- `/ohca-ecpr-calc/` - Out-of-hospital ECPR Favorable Cerebral Performance Category (CPC) Calculator
- `/PERT-Team-Support/` - PERT Team Support

## Project structure

This repository is a plain HTML/CSS/JavaScript site with route-specific folders for each calculator.

```text
.
|-- index.html
|-- style.css
|-- script.js
|-- _redirects
|-- assets/
|-- asthma/
|   |-- index.html
|   |-- styles.css
|   `-- app.js
|-- copd/
|   |-- index.html
|   |-- styles.css
|   `-- app.js
|-- ohca-ecpr-calc/
|   `-- index.html
`-- PERT-Team-Support/
    `-- index.html
```

## Local development

No build step is required.

1. Clone the repository.
2. Start any local static file server from the repository root.
3. Open the served site in a browser.

Example:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deployment

- The production site is deployed from the `main` branch.
- Cloudflare Pages uses `_redirects` to support clean routes such as `/copd` and `/asthma`.
- Google Analytics 4 is installed across the site.

## Clinical disclaimer

This platform encodes clinical practice guidelines into structured decision-support tools to promote consistency and transparency. However, these outputs are simplifications of complex clinical recommendations and may not capture all relevant patient-specific factors.

Clinical decisions must always be made in the context of individual patient circumstances, clinician expertise, and institutional protocols. Users are responsible for independently verifying results and should not rely solely on this tool for patient care decisions.

## License

This project is distributed under the terms described in [LICENSE](LICENSE).
