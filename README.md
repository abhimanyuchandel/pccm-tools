# PCCM Tools

PCCM Tools is a static website for pulmonary and critical care medicine clinical calculators and decision-support tools. The site is deployed at [pccmtools.org](https://pccmtools.org) and published from this repository through Cloudflare Pages.

## Included tools

- `/asthma/` - Asthma Management
- `/copd/` - COPD Management
- `/ohca-ecpr-calc/` - Out-of-hospital ECPR Favorable Cerebral Performance Category (CPC) Calculator
- `/PERT-Team-Support/` - PERT Team Support
- `/ODDS/` - ODDS Score for Prognosis in IPF (also reached through `/odds`)
- `/ODDS/evidence/` - Expanded longitudinal ODDS project report

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

### ODDS Publication Discovery

The ODDS calculator and longitudinal evidence report are public, allow search indexing, and appear in `sitemap.xml`. The home page links to the calculator under Interstitial Lung Disease. The calculator links to the report through its About section. `robots.txt` advertises the sitemap; indexing and search-result timing remain controlled by search engines.

The separate `/odds_joint_model.html` technical summary and its PDF remain accessible by direct link but retain `noindex` instructions. Model objects and patient-level source files are not part of the public website; existing model-file 404 protections and prediction-service routing are unchanged.

The calculator and evidence page cite the published manuscript at [doi:10.1093/ajrccm/aamag552](https://doi.org/10.1093/ajrccm/aamag552). The expanded report is not the journal version of record. Verify the HTML/PDF publication bundle with `scripts/verify_evidence_publication.py` and use `scripts/odds-publication.test.cjs` for browser smoke checks against a local server or `ODDS_SITE_TEST_URL`.

### General Use

This platform encodes clinical practice guidelines into structured decision-support tools to promote consistency and transparency. However, these outputs are simplifications of complex clinical recommendations and may not capture all relevant patient-specific factors.

Clinical decisions must always be made in the context of individual patient circumstances, clinician expertise, and institutional protocols. Users are responsible for independently verifying results and should not rely solely on this tool for patient care decisions.

## License

This project is distributed under the terms described in [LICENSE](LICENSE).
