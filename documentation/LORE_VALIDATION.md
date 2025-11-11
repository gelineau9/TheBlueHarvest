# Lore Validation & Canon Compliance - The Blue Harvest

## Overview

The Blue Harvest is a Middle-earth themed RP platform. To maintain immersion and respect for Tolkien's legendarium, we need systems to prevent lore violations and protect canonical character names.

---

## 1. Protected Names System

### 1.1 Canonical Character Names

**Problem**: Users should not be able to create profiles named "Gandalf", "Aragorn", "Frodo", etc.

**Solution**: Maintain a protected names list that prevents character creation with canonical names.

### Database Schema

```sql
-- Protected names table
CREATE TABLE protected_names (
    protected_name_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    name_normalized VARCHAR(100) NOT NULL, -- lowercase, no special chars
    category VARCHAR(50) NOT NULL, -- 'character', 'place', 'object', 'race'
    era VARCHAR(50), -- 'first_age', 'second_age', 'third_age', 'fourth_age'
    source VARCHAR(100), -- 'silmarillion', 'lotr', 'hobbit', etc.
    description TEXT,
    alternative_suggestions JSONB, -- suggest "Gandalf the White" → "Mithrandir's Apprentice"
    is_strict BOOLEAN DEFAULT TRUE, -- if false, allow with approval
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_protected_names_normalized ON protected_names(name_normalized);
CREATE INDEX idx_protected_names_category ON protected_names(category);

-- Variation table (handles different spellings/variations)
CREATE TABLE protected_name_variations (
    variation_id SERIAL PRIMARY KEY,
    protected_name_id INT REFERENCES protected_names(protected_name_id) ON DELETE CASCADE,
    variation VARCHAR(100) NOT NULL,
    variation_normalized VARCHAR(100) NOT NULL
);

CREATE INDEX idx_variations_normalized ON protected_name_variations(variation_normalized);
```

### Protected Names Categories

#### 1. Major Characters (Strict Protection)
- **Fellowship**: Frodo, Sam, Merry, Pippin, Gandalf, Aragorn, Legolas, Gimli, Boromir
- **Key Figures**: Bilbo, Gollum, Saruman, Sauron, Galadriel, Elrond, Théoden, Éowyn, Faramir
- **Villains**: Morgoth, Sauron, Saruman, Witch-king, Shelob, Smaug
- **Silmarillion**: Fëanor, Fingolfin, Lúthien, Beren, Túrin, Morgoth, Manwë, Varda

#### 2. Places (Moderate Protection)
- **Realms**: Gondor, Rohan, Mordor, Eriador, Númenor
- **Cities**: Minas Tirith, Edoras, Rivendell, Lothlórien, The Shire
- **Locations**: Mount Doom, Helm's Deep, Isengard, Barad-dûr

**Strategy**: Allow as kinship/organization names but not character names

#### 3. Races & Peoples (Educational Warnings)
- Elves, Dwarves, Hobbits, Men, Orcs, Ents, Eagles, Wizards (Istari)

**Strategy**: Allow but provide lore context

#### 4. Artifacts (Strict Protection)
- One Ring, Andúril, Sting, Glamdring, Narsil, Phial of Galadriel, Silmarils, Palantíri

**Strategy**: Allow as item profile type with canonical description locked

---

## 2. Name Validation Logic

### 2.1 Validation Flow

