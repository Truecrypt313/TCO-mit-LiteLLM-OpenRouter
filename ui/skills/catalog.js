export const BUILTIN_SKILLS = [
  {
    id: 'builtin-email-general',
    name: 'E-Mail',
    description: 'Schreibt professionelle E-Mails und fragt fehlende Angaben aktiv nach.',
    category: 'Kommunikation',
    icon: 'mail',
    outputMode: 'email',
    preferredTier: 'fast',
    systemPrompt:
      'You are an assistant writing emails. Ask for missing details. Output only:\nBETREFF:\nTEXT:',
    rules: [
      'Keine zusaetzliche Meta-Erklaerung ausgeben.',
      'Professioneller, klarer Ton.',
      'Namen, Daten und Fakten nicht erfinden.'
    ],
    slots: [
      {
        key: 'purpose',
        label: 'Zweck',
        required: true,
        type: 'text',
        example: 'Termin bestaetigen',
        hint: 'Was soll die E-Mail erreichen?'
      },
      {
        key: 'recipient',
        label: 'Empfaenger (Name/Firma)',
        required: true,
        type: 'text',
        example: 'Max Mustermann, ACME GmbH'
      },
      {
        key: 'tone',
        label: 'Ton',
        required: false,
        type: 'text',
        example: 'professionell',
        hint: 'Falls leer, professionell'
      },
      {
        key: 'key_points',
        label: 'Kernpunkte',
        required: false,
        type: 'multiline',
        hint: 'Stichpunkte moeglich'
      },
      {
        key: 'sender_signature',
        label: 'Signatur',
        required: false,
        type: 'text',
        example: 'Viele Gruesse, Anna Becker'
      }
    ],
    deliverSkeleton: [
      'Gib exakt dieses Format aus:',
      'BETREFF: <kurzer Betreff>',
      'TEXT:',
      '<Anrede>',
      '<1-2 Zeilen zu purpose>',
      '<Details aus key_points, nur wenn vorhanden>',
      '<Konkrete CTA>',
      '<Gruss + sender_signature>'
    ].join('\n'),
    useSlotProtocol: true,
    examples: [
      {
        user: 'Schreibe eine kurze Absage fuer einen Termin naechste Woche.',
        assistant: 'BETREFF: Terminabsage\nTEXT:\n...'
      }
    ],
    isBuiltin: true
  },
  {
    id: 'builtin-email-it-support-termin',
    name: 'E-Mail: IT Support Termin',
    description: 'Service-Desk E-Mail fuer Fernwartungstermine mit gezielten Rueckfragen.',
    category: 'IT',
    icon: 'support',
    outputMode: 'email',
    preferredTier: 'best',
    systemPrompt:
      'Du bist IT Service Desk Agent. Ziel: Fernwartungstermin abstimmen. Pruefe Empfaenger, Terminvorschlaege, Problem/Anlass, Kanal (Teams/Telefon), Zeitzone, Signatur. Wenn Infos fehlen: max 3 gezielte Fragen. Danach E-Mail ausgeben (BETREFF/TEXT).',
    rules: ['Maximal 3 Rueckfragen in einem Block.', 'Kein technischer Jargon ohne Nutzen.'],
    slots: [
      {
        key: 'recipient',
        label: 'Empfaenger (Name/Firma)',
        required: true,
        type: 'text'
      },
      {
        key: 'issue_summary',
        label: 'Issue Summary (1 Satz)',
        required: true,
        type: 'text',
        hint: 'Kurz und konkret'
      },
      {
        key: 'proposals',
        label: '2 Terminvorschlaege',
        required: true,
        type: 'list',
        example: 'Do 10:00, Fr 14:30'
      },
      {
        key: 'timezone',
        label: 'Zeitzone',
        required: true,
        type: 'text',
        example: 'Europe/Berlin'
      },
      {
        key: 'channel',
        label: 'Kanal (Teams/Telefon)',
        required: true,
        type: 'text'
      },
      {
        key: 'sender_signature',
        label: 'Signatur',
        required: true,
        type: 'text'
      },
      {
        key: 'ticket_id',
        label: 'Ticket-ID',
        required: false,
        type: 'text'
      },
      {
        key: 'device_id',
        label: 'Device-ID',
        required: false,
        type: 'text'
      },
      {
        key: 'contact_phone',
        label: 'Rueckrufnummer',
        required: false,
        type: 'text'
      }
    ],
    deliverSkeleton: [
      'Service-Desk-Perspektive. Keine Erfindungen.',
      'Ausgabe strikt:',
      'BETREFF: <kurz, sachlich>',
      'TEXT:',
      '<Anrede an recipient>',
      '<Kurze Einleitung mit issue_summary; optional ticket_id/device_id wenn vorhanden>',
      'Terminvorschlaege:',
      '- <Vorschlag 1 aus proposals>',
      '- <Vorschlag 2 aus proposals>',
      '<Hinweis auf channel, timezone, optional contact_phone>',
      '<Bitte um Bestaetigung eines Vorschlags oder Alternativtermin>',
      '<Signatur mit sender_signature>'
    ].join('\n'),
    useSlotProtocol: true,
    isBuiltin: true
  },
  {
    id: 'builtin-lead-anfrage',
    name: 'Lead Anfrage',
    description: 'Erstellt eine kurze Anfrage zum Angebot mit sauberer Anforderungsuebersicht.',
    category: 'Sales',
    icon: 'lead',
    outputMode: 'text',
    preferredTier: 'fast',
    systemPrompt:
      'Du bist ein Sales-Assistant. Ziel: aus Nutzerangaben eine professionelle Lead-Anfrage bzw. Angebotsanfrage erstellen. Frage fehlende Informationen aktiv nach.',
    rules: [
      'Frage nach: company, contact, need, budget range, timeline.',
      'Ausgabe: erst kurze Anfrage-Nachricht, danach Bullet-Liste der Anforderungen.',
      'Keine erfundenen Konditionen oder Preise.'
    ],
    slots: [
      {
        key: 'company_or_contact',
        label: 'Firma oder Kontakt',
        required: true,
        type: 'text'
      },
      {
        key: 'need',
        label: 'Bedarf',
        required: true,
        type: 'text'
      },
      {
        key: 'scope',
        label: 'Scope (kurz)',
        required: true,
        type: 'text'
      },
      {
        key: 'timeline',
        label: 'Zeithorizont',
        required: true,
        type: 'text'
      },
      {
        key: 'budget_range',
        label: 'Budgetrahmen',
        required: false,
        type: 'text',
        hint: 'Optional, aber hilfreich'
      },
      {
        key: 'preferred_contact_method',
        label: 'Bevorzugter Kontaktweg',
        required: false,
        type: 'text',
        example: 'E-Mail oder Telefon'
      }
    ],
    deliverSkeleton: [
      'Ausgabe strikt:',
      '<Kurze Anfrage, 5-8 Saetze max>',
      'Anforderungen:',
      '- Firma/Kontakt: <company_or_contact>',
      '- Bedarf: <need>',
      '- Scope: <scope>',
      '- Timeline: <timeline>',
      '- Budgetrahmen: <budget_range oder null>',
      '- Kontaktweg: <preferred_contact_method oder null>',
      'Nur Slot-Inhalte nutzen. Keine erfundenen Preise, Konditionen oder Terms.'
    ].join('\n'),
    useSlotProtocol: true,
    isBuiltin: true
  },
  {
    id: 'builtin-support-ticket',
    name: 'Support Ticket erstellen',
    description: 'Erzeugt ein strukturiertes Ticket mit Prioritaet und naechsten Schritten.',
    category: 'IT',
    icon: 'ticket',
    outputMode: 'ticket',
    preferredTier: 'fast',
    systemPrompt:
      'Du bist ein IT Support Coordinator. Sammle fehlende Informationen gezielt und formuliere daraus ein umsetzbares Support-Ticket.',
    rules: [
      'Nutze die Abschnitte: Title, Priority, Steps to reproduce, Expected, Actual, Environment, Next steps.',
      'Prioritaet nur als Low, Med oder High.',
      'Wenn kritische Infos fehlen, zuerst Rueckfragen stellen.'
    ],
    slots: [
      {
        key: 'title',
        label: 'Title',
        required: true,
        type: 'text'
      },
      {
        key: 'impact',
        label: 'Impact (wer/was betroffen)',
        required: true,
        type: 'text'
      },
      {
        key: 'environment',
        label: 'Environment',
        required: true,
        type: 'text'
      },
      {
        key: 'actual',
        label: 'Actual',
        required: true,
        type: 'multiline'
      },
      {
        key: 'expected',
        label: 'Expected',
        required: true,
        type: 'multiline'
      },
      {
        key: 'steps',
        label: 'Steps to reproduce',
        required: false,
        type: 'multiline'
      },
      {
        key: 'logs',
        label: 'Logs/Fehlercodes',
        required: false,
        type: 'multiline'
      },
      {
        key: 'urgency_hint',
        label: 'Urgency Hinweis',
        required: false,
        type: 'text'
      }
    ],
    deliverSkeleton: [
      'Title:',
      'Priority: Low|Med|High',
      'Steps to reproduce:',
      'Expected:',
      'Actual:',
      'Environment:',
      'Next steps:',
      'Leite Priority nur aus impact/actual/urgency_hint ab. Keine Erfindungen.'
    ].join('\n'),
    useSlotProtocol: true,
    isBuiltin: true
  },
  {
    id: 'builtin-zusammenfassung-executive',
    name: 'Zusammenfassung',
    description: 'Verdichtet Inhalte in eine Executive Summary mit klaren Handlungsschritten.',
    category: 'Analyse',
    icon: 'summary',
    outputMode: 'text',
    preferredTier: 'cheap',
    systemPrompt:
      'Du bist ein Executive Summary Assistant. Fasse Inhalte praezise und entscheidungsorientiert zusammen.',
    rules: ['Ausgabe: genau 5 Bullet Points und danach eine kurze Action-Item-Liste.'],
    slots: [
      {
        key: 'input_text',
        label: 'Eingabetext',
        required: true,
        type: 'multiline'
      }
    ],
    deliverSkeleton: '5 Bullet Points + kurze Action-Items.',
    useSlotProtocol: false,
    isBuiltin: true
  },
  {
    id: 'builtin-meeting-notes-actions',
    name: 'Meeting Notes -> Action Items',
    description: 'Extrahiert Entscheidungen, Aufgaben, Risiken und Verantwortlichkeiten.',
    category: 'Analyse',
    icon: 'meeting',
    outputMode: 'text',
    preferredTier: 'fast',
    systemPrompt:
      'Du bist ein Meeting-Assistant. Analysiere Notizen und liefere eine saubere Arbeitsliste.',
    rules: [
      'Ausgabe in Bloecken: Decisions, Action items (owner + due date if known), Risks.',
      'Fehlende Owner oder Due Dates transparent markieren.'
    ],
    slots: [
      {
        key: 'input_text',
        label: 'Meeting-Notizen',
        required: true,
        type: 'multiline'
      }
    ],
    deliverSkeleton: 'Decisions, Action items, Risks. Fehlende Infos transparent markieren.',
    useSlotProtocol: false,
    isBuiltin: true
  },
  {
    id: 'builtin-json-extraction',
    name: 'JSON Extraktion',
    description: 'Extrahiert Daten strikt als valides JSON ohne Zusatztext.',
    category: 'Strukturiert',
    icon: 'json',
    outputMode: 'json',
    preferredTier: 'best',
    systemPrompt:
      'Du bist ein Information-Extraction Assistant. Extrahiere strukturierte Daten aus Nutzereingaben und gib nur valides JSON aus.',
    rules: [
      'Immer nur JSON antworten, kein Markdown, kein Fliesstext.',
      'Wenn Informationen fehlen, nutze null statt zu raten.'
    ],
    slots: [
      {
        key: 'input_text',
        label: 'Input Text',
        required: true,
        type: 'multiline'
      },
      {
        key: 'schema_hint',
        label: 'Schema Hint',
        required: false,
        type: 'text',
        hint: 'z.B. Felder: name,email,status'
      }
    ],
    deliverSkeleton:
      'Return ONLY valid JSON (no markdown, no prose). Use null for unknown values. Do not invent fields or values.',
    useSlotProtocol: true,
    isBuiltin: true
  },
  {
    id: 'builtin-kundenantwort-professionell',
    name: 'Kundenantwort professionell',
    description: 'Formuliert kundenfreundliche Antworten mit klarer naechster Aktion.',
    category: 'Kommunikation',
    icon: 'reply',
    outputMode: 'text',
    preferredTier: 'fast',
    systemPrompt:
      'Du bist ein Customer Success Assistant. Schreibe klare, freundliche Antworten mit Fokus auf Problemloesung und naechstem Schritt.',
    rules: [
      'Maximal 180 Worte.',
      'Enthaelt immer eine konkrete naechste Aktion oder Frage.',
      'Keine Schuldzuweisungen, loesungsorientierter Ton.'
    ],
    slots: [
      {
        key: 'customer_message',
        label: 'Kundennachricht',
        required: true,
        type: 'multiline'
      },
      {
        key: 'desired_next_step',
        label: 'Gewuenschter naechster Schritt',
        required: false,
        type: 'text'
      },
      {
        key: 'tone',
        label: 'Ton',
        required: false,
        type: 'text',
        example: 'freundlich und loesungsorientiert'
      }
    ],
    deliverSkeleton:
      'Knappe Antwort (max 180 Worte), immer mit klarer naechster Aktion/Frage, ohne Schuldzuweisung.',
    useSlotProtocol: false,
    isBuiltin: true
  }
];

export const SKILL_OUTPUT_MODES = ['text', 'email', 'ticket', 'json'];
export const SKILL_TIERS = ['cheap', 'fast', 'best', 'auto'];

export function getBuiltinSkills() {
  return BUILTIN_SKILLS.map((skill) => ({
    ...skill,
    rules: Array.isArray(skill.rules) ? [...skill.rules] : [],
    slots: Array.isArray(skill.slots)
      ? skill.slots.map((slot) => ({
          key: String(slot?.key || ''),
          label: String(slot?.label || ''),
          required: Boolean(slot?.required),
          type: slot?.type ? String(slot.type) : '',
          example: slot?.example ? String(slot.example) : '',
          hint: slot?.hint ? String(slot.hint) : ''
        }))
      : [],
    deliverSkeleton: String(skill.deliverSkeleton || ''),
    useSlotProtocol: skill.useSlotProtocol !== false,
    examples: Array.isArray(skill.examples)
      ? skill.examples.map((example) => ({
          user: String(example.user || ''),
          assistant: String(example.assistant || '')
        }))
      : [],
    updatedAt: Date.now()
  }));
}
