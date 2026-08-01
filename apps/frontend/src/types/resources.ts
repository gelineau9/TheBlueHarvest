export interface ResourceSection {
  /** Stable identifier used for anchor links (#language). Template keys or custom-N. */
  key: string;
  heading: string;
  body: string;
  defaultOpen?: boolean;
}

export interface ResourceContent {
  headerImage?: { url: string; filename: string; originalName?: string } | null;
  sections?: ResourceSection[];
  /** Which template the guide was built from; governs whether its structure is fixed */
  template?: string;
}

export interface Resource {
  resource_id: number;
  resource_type_id: number;
  type_name: string;
  slug: string;
  title: string;
  summary: string | null;
  content: ResourceContent | null;
  display_order: number;
  is_published: boolean;
  created_by: number | null;
  author_username: string | null;
  created_at: string;
  updated_at: string;
}

/** resource_types.type_id for guides — seeded by migration 0014 */
export const GUIDE_TYPE_ID = 1;

interface GuideTemplate {
  id: string;
  label: string;
  description: string;
  /**
   * When true the section list is fixed: sections may not be reordered or
   * added, so every guide of this kind reads in the same canonical order.
   * Authors may still delete sections that don't apply to their subject.
   */
  fixedStructure: boolean;
  sections: { key: string; heading: string; hint: string }[];
}

/**
 * Starting points offered when creating a guide. These seed a new guide's
 * sections; authors may rename, reorder, add, or remove any of them afterwards,
 * so the template is a convenience rather than a constraint.
 */
export const GUIDE_TEMPLATES: GuideTemplate[] = [
  {
    id: 'how-to-rp',
    label: 'How to RP a Race or Culture',
    description: 'The standard eight-section format for culture guides.',
    fixedStructure: true,
    sections: [
      {
        key: 'history',
        heading: 'History',
        hint: 'A brief overview of the culture’s history, focused on the periods most relevant to RP in LOTRO: immediately before the War of the Ring, the War itself, and its aftermath. Note where details differ between periods.',
      },
      {
        key: 'locations',
        heading: 'Locations',
        hint: 'Places this culture calls home, and places its characters may travel to, with details relevant to RP. No need to cover how to reach them in-game — a separate guide covers that.',
      },
      {
        key: 'culture',
        heading: 'Culture, Personalities, and Social Structures',
        hint: 'Traditions, laws, and values; the personalities common to this people; and the structures that govern them. What do they believe, how do they behave, how do they treat one another?',
      },
      {
        key: 'professions',
        heading: 'Professions, Hobbies, and Technologies',
        hint: 'What work might these characters do, what might they do in their spare time, and what items, weapons, or machinery do they have access to?',
      },
      {
        key: 'language',
        heading: 'Language and Speech',
        hint: 'Languages spoken or understood, and distinctive features of speech. Most importantly, examples of writing dialogue — casual, formal, archaic?',
      },
      {
        key: 'appearance',
        heading: 'Appearances and Dress',
        hint: 'Distinctive physical features, clothing and garb, favoured colours or insignias — and in-game items players can wear to approximate the look.',
      },
      {
        key: 'community',
        heading: 'What the Community Has to Say',
        hint: 'Short testimonials from community members who RP this culture: the challenges, how to overcome them, and what makes it rewarding.',
      },
      {
        key: 'further-reading',
        heading: 'Further Reading',
        hint: 'Sources for readers who want more — Legendarium chapters, blog posts, videos, accessible scholarly work.',
      },
    ],
  },
  {
    id: 'blank',
    label: 'Blank Guide',
    description: 'Start with a single section and build your own structure.',
    fixedStructure: false,
    sections: [{ key: 'section-1', heading: 'Introduction', hint: '' }],
  },
];

/**
 * Resolves which template a stored guide follows. Guides saved before the
 * template id was recorded are matched by their section keys, so an existing
 * How-to-RP guide keeps its fixed structure.
 */
export function resolveTemplateId(content: ResourceContent | null | undefined): string {
  if (content?.template) return content.template;

  const keys = new Set((content?.sections ?? []).map((s) => s.key));
  const howToRp = GUIDE_TEMPLATES.find((t) => t.id === 'how-to-rp')!;
  const matches = howToRp.sections.filter((s) => keys.has(s.key)).length;

  // Most sections lining up with the template means it was built from it
  return matches >= 4 ? 'how-to-rp' : 'blank';
}