```typescript
// services/lore/LoreValidationService.ts

export class LoreValidationService {
  constructor(
    private protectedNamesRepo: ProtectedNamesRepository
  ) {}

  async validateProfileName(
    name: string,
    profileType: 'character' | 'item' | 'kinship' | 'organization'
  ): Promise<ValidationResult> {

    const normalized = this.normalizeName(name);

    // Check against protected names
    const protectedName = await this.protectedNamesRepo.findByNormalizedName(
      normalized
    );

    if (!protectedName) {
      return { valid: true };
    }

    // Check if strict protection
    if (protectedName.is_strict) {
      // Strict: No exceptions for characters
      if (profileType === 'character') {
        return {
          valid: false,
          error: 'PROTECTED_NAME',
          message: `"${name}" is a canonical character from Tolkien's legendarium and cannot be used.`,
          suggestions: protectedName.alternative_suggestions || [],
          loreInfo: {
            source: protectedName.source,
            description: protectedName.description,
            era: protectedName.era
          }
        };
      }

      // For items: Allow with canonical description
      if (profileType === 'item' && protectedName.category === 'object') {
        return {
          valid: true,
          warning: true,
          message: `This is a canonical artifact. Its description will be pre-filled with lore.`,
          canonicalData: await this.getCanonicalItemData(protectedName)
        };
      }

      // For places: Allow as kinship/org names
      if (
        (profileType === 'kinship' || profileType === 'organization') &&
        protectedName.category === 'place'
      ) {
        return {
          valid: true,
          warning: true,
          message: `"${name}" is a canonical location. Consider naming your ${profileType} after it (e.g., "The Fellowship of ${name}").`
        };
      }
    }

    // Non-strict: Allow with approval or warning
    return {
      valid: true,
      requiresApproval: true,
      message: `"${name}" is related to Tolkien's lore. Please provide context for using this name.`,
      loreInfo: {
        source: protectedName.source,
        description: protectedName.description
      }
    };
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .normalize('NFD') // Decompose accented characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9\s]/g, '') // Remove special chars
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  async checkForLoreViolations(profileData: ProfileData): Promise<LoreViolation[]> {
    const violations: LoreViolation[] = [];

    // Check character race/species validity
    if (profileData.type === 'character') {
      const raceViolation = await this.validateRace(profileData.details?.race);
      if (raceViolation) violations.push(raceViolation);

      // Check for impossible combinations
      const combinationViolation = await this.validateRaceCombination(profileData);
      if (combinationViolation) violations.push(combinationViolation);

      // Check timeline consistency
      const timelineViolation = await this.validateTimeline(profileData);
      if (timelineViolation) violations.push(timelineViolation);
    }

    return violations;
  }

  private async validateRace(race?: string): Promise<LoreViolation | null> {
    if (!race) return null;

    const validRaces = [
      'Hobbit', 'Human', 'Elf', 'Dwarf', 'Ent', 'Orc', 'Uruk-hai',
      'Maiar', 'Valar', 'Eagle', 'Warg', 'Balrog', 'Dragon'
    ];

    const normalizedRace = race.trim();

    if (!validRaces.includes(normalizedRace)) {
      return {
        severity: 'warning',
        field: 'race',
        message: `"${race}" is not a recognized race in Middle-earth.`,
        suggestion: `Did you mean one of: ${validRaces.join(', ')}?`
      };
    }

    return null;
  }

  private async validateRaceCombination(data: ProfileData): Promise<LoreViolation | null> {
    // Example: Half-elven is rare and requires special justification
    const race = data.details?.race?.toLowerCase();

    if (race?.includes('half') || race?.includes('mixed')) {
      return {
        severity: 'info',
        field: 'race',
        message: 'Mixed heritage is extremely rare in Middle-earth (e.g., Elrond, Elros, Eärendil).',
        suggestion: 'Please provide detailed backstory justifying this heritage.'
      };
    }

    // Balrogs, Dragons, Maiar should be restricted
    const restrictedRaces = ['Balrog', 'Dragon', 'Maiar', 'Valar'];
    if (data.details?.race && restrictedRaces.includes(data.details.race)) {
      return {
        severity: 'error',
        field: 'race',
        message: `${data.details.race} characters are extremely powerful beings and generally restricted.`,
        suggestion: 'Consider creating a character of a mortal race, or request admin approval.'
      };
    }

    return null;
  }

  private async validateTimeline(data: ProfileData): Promise<LoreViolation | null> {
    const birthYear = data.details?.birth_year;
    const era = data.details?.era;

    // If character claims to be from First Age but timeline is Third Age, flag it
    if (era === 'First Age' && birthYear) {
      const firstAgeEnd = -590; // Years of the Sun
      const thirdAgeEnd = 3021;

      if (birthYear > firstAgeEnd) {
        return {
          severity: 'warning',
          field: 'era',
          message: 'Timeline inconsistency detected.',
          suggestion: `First Age ended in year ${firstAgeEnd}. If your character is from the First Age, they would be over ${thirdAgeEnd - birthYear} years old by the Third Age.`
        };
      }
    }

    return null;
  }
}
```

---

## 3. Protected Names Seed Data

### Seed File Structure

```typescript
// db/seeds/production/protected_names.ts

