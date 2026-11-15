// Text and links for the Learn page and the Home "Read more at NASA" link.
//
// HONESTY RULE: every health statement here must come from the team's sourced
// "NASA facts" list (R1, R2, R3). Anything not yet sourced says "TODO: source needed".
// Never add facts, numbers or quotes that are not in the sources.
//
// Sources (checked November 2026):
//   R1  NASA Human Research Roadmap risk pages, one per body part (links below)
//   R2  NASA Human Research Roadmap: Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)
//       - the hallmark signs and "about 70% of crewmembers show one or more of these"
//       - "could lead to short-term or long-term vision alterations"
//       - headward fluid shift is hypothesised; the mechanism is not yet established
//       - risk rated "Accepted" for missions under 30 days, "Requires Mitigation" for 30 days to 1 year
//       - "the expression of SANS findings varies between individuals" (gap SANS-202)
//   R3  NASA Human Research Program: 5 Hazards of Human Spaceflight

export const TODO = 'TODO: source needed'

// Caption shown under every data insight (/result, /crew, /report).
export const INSIGHT_CAPTION = 'Pattern found in the data, not a proven cause.'

// NASA pages. Leave a value as '' until the real URL is pasted in.
export const NASA_LINKS = {
  R1_SANS: 'https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105',
  R1_CARDIOVASCULAR: 'https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=179',
  R1_SLEEP: 'https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=100',
  R1_BEHAVIORAL: 'https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=99',
  R2: 'https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105',
  R3: 'https://www.nasa.gov/hrp/hazards/',
}

// Shown in the "Sources" section at the bottom of the Learn page.
export const SOURCES = [
  {
    id: 'R1',
    label: 'NASA Human Research Roadmap: SANS risk page (the Home "Read more at NASA" link)',
    urls: ['R1_SANS'],
  },
  {
    id: 'R2',
    label: 'NASA Human Research Roadmap: Risk of Spaceflight Associated Neuro-ocular Syndrome (used for "What is SANS?" and "Why test weekly?")',
    urls: ['R2'],
  },
  { id: 'R3', label: 'NASA Human Research Program: 5 Hazards of Human Spaceflight (used for "The 5 hazards")', urls: ['R3'] },
]

export const learnSections = [
  {
    id: 'sans',
    title: 'What is SANS?',
    paragraphs: [
      'SANS stands for Spaceflight-Associated Neuro-ocular Syndrome.',
      'It is a set of changes to the eye and brain that develop during spaceflight: swelling of the optic disc, a flattening of the back of the eye, folds in the layers at the back of the eye, and a shift toward farsightedness. NASA reports that about 70% of crew members show one or more of these signs.',
      'NASA says these changes could lead to short-term or long-term changes in vision. Weightlessness shifts body fluids toward the head, which is thought to play a part, but the exact cause is not yet known.',
    ],
    link: 'R2',
  },
  {
    id: 'weekly',
    title: 'Why test weekly?',
    paragraphs: [
      'NASA rates the SANS risk as accepted for missions under 30 days, but as needing action for missions of 30 days to a year.',
      'How strongly it shows up varies from person to person, and it is not yet possible to predict who will have more severe signs.',
      // This sentence describes what the app does, not a health fact.
      'Sightline compares every weekly test with your own baseline, so a change shows up between one week and the next.',
    ],
    link: 'R2',
  },
  {
    id: 'hazards',
    title: 'The 5 hazards',
    paragraphs: ['NASA names five hazards that astronauts encounter as they journey through space.'],
    // NASA's own order. `sightline: true` marks the hazards Sightline addresses.
    items: [
      {
        name: 'Space radiation',
        text: 'Invisible to the eye, and one of the most hazardous parts of spaceflight.',
        sightline: false,
      },
      {
        name: 'Isolation and confinement',
        text: 'Small groups living in tight spaces for long periods change how people behave, so crews are chosen and trained to work as a team.',
        sightline: false,
      },
      {
        name: 'Distance from Earth',
        text: 'The farther crews travel, the harder it is to get instructions, supplies and medical care from Earth.',
        sightline: true,
      },
      {
        name: 'Gravity fields',
        text: 'The body has to adjust to each new gravity: in the spacecraft, on the Moon or Mars, and back on Earth.',
        sightline: true,
      },
      {
        name: 'Hostile and closed environments',
        text: 'Keeping a safe ecosystem inside a spacecraft is hard: temperature, pressure, light, noise and microbes all need control.',
        sightline: true,
      },
    ],
    note: 'Sightline addresses three of them: distance from Earth, gravity fields and closed environments.',
    link: 'R3',
  },
]

// True while a piece of text still needs a source.
export function needsSource(text) {
  return typeof text === 'string' && text.includes(TODO)
}
