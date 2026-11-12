# CatGPT

<https://catgpt-openpaw.github.io/>

CatGPT is a static Jekyll experiment in feline interface design and deadpan conversation. A cat can walk across the keyboard, producing nonsense input that CatGPT interprets as a plausible cat-specific question before returning a curated response.

The public site is intentionally static. It does not send prompts to a generative AI model. Topics, inferred questions, responses and short multi-turn conversation flows are stored as structured site data and selected in the browser.

## Structure

```text
.
├── .github/
│   └── workflows/
│       └── jekyll.yml
├── _config.yml
├── _data/
│   ├── flows.yml
│   └── topics.yml
├── _includes/
│   └── icon-sprite.html
├── _layouts/
│   └── catgpt.html
├── assets/
│   ├── css/
│   │   └── catgpt.css
│   ├── images/
│   │   └── catgpt.svg
│   └── js/
│       └── catgpt.js
├── about.html
├── index.html
├── legal.html
├── Gemfile
├── Gemfile.lock
├── jek.sh
├── kill_serve.sh
└── robots.txt
```

`_data/topics.yml` contains the specific conversation premises, keyboard mash strings, inferred questions and initial responses.

`_data/flows.yml` contains reusable continuation and closing turns keyed by humour style. The browser keeps a topic active for a short conversation before selecting a new weighted topic.

`assets/js/catgpt.js` owns the interaction state, keyboard-mash detection, topic selection, conversation progression and streamed text presentation.

## Local development

```bash
bundle install
./jek.sh
```

The site opens at `http://127.0.0.1:4000/`. `./kill_serve.sh` stops the local server started by `jek.sh`.

Generated Jekyll output in `_site/` and local log files are excluded from version control.

## Deployment

The site is deployed to GitHub Pages using the workflow in `.github/workflows/jekyll.yml`.

Production URL:

<https://catgpt-openpaw.github.io/>

Source:

<https://github.com/catgpt-openpaw/catgpt-openpaw.github.io>

## About

CatGPT was created by Dylan Lawless, a scientist and software developer working across computational biology, statistical genomics and AI systems.

Professional work and publications:

<https://lawless.ch/>

CatGPT is an independent informal project and is not affiliated with, endorsed by or operated by OpenAI.

## Legal and privacy

Site information, privacy details and terms are published at:

<https://catgpt-openpaw.github.io/legal/>