export const protectedCharacterNames = [
  // Fellowship
  {
    name: 'Frodo Baggins',
    category: 'character',
    era: 'third_age',
    source: 'The Lord of the Rings',
    description: 'Ring-bearer, hobbit of the Shire who carried the One Ring to Mount Doom',
    alternative_suggestions: ['Drogo Baggins', 'Falco Chubb-Baggins', 'Fosco Baggins'],
    is_strict: true
  },
  {
    name: 'Gandalf',
    category: 'character',
    era: 'third_age',
    source: 'The Lord of the Rings, The Hobbit',
    description: 'Gandalf the Grey/White, Mithrandir, one of the Istari (wizards)',
    alternative_suggestions: ['Mithrandir\'s Student', 'Grey Pilgrim', 'Wandering Wizard'],
    is_strict: true,
    variations: ['Gandalf the Grey', 'Gandalf the White', 'Mithrandir', 'Olórin']
  },
  {
    name: 'Aragorn',
    category: 'character',
    era: 'third_age',
    source: 'The Lord of the Rings',
    description: 'Aragorn II, son of Arathorn, King Elessar, Ranger of the North',
    alternative_suggestions: ['Strider', 'Ranger of Eriador', 'Dúnedain Ranger'],
    is_strict: true,
    variations: ['Aragorn II', 'Elessar', 'Strider', 'Telcontar']
  },
  // ... (continue for all major characters)

  // Silmarillion characters
  {
    name: 'Fëanor',
    category: 'character',
    era: 'first_age',
    source: 'The Silmarillion',
    description: 'Greatest of the Noldor, creator of the Silmarils',
    is_strict: true,
    variations: ['Feanor', 'Curufinwë']
  },

  // Places
  {
    name: 'Rivendell',
    category: 'place',
    era: 'all',
    source: 'The Lord of the Rings',
    description: 'Imladris, the Last Homely House, refuge founded by Elrond',
    is_strict: false, // Can be used for kinship names
    alternative_suggestions: ['House of Rivendell', 'Elves of Imladris']
  },

  // Artifacts
  {
    name: 'One Ring',
    category: 'object',
    era: 'second_age',
    source: 'The Lord of the Rings',
    description: 'The Ruling Ring forged by Sauron in Mount Doom',
    is_strict: true,
    variations: ['The One Ring', 'Ring of Power', 'Isildur\'s Bane']
  },
];
```

---

## 4. User Stories for Lore Validation

### US-LORE-1: Protected Name Prevention

**As a** user
**I want to** be prevented from using canonical character names
**So that** the community maintains lore consistency

**Acceptance Criteria**:

**Given** I am creating a character profile
**When** I enter the name "Gandalf"
**Then** I see an error message: "Gandalf is a canonical character from Tolkien's legendarium and cannot be used."
**And** I see suggestions: "Mithrandir's Student, Grey Pilgrim, Wandering Wizard"

**Given** I am creating a character profile
**When** I enter the name "Gandalf the Wanderer" (variation)
**Then** the system detects it as a protected name variation and shows the same error

**Given** I am creating an item profile
**When** I enter the name "Andúril"
**Then** the system allows it but pre-fills the canonical description
**And** shows a message: "This is a canonical artifact. Its description has been pre-filled with lore."

---

### US-LORE-2: Lore Warnings

**As a** user
**I want to** receive warnings for potential lore violations
**So that** I can create lore-appropriate characters

**Acceptance Criteria**:

**Given** I am creating a character
**When** I set the race to "Half-Elf"
**Then** I see an info message: "Mixed heritage is extremely rare in Middle-earth (e.g., Elrond, Elros). Please provide detailed backstory."

**Given** I am creating a character
**When** I set the race to "Balrog"
**Then** I see an error: "Balrog characters are extremely powerful beings and generally restricted. Consider a mortal race or request admin approval."

**Given** I am creating a character from the First Age
**When** I set a birth year after the First Age ended
**Then** I see a warning: "Timeline inconsistency detected. First Age ended in year -590..."

---

### US-LORE-3: Admin Override

**As an** admin
**I want to** override lore restrictions
**So that** I can create canonical characters for events

**Acceptance Criteria**:

**Given** I am an admin
**When** I create a profile with a protected name
**Then** I see a checkbox "Admin Override - This is for an official event"

**Given** I enable admin override
**When** I create the profile
**Then** it's marked as "official" and displays differently

---

### US-LORE-4: Community Lore Contributions

**As a** user
**I want to** suggest additions to the protected names list
**So that** the community collaboratively maintains lore

**Acceptance Criteria**:

**Given** I notice a canonical name is not protected
**When** I navigate to "Suggest Protected Name"
**Then** I can submit the name with source and description

**Given** a suggestion is submitted
**When** admins review it
**Then** they can approve, reject, or request more information

---

## 5. Lore Validation Rules

### 5.1 Character Creation Rules

#### Race-Specific Rules

```typescript
export const raceRules = {
  Hobbit: {
    averageHeight: { min: 60, max: 120, unit: 'cm' },
    averageLifespan: { min: 90, max: 130, unit: 'years' },
    commonNames: {
      male: ['Bilbo', 'Frodo', 'Sam', 'Merry', 'Pippin', 'Drogo', 'Odo'],
      female: ['Rosie', 'Lobelia', 'Primula', 'Belladonna', 'Eglantine']
    },
    physicalTraits: [
      'Curly hair',
      'Large feet with thick soles',
      'No need for shoes',
      'Generally plump and cheerful'
    ],
    warnings: [
      'Hobbits rarely adventure outside the Shire',
      'They are peaceful and avoid conflict'
    ]
  },

  Elf: {
    averageHeight: { min: 180, max: 210, unit: 'cm' },
    averageLifespan: { value: 'immortal', unit: 'eternal unless killed' },
    subraces: ['Noldor', 'Sindar', 'Silvan', 'Teleri', 'Vanyar'],
    physicalTraits: [
      'Fair and beautiful',
      'Keen eyesight',
      'Light-footed',
      'Ages very slowly'
    ],
    warnings: [
      'Elves are immortal and bound to Middle-earth',
      'They can die from grief or violence',
      'Very few elves are born after the First Age'
    ],
    nameConventions: {
      pattern: 'Typically Sindarin or Quenya',
      examples: ['Legolas', 'Arwen', 'Galadriel', 'Elrond']
    }
  },

  Dwarf: {
    averageHeight: { min: 120, max: 150, unit: 'cm' },
    averageLifespan: { min: 250, max: 350, unit: 'years' },
    physicalTraits: [
      'Stocky and strong',
      'Long beards (males)',
      'Excellent craftsmen',
      'Resistant to magic'
    ],
    warnings: [
      'Female dwarves are rarely seen outside their halls',
      'Dwarves are secretive about their true names'
    ],
    nameConventions: {
      pattern: 'Old Norse inspired',
      examples: ['Thorin', 'Gimli', 'Balin', 'Dwalin'],
      note: 'Public names are often different from true names'
    }
  },

  Human: {
    averageHeight: { min: 160, max: 190, unit: 'cm' },
    averageLifespan: { min: 60, max: 90, unit: 'years' },
    subraces: ['Númenórean', 'Rohirrim', 'Gondorian', 'Haradrim', 'Easterling'],
    warnings: [
      'Númenóreans lived longer (200+ years) but that bloodline is diluted',
      'Most Men of the Third Age live normal lifespans'
    ]
  },

  // Restricted races
  Maiar: {
    restricted: true,
    requiresApproval: true,
    examples: ['Gandalf', 'Saruman', 'Sauron', 'Balrogs'],
    warning: 'Maiar are divine spirits. Creating such a character requires admin approval and strong lore justification.'
  }
};
```

### 5.2 Timeline Validation

```typescript
export const timelineRules = {
  eras: {
    'Years of the Trees': { start: -5000, end: -590 },
    'First Age': { start: -590, end: 0 },
    'Second Age': { start: 1, end: 3441 },
    'Third Age': { start: 3442, end: 3021 },
    'Fourth Age': { start: 3022, end: null }
  },

  majorEvents: {
    'Fall of Gondolin': { year: -510, era: 'First Age' },
    'War of Wrath': { year: -587, era: 'First Age' },
    'Downfall of Númenor': { year: 3319, era: 'Second Age' },
    'Last Alliance': { year: 3441, era: 'Second Age' },
    'Battle of Five Armies': { year: 2941, era: 'Third Age' },
    'War of the Ring': { year: 3018, era: 'Third Age' }
  },

  validate: (birthYear: number, currentEra: string) => {
    const era = timelineRules.eras[currentEra];
    if (birthYear < era.start) {
      return {
        valid: false,
        message: `Birth year ${birthYear} is before the ${currentEra} (starts ${era.start})`
      };
    }
    return { valid: true };
  }
};
```

---

## 6. Implementation Priority

### Phase 1: Essential Protection (Week 1)
1. Create `protected_names` table
2. Seed major characters (Fellowship, main villains)
3. Implement basic name validation in profile creation
4. Show error messages with suggestions

### Phase 2: Validation Rules (Week 2)
1. Add race validation
2. Add timeline validation
3. Implement warning system (non-blocking)
4. Add lore info tooltips

### Phase 3: Enhanced Features (Week 3-4)
1. Admin override system
2. Community suggestions for protected names
3. Canonical item descriptions
4. Protected name variations

### Phase 4: Advanced Lore (Future)
1. Relationship validation (e.g., can't be Aragorn's father)
2. Geography validation (characters from specific regions)
3. Language/name generator based on race
4. Lore wiki integration

---

## 7. API Endpoints

```typescript
// POST /api/lore/validate-name
// Validate a profile name before creation
interface ValidateNameRequest {
  name: string;
  profileType: 'character' | 'item' | 'kinship' | 'organization';
}

