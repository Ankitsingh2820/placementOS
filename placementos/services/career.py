import json
import re
from services.claude import get_client, MODEL

ALLOWED_TOOLS = {"code", "interview", "coach", "chat"}

ROADMAP_PROMPT = """\
You are a career-prep mentor. Build a structured interview-prep roadmap for someone targeting this role.

Target domain: {domain}
Experience level: {level}

Each step must map to ONE practice tool the app provides:
- "code": coding / SQL practice problems
- "interview": a mock interview round
- "coach": resume + skill-gap coaching against the role
- "chat": a guided Q&A / concept-learning conversation

Return ONLY valid JSON — no markdown, no explanation:
{{
  "role_profile": {{
    "title": "{domain}",
    "company": "",
    "description": "a realistic 120-200 word job description for a {level} {domain}, covering core responsibilities, required skills, and tools"
  }},
  "modules": [
    {{
      "id": "m1",
      "title": "short module name",
      "steps": [
        {{
          "id": "m1s1",
          "title": "short actionable step title",
          "description": "one sentence on what to do and why",
          "tool": "code",
          "config": {{ "focus": "topic for code steps", "prompt": "seed question for chat steps" }}
        }}
      ]
    }}
  ]
}}

Rules:
- 3 to 5 modules, each with 2 to 4 steps.
- Order modules from fundamentals to advanced to behavioral/final prep.
- Every step.tool MUST be exactly one of: code, interview, coach, chat.
- Include at least one "interview" step and at least one "coach" step.
- For "code" steps set config.focus; for "chat" steps set config.prompt; other tools may use an empty config object.
"""


def _parse_json(raw: str):
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
    return json.loads(raw.strip())


def _validate(roadmap) -> bool:
    if not isinstance(roadmap, dict):
        return False
    profile = roadmap.get("role_profile")
    if not isinstance(profile, dict) or not profile.get("description"):
        return False
    modules = roadmap.get("modules")
    if not isinstance(modules, list) or not modules:
        return False
    for m in modules:
        if not isinstance(m, dict) or not m.get("id") or not m.get("title"):
            return False
        steps = m.get("steps")
        if not isinstance(steps, list) or not steps:
            return False
        for s in steps:
            if not isinstance(s, dict) or not s.get("id") or not s.get("title"):
                return False
            if s.get("tool") not in ALLOWED_TOOLS:
                return False
    return True


async def _call(prompt: str, max_tokens: int = 2048) -> str:
    client = get_client()
    r = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=0.3,
    )
    return r.choices[0].message.content


async def generate_roadmap(domain: str, level: str) -> dict:
    prompt = ROADMAP_PROMPT.format(domain=domain[:120], level=level[:40])
    for _ in range(2):
        raw = await _call(prompt)
        try:
            roadmap = _parse_json(raw)
        except Exception:
            continue
        if _validate(roadmap):
            roadmap["domain"] = domain
            roadmap["level"] = level
            return roadmap
    raise ValueError("Could not generate a valid roadmap")
