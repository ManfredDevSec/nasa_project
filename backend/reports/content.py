"""Static text for the body map info cards (docs/03 R1, used by T9).

Rules (docs/08_NASA_RESOURCES.md, "RULES FOR THE AI"):
- `space_effect` uses ONLY facts written in docs/08, each with a `# Source:` comment.
  It is phrased as NASA's own wording or a close summary; nothing is added.
- `function` is plain, general anatomy (not a NASA claim).
- `what_to_do` is SightLine's own guidance (app behaviour), not a NASA recommendation.
- `read_more_url` is the NASA page for that risk (docs/08 R1 "Detail links").

T9 builds each body-map part as: level + summary (computed) + `info` (from here) + `action`.
"""

BODY_PARTS = ("EYES", "HEART", "SLEEP", "MIND")

# Frontend routes for the card's action button. "/test" is in FRONTEND_GUIDE §3.2;
# the guide doesn't name the vitals form route yet, so "/vitals" needs confirming
# with the frontend.
ROUTE_EYE_TEST = "/test"
ROUTE_VITALS_FORM = "/vitals"

PART_CONTENT = {
    "EYES": {
        "info": {
            "function": "Your eyes focus light so you can see near and far.",
            # Source: NASA HRP, SANS risk page (docs/08 R2): fluids "move toward the head";
            # findings include optic nerve swelling and folds in the retina.
            "space_effect": (
                "In weightlessness, body fluids such as blood and cerebrospinal fluid move toward the head. "
                "This can cause swelling of the optic nerve and folds in the retina. NASA calls this "
                "Spaceflight Associated Neuro-ocular Syndrome (SANS)."
            ),
            "what_to_do": "Do the weekly eye test. Report blur or headaches early.",
        },
        "action": {"label": "Start eye test", "route": ROUTE_EYE_TEST},
        "no_data_summary": "No eye test yet. Take your first test.",
        # Source: docs/08 R1 detail links
        "read_more_url": "https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/",
    },
    "HEART": {
        "info": {
            "function": "Your heart pumps blood through your body; blood pressure shows how hard it pushes.",
            # Source: NASA HRP, Risks of Human Spaceflight (docs/08 R1): Cardiovascular Adaptations.
            "space_effect": "Weightlessness changes how blood circulates and how the heart and blood vessels work.",
            "what_to_do": "Log your resting heart rate and blood pressure each day.",
        },
        "action": {"label": "Log today's vitals", "route": ROUTE_VITALS_FORM},
        "no_data_summary": "No heart rate or blood pressure logged yet.",
        # Source: docs/08 R1 detail links
        "read_more_url": "https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/",
    },
    "SLEEP": {
        "info": {
            "function": "Sleep lets your body and brain recover.",
            # Source: NASA HRP, Risks of Human Spaceflight (docs/08 R1):
            # Inadequate Sleep and Irregular Schedules.
            "space_effect": (
                "In space, crews can face chronic sleep loss, a constant workload and disrupted body clocks."
            ),
            "what_to_do": "Protect your sleep window and log your hours of sleep each day.",
        },
        "action": {"label": "Log today's vitals", "route": ROUTE_VITALS_FORM},
        "no_data_summary": "No sleep logged yet.",
        # Source: docs/08 R1 detail links
        "read_more_url": "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/",
    },
    "MIND": {
        "info": {
            "function": "Your mood and focus affect how you feel and how well you work.",
            # Source: NASA HRP, Risks of Human Spaceflight (docs/08 R1): Behavioral Changes and
            # Psychiatric Disorders; 5 Hazards (docs/08 R3): Isolation and Confinement, Distance from Earth.
            "space_effect": (
                "Isolation, radiation and the distance from Earth may affect mental health on long missions."
            ),
            "what_to_do": (
                "Log your mood each day. If it's low, talk to the Medical Officer or schedule a private call home."
            ),
        },
        "action": {"label": "Log today's vitals", "route": ROUTE_VITALS_FORM},
        "no_data_summary": "No mood logged yet.",
        # Source: docs/08 R1 detail links
        "read_more_url": "https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/",
    },
}


def part_content(part):
    """Static content for one body part (KeyError for unknown parts)."""
    return PART_CONTENT[part]