interface ValidateNameResponse {
  valid: boolean;
  error?: string;
  message?: string;
  suggestions?: string[];
  loreInfo?: {
    source: string;
    description: string;
    era?: string;
  };
  canonicalData?: object; // For items
}

// GET /api/lore/protected-names
// Get list of protected names (for reference)
interface ProtectedNamesResponse {
  names: {
    category: string;
    names: string[];
  }[];
  total: number;
}

// GET /api/lore/race-info/:race
// Get lore information about a race
interface RaceInfoResponse {
  race: string;
  description: string;
  physicalTraits: string[];
  averageLifespan: object;
  warnings: string[];
  nameExamples: string[];
}

// POST /api/lore/suggest-protected-name (authenticated)
// User suggests a name to be protected
interface SuggestProtectedNameRequest {
  name: string;
  category: string;
  source: string;
  description: string;
  justification: string;
}
```

---

## 8. User Interface Components

### 8.1 Name Validation Feedback

```tsx
// ProfileNameInput component
<div className="form-field">
  <label htmlFor="name">Character Name</label>
  <input
    id="name"
    value={name}
    onChange={(e) => validateName(e.target.value)}
    className={validationResult?.valid === false ? 'error' : ''}
  />

  {validationResult && !validationResult.valid && (
    <div className="validation-error">
      <AlertCircle className="icon" />
      <div>
        <p className="error-message">{validationResult.message}</p>

        {validationResult.suggestions && (
          <div className="suggestions">
            <p>Try these alternatives:</p>
            <ul>
              {validationResult.suggestions.map(s => (
                <li key={s}>
                  <button onClick={() => setName(s)}>{s}</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {validationResult.loreInfo && (
          <details className="lore-info">
            <summary>Learn about {name}</summary>
            <p><strong>Source:</strong> {validationResult.loreInfo.source}</p>
            <p>{validationResult.loreInfo.description}</p>
          </details>
        )}
      </div>
    </div>
  )}
</div>
```

### 8.2 Race Selection with Lore Info

```tsx
<div className="race-selector">
  <label>Race</label>
  <select value={race} onChange={(e) => setRace(e.target.value)}>
    <option value="">Select race...</option>
    {races.map(r => (
      <option key={r.name} value={r.name}>
        {r.name} {r.restricted && '⚠️'}
      </option>
    ))}
  </select>

  {selectedRaceInfo && (
    <div className="race-info-card">
      <h4>{selectedRaceInfo.name}</h4>
      <p>{selectedRaceInfo.description}</p>

      <div className="traits">
        <strong>Physical Traits:</strong>
        <ul>
          {selectedRaceInfo.physicalTraits.map(t => <li key={t}>{t}</li>)}
        </ul>
      </div>

      {selectedRaceInfo.warnings && (
        <div className="warnings">
          {selectedRaceInfo.warnings.map(w => (
            <p key={w}><Info className="icon" /> {w}</p>
          ))}
        </div>
      )}
    </div>
  )}
</div>
```

---

## 9. Additional User Stories

### US-LORE-5: Name Generator

**As a** user
**I want to** use a lore-appropriate name generator
**So that** I can create authentic-sounding character names

**Acceptance Criteria**:

**Given** I am creating a character
**When** I click "Generate Name"
**Then** I see a name appropriate for the selected race

**Given** I select "Elf" as race
**When** I generate a name
**Then** I get a Sindarin or Quenya-style name (e.g., "Celeborn", "Araniel")

**Given** I generate multiple names
**When** I don't like one
**Then** I can click "Generate Again" for a new suggestion

---

### US-LORE-6: Lore Wiki Integration

**As a** user
**I want to** access lore information while creating my character
**So that** I understand the setting better

**Acceptance Criteria**:

**Given** I am creating a character
**When** I hover over "First Age"
**Then** I see a tooltip with basic information and a link to full lore

**Given** I am on the character creation page
**When** I click "Lore Guide"
**Then** a sidebar opens with relevant lore articles

---

### US-LORE-7: Character Plausibility Check

**As a** user
**I want to** receive feedback on character plausibility
**So that** my character fits the setting

**Acceptance Criteria**:

**Given** I create a hobbit character
**When** I set their height to 190cm
**Then** I see a warning: "This is unusually tall for a hobbit (average: 60-120cm)"

**Given** I create an elf character
**When** I set their birth year to Third Age 3000
**Then** I see info: "Very few elves are born in the Third Age. Most are thousands of years old."

---

## 10. Configuration & Customization

### Admin Settings

Admins should be able to configure lore validation strictness:

```typescript
interface LoreValidationSettings {
  enableNameProtection: boolean; // On/off
  protectionLevel: 'strict' | 'moderate' | 'lenient';

  strict: {
    // No canonical names allowed, ever
    blockAllProtectedNames: true,
    requireJustificationForRareRaces: true,
    enforceTimelineRules: true
  },

  moderate: {
    // Warnings but allow with explanation
    blockAllProtectedNames: false,
    warnOnProtectedNames: true,
    requireJustificationForRareRaces: true,
    enforceTimelineRules: false
  },

  lenient: {
    // Just informational messages
    blockAllProtectedNames: false,
    warnOnProtectedNames: false,
    showLoreInfo: true,
    enforceTimelineRules: false
  }
}
```

---

## Summary

This lore validation system:

✅ **Protects canonical names** from being used inappropriately
✅ **Educates users** about Middle-earth lore
✅ **Provides helpful suggestions** for alternatives
✅ **Validates** races, timelines, and character plausibility
✅ **Maintains immersion** while allowing creative freedom
✅ **Scalable** - can add more protected names over time
✅ **Flexible** - admin controls for strictness levels

The system strikes a balance between **lore accuracy** and **user creativity**, ensuring The Blue Harvest remains true to Tolkien's vision while fostering an active RP community.
