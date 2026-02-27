import { MODEL_CATALOG } from './models/catalog.js';
import { getBuiltinSkills, SKILL_OUTPUT_MODES, SKILL_TIERS } from './skills/catalog.js';

const SKILL_STORAGE_KEY = 'openlunaris.skills.v1';
const ACTIVE_SKILL_STORAGE_KEY = 'openlunaris.activeSkillId.v1';
const THEME_STORAGE_KEY = 'openlunaris.theme.v1';
const WEBHOOK_STORAGE_KEY = 'openlunaris.webhook_url';
const MODEL_SELECTION_STORAGE_KEY = 'openlunaris.selectedModelByTier.v1';
const SLOT_CONTEXT_STORAGE_KEY = 'openlunaris.slotContextBySkillId.v1';

const LEGACY_TEMPLATE_STORAGE_KEYS = ['openlunaris.templates.store', 'lunaris.templates.store'];
const LEGACY_THEME_STORAGE_KEYS = ['openlunaris.theme', 'lunaris.theme'];
const LEGACY_WEBHOOK_STORAGE_KEYS = ['lunaris.webhook_url'];
const LEGACY_MODEL_SELECTION_KEYS = ['openlunaris.selected_model_by_tier'];

const ENABLE_SKILL_EDITOR = Boolean(globalThis.__OPENLUNARIS_CONFIG__?.enableSkillEditor);

const DEFAULT_SELECTED_MODEL_BY_TIER = {
  cheap: 'or-ultracheap',
  fast: 'or-fast',
  best: 'or-strong'
};

const PROFILE_LABELS = {
  cheap: 'Cheap',
  fast: 'Fast',
  best: 'Best',
  auto: 'Auto'
};

const OUTPUT_MODE_LABELS = {
  text: 'text',
  email: 'email',
  ticket: 'ticket',
  json: 'json'
};

const SLOT_TYPES = new Set(['text', 'email', 'datetime', 'list', 'multiline']);

const GLOBAL_GUARDRAILS = [
  'Du bist openLunaris Assistant.',
  'Antworte in der Sprache des Users.',
  'Wenn Informationen fehlen, stelle kurze gezielte Rueckfragen statt zu raten.',
  'Erfinde keine Namen, Termine, Fakten oder technischen Details.'
].join('\n');

const SLOT_PROTOCOL_GUARDRAILS = [
  'Du bist openLunaris Assistant.',
  'Antworte in der Sprache des Users.',
  'Nutze AUSSCHLIESSLICH Informationen aus SLOT_CONTEXT.',
  'Erfinde keine Namen, Termine, Preise, Links oder Fakten.'
].join('\n');

const state = {
  skills: [],
  profile: 'auto',
  selectedModelByTier: { ...DEFAULT_SELECTED_MODEL_BY_TIER },
  profileMenuOpen: null,
  messages: [],
  draft: '',
  typing: false,
  activeSkillId: null,
  theme: 'dark',
  webhookUrl: 'http://localhost:5678/webhook/litellm-webhook',
  lastAutoAlias: null,
  modalOpen: false,
  modalView: 'picker',
  skillSearch: '',
  skillCategory: 'all',
  manageSearch: '',
  manageCategory: 'all',
  manageOutput: 'all',
  manageSkillId: null,
  slotContextBySkillId: {},
  lastCollectBlockBySkillId: {},
  importSource: 'picker',
  toastTimer: null
};

const el = {
  body: document.body,
  brandHome: document.getElementById('brand-home'),
  profileControl: document.getElementById('profile-control'),
  profileLabelCheap: document.getElementById('profile-label-cheap'),
  profileLabelFast: document.getElementById('profile-label-fast'),
  profileLabelBest: document.getElementById('profile-label-best'),
  profileLabelAuto: document.getElementById('profile-label-auto'),

  profileMenuCheap: document.getElementById('profile-menu-cheap'),
  profileMenuFast: document.getElementById('profile-menu-fast'),
  profileMenuBest: document.getElementById('profile-menu-best'),

  themeToggle: document.getElementById('theme-toggle'),
  menuToggle: document.getElementById('menu-toggle'),
  menuPanel: document.getElementById('menu-panel'),
  clearChat: document.getElementById('clear-chat'),
  clearSkill: document.getElementById('clear-skill'),
  webhookUrl: document.getElementById('webhook-url'),

  chatHistory: document.getElementById('chat-history'),
  chatInput: document.getElementById('chat-input'),
  sendBtn: document.getElementById('send-btn'),
  openSkills: document.getElementById('open-skills'),
  activeChips: document.getElementById('active-chips'),
  skillHint: document.getElementById('skill-hint'),

  modal: document.getElementById('skill-modal'),
  closeModal: document.getElementById('close-modal'),
  skillPickerView: document.getElementById('skill-picker-view'),
  skillManageView: document.getElementById('skill-manage-view'),

  skillSearch: document.getElementById('skill-search'),
  skillCategories: document.getElementById('skill-categories'),
  skillList: document.getElementById('skill-list'),
  manageSkillsLink: document.getElementById('manage-skills-link'),
  backToPicker: document.getElementById('back-to-picker'),
  importSkillsPicker: document.getElementById('import-skills-picker'),

  manageSearch: document.getElementById('manage-search'),
  manageCategoryFilter: document.getElementById('manage-category-filter'),
  manageOutputFilter: document.getElementById('manage-output-filter'),
  manageList: document.getElementById('manage-list'),

  newSkill: document.getElementById('new-skill'),
  duplicateSkill: document.getElementById('duplicate-skill'),
  deleteSkill: document.getElementById('delete-skill'),
  resetBuiltins: document.getElementById('reset-builtins'),
  exportSkills: document.getElementById('export-skills'),
  importSkills: document.getElementById('import-skills'),
  importFile: document.getElementById('import-file'),

  skillForm: document.getElementById('skill-form'),
  skillId: document.getElementById('skill-id'),
  skillIsBuiltin: document.getElementById('skill-is-builtin'),
  skillName: document.getElementById('skill-name'),
  skillDescription: document.getElementById('skill-description'),
  skillCategory: document.getElementById('skill-category'),
  skillOutputMode: document.getElementById('skill-output-mode'),
  skillPreferredTier: document.getElementById('skill-preferred-tier'),
  skillSystemPrompt: document.getElementById('skill-system-prompt'),
  skillRules: document.getElementById('skill-rules'),
  skillUseSlotProtocol: document.getElementById('skill-use-slot-protocol'),
  skillSlotsJson: document.getElementById('skill-slots-json'),
  validateSkillSlots: document.getElementById('validate-skill-slots'),
  skillDeliverSkeleton: document.getElementById('skill-deliver-skeleton'),

  toast: document.getElementById('toast')
};

function uid(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getStoredValue(primaryKey, legacyKeys = []) {
  if (primaryKey) {
    const primary = localStorage.getItem(primaryKey);
    if (primary !== null) return primary;
  }

  for (const key of legacyKeys) {
    const value = localStorage.getItem(key);
    if (value !== null) return value;
  }

  return null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  el.toast.textContent = message;
  el.toast.classList.remove('hidden');
  state.toastTimer = setTimeout(() => el.toast.classList.add('hidden'), 3200);
}

function autoGrowInput() {
  el.chatInput.style.height = 'auto';
  el.chatInput.style.height = `${Math.min(el.chatInput.scrollHeight, 180)}px`;
}

function scrollChatToBottom() {
  requestAnimationFrame(() => {
    el.chatHistory.scrollTop = el.chatHistory.scrollHeight;
  });
}

function getTierModels(tier) {
  return Array.isArray(MODEL_CATALOG[tier]) ? MODEL_CATALOG[tier] : [];
}

function findModelByAlias(alias) {
  for (const tier of ['cheap', 'fast', 'best']) {
    const found = getTierModels(tier).find((model) => model.alias === alias);
    if (found) return { ...found, tier };
  }
  return null;
}

function getModelDisplayName(alias) {
  return findModelByAlias(alias)?.displayName || alias;
}

function getModelShortName(alias) {
  const model = findModelByAlias(alias);
  return model?.shortName || model?.displayName || alias;
}

function normalizeTierSelection(tier, alias) {
  const list = getTierModels(tier);
  if (!list.length) return '';
  if (list.some((item) => item.alias === alias)) return alias;
  return DEFAULT_SELECTED_MODEL_BY_TIER[tier] || list[0].alias;
}

function normalizeSlotKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function sanitizeSlotLabel(value, fallbackKey) {
  const label = String(value || '').trim();
  if (label) return label;
  return fallbackKey
    .split('_')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function sanitizeSlotType(type) {
  const normalized = String(type || '')
    .trim()
    .toLowerCase();
  return SLOT_TYPES.has(normalized) ? normalized : 'text';
}

function sanitizeSlotDefinition(slot, fallbackIndex = 0) {
  const keySeed = String(slot?.key || slot?.label || `slot_${fallbackIndex + 1}`)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const key = keySeed || `slot_${fallbackIndex + 1}`;

  return {
    key,
    label: sanitizeSlotLabel(slot?.label, key),
    required: Boolean(slot?.required),
    type: sanitizeSlotType(slot?.type),
    example: String(slot?.example || '').trim(),
    hint: String(slot?.hint || '').trim()
  };
}

function sanitizeSlots(list) {
  if (!Array.isArray(list)) return [];

  const result = [];
  const seen = new Set();

  for (const [index, raw] of list.entries()) {
    if (!raw || typeof raw !== 'object') continue;
    const slot = sanitizeSlotDefinition(raw, index);
    if (!slot.key || seen.has(slot.key)) continue;
    seen.add(slot.key);
    result.push(slot);
  }

  return result;
}

function getSkillSlots(skill) {
  return sanitizeSlots(skill?.slots);
}

function requiredSlotCount(skill) {
  return getSkillSlots(skill).filter((slot) => slot.required).length;
}

function shouldUseSlotProtocol(skill) {
  if (!skill) return false;
  return Boolean(skill.useSlotProtocol && getSkillSlots(skill).length);
}

function sanitizeSkill(input, fallbackId = uid('skill')) {
  const outputMode = SKILL_OUTPUT_MODES.includes(input?.outputMode) ? input.outputMode : 'text';
  const preferredTierCandidate = input?.preferredTier ?? input?.preferredProfile;
  const preferredTier = SKILL_TIERS.includes(preferredTierCandidate) ? preferredTierCandidate : 'auto';

  const rules = Array.isArray(input?.rules)
    ? input.rules.map((rule) => String(rule || '').trim()).filter(Boolean)
    : String(input?.rules || '')
        .split('\n')
        .map((rule) => rule.trim())
        .filter(Boolean);

  const examples = Array.isArray(input?.examples)
    ? input.examples
        .map((example) => ({
          user: String(example?.user || '').trim(),
          assistant: String(example?.assistant || '').trim()
        }))
        .filter((example) => example.user && example.assistant)
    : [];

  const slots = sanitizeSlots(input?.slots);
  const hasRequiredSlotCountGtOne = slots.filter((slot) => slot.required).length > 1;
  const useSlotProtocol =
    typeof input?.useSlotProtocol === 'boolean' ? input.useSlotProtocol : hasRequiredSlotCountGtOne;

  const updatedAt = Number(input?.updatedAt || Date.now());

  return {
    id: String(input?.id || fallbackId).trim() || fallbackId,
    name: String(input?.name || 'Neuer Skill').trim(),
    description: String(input?.description || '').trim(),
    category: String(input?.category || 'Allgemein').trim(),
    icon: input?.icon ? String(input.icon) : '',
    outputMode,
    preferredTier,
    systemPrompt: String(input?.systemPrompt || '').trim(),
    rules,
    examples,
    slots,
    deliverSkeleton: String(input?.deliverSkeleton || '').trim(),
    useSlotProtocol: Boolean(useSlotProtocol),
    isBuiltin: Boolean(input?.isBuiltin),
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now()
  };
}

function sanitizeSkillList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => sanitizeSkill(entry, String(entry?.id || uid('skill'))))
    .filter((skill) => skill.name && skill.systemPrompt);
}

function getBuiltinSkillList() {
  return sanitizeSkillList(getBuiltinSkills()).map((skill) => ({ ...skill, isBuiltin: true }));
}

function mergeSkillsWithBuiltins(storedSkills) {
  const builtins = getBuiltinSkillList();
  const builtinIds = new Set(builtins.map((skill) => skill.id));
  const storedById = new Map(storedSkills.map((skill) => [skill.id, sanitizeSkill(skill, skill.id)]));

  const mergedBuiltins = builtins.map((builtin) => {
    const override = storedById.get(builtin.id);
    if (!override) return builtin;
    return sanitizeSkill({ ...builtin, ...override, id: builtin.id, isBuiltin: true }, builtin.id);
  });

  const custom = storedSkills
    .filter((skill) => !builtinIds.has(skill.id))
    .map((skill) => sanitizeSkill({ ...skill, isBuiltin: false }, skill.id));

  return [...mergedBuiltins, ...custom].sort((a, b) => {
    if (a.isBuiltin && !b.isBuiltin) return -1;
    if (!a.isBuiltin && b.isBuiltin) return 1;
    return a.name.localeCompare(b.name, 'de');
  });
}

function templateToMigratedSkill(template) {
  const outputMode = template?.outputMode === 'json' ? 'json' : 'text';
  const preferredTierCandidate = template?.preferredModel ?? template?.preferredProfile;
  const preferredTier = SKILL_TIERS.includes(preferredTierCandidate) ? preferredTierCandidate : 'auto';
  const templateText = String(template?.templateText || '').trim();

  const systemPrompt = [
    'Du arbeitest als Skill-Assistent. Frage nach fehlenden Informationen bevor du final antwortest.',
    'Use the following structure/template when generating output:',
    templateText
  ]
    .filter(Boolean)
    .join('\n\n');

  return sanitizeSkill(
    {
      id: `migrated-${String(template?.id || uid('legacy')).replace(/^migrated-/, '')}`,
      name: String(template?.name || 'Migrierte Vorlage').trim(),
      description: String(template?.description || 'Migriert aus einer Vorlage').trim(),
      category: String(template?.category || 'Allgemein').trim(),
      outputMode,
      preferredTier,
      systemPrompt,
      rules: [],
      examples: [],
      isBuiltin: false,
      updatedAt: Date.now()
    },
    `migrated-${uid('legacy')}`
  );
}

function migrateLegacyTemplatesToSkills() {
  const raw = getStoredValue(null, LEGACY_TEMPLATE_STORAGE_KEYS);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    const templates = Array.isArray(parsed) ? parsed : parsed?.templates;
    if (!Array.isArray(templates)) return [];

    return templates
      .map((template) => templateToMigratedSkill(template))
      .filter((skill) => skill.name && skill.systemPrompt);
  } catch {
    return [];
  }
}

function loadSkills() {
  const raw = getStoredValue(SKILL_STORAGE_KEY);

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : parsed?.skills;
      const sanitized = sanitizeSkillList(list);
      state.skills = mergeSkillsWithBuiltins(sanitized);
      return;
    } catch {
      state.skills = getBuiltinSkillList();
      return;
    }
  }

  const migrated = migrateLegacyTemplatesToSkills();
  state.skills = mergeSkillsWithBuiltins(migrated);
  saveSkills();
}

function saveSkills() {
  localStorage.setItem(SKILL_STORAGE_KEY, JSON.stringify(state.skills));
}

function sanitizeSlotContextRecord(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (const [key, value] of Object.entries(source)) {
    const slotKey = String(key || '').trim();
    if (!slotKey) continue;
    if (value == null) continue;
    out[slotKey] = String(value);
  }
  return out;
}

function loadSlotContextBySkillId() {
  try {
    const raw = getStoredValue(SLOT_CONTEXT_STORAGE_KEY);
    if (!raw) {
      state.slotContextBySkillId = {};
      return;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      state.slotContextBySkillId = {};
      return;
    }

    const next = {};
    for (const [skillId, value] of Object.entries(parsed)) {
      const safeId = String(skillId || '').trim();
      if (!safeId) continue;
      next[safeId] = sanitizeSlotContextRecord(value);
    }

    state.slotContextBySkillId = next;
  } catch {
    state.slotContextBySkillId = {};
  }
}

function persistSlotContextBySkillId() {
  localStorage.setItem(SLOT_CONTEXT_STORAGE_KEY, JSON.stringify(state.slotContextBySkillId));
}

function getSlotContextForSkill(skillId) {
  const key = String(skillId || '').trim();
  if (!key) return {};
  return { ...(state.slotContextBySkillId[key] || {}) };
}

function setSlotContextForSkill(skillId, context) {
  const key = String(skillId || '').trim();
  if (!key) return;
  state.slotContextBySkillId[key] = sanitizeSlotContextRecord(context);
  persistSlotContextBySkillId();
}

function clearSlotContextForSkill(skillId) {
  const key = String(skillId || '').trim();
  if (!key) return;
  delete state.slotContextBySkillId[key];
  delete state.lastCollectBlockBySkillId[key];
  persistSlotContextBySkillId();
}

function pruneSlotContextByKnownSkills() {
  const known = new Set(state.skills.map((skill) => skill.id));
  let changed = false;

  for (const skillId of Object.keys(state.slotContextBySkillId)) {
    if (known.has(skillId)) continue;
    delete state.slotContextBySkillId[skillId];
    delete state.lastCollectBlockBySkillId[skillId];
    changed = true;
  }

  if (changed) {
    persistSlotContextBySkillId();
  }
}

function getSkillById(id) {
  return state.skills.find((skill) => skill.id === id) || null;
}

function loadActiveSkill() {
  const stored = getStoredValue(ACTIVE_SKILL_STORAGE_KEY);
  if (!stored) {
    state.activeSkillId = null;
    return;
  }

  state.activeSkillId = getSkillById(stored)?.id || null;
}

function persistActiveSkill() {
  if (!state.activeSkillId) {
    localStorage.removeItem(ACTIVE_SKILL_STORAGE_KEY);
    return;
  }

  localStorage.setItem(ACTIVE_SKILL_STORAGE_KEY, state.activeSkillId);
}

function loadTheme() {
  const stored = getStoredValue(THEME_STORAGE_KEY, LEGACY_THEME_STORAGE_KEYS);
  state.theme = stored === 'light' ? 'light' : 'dark';
}

function applyTheme() {
  el.body.dataset.theme = state.theme;
}

function persistTheme() {
  localStorage.setItem(THEME_STORAGE_KEY, state.theme);
}

function loadWebhookUrl() {
  const stored = getStoredValue(WEBHOOK_STORAGE_KEY, LEGACY_WEBHOOK_STORAGE_KEYS);
  if (stored && stored.trim()) {
    state.webhookUrl = stored.trim();
  }

  el.webhookUrl.value = state.webhookUrl;
}

function saveWebhookUrl(url) {
  state.webhookUrl = url;
  localStorage.setItem(WEBHOOK_STORAGE_KEY, url);
}

function loadSelectedModelByTier() {
  try {
    const raw = getStoredValue(MODEL_SELECTION_STORAGE_KEY, LEGACY_MODEL_SELECTION_KEYS);
    if (!raw) {
      state.selectedModelByTier = { ...DEFAULT_SELECTED_MODEL_BY_TIER };
      return;
    }

    const parsed = JSON.parse(raw);
    state.selectedModelByTier = {
      cheap: normalizeTierSelection('cheap', parsed.cheap),
      fast: normalizeTierSelection('fast', parsed.fast),
      best: normalizeTierSelection('best', parsed.best)
    };
  } catch {
    state.selectedModelByTier = { ...DEFAULT_SELECTED_MODEL_BY_TIER };
  }
}

function persistSelectedModelByTier() {
  localStorage.setItem(MODEL_SELECTION_STORAGE_KEY, JSON.stringify(state.selectedModelByTier));
}

function renderProfileMenus() {
  const map = {
    cheap: el.profileMenuCheap,
    fast: el.profileMenuFast,
    best: el.profileMenuBest
  };

  for (const tier of ['cheap', 'fast', 'best']) {
    const menu = map[tier];
    menu.innerHTML = '';

    for (const model of getTierModels(tier)) {
      const selected = state.selectedModelByTier[tier] === model.alias;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `profile-option${selected ? ' active' : ''}`;
      btn.dataset.profile = tier;
      btn.dataset.alias = model.alias;
      btn.innerHTML = `
        <div class="profile-option-row">
          <span class="profile-option-title">${escapeHtml(model.displayName)}</span>
          <span class="profile-option-check">${selected ? '✓' : ''}</span>
        </div>
        <div class="profile-option-sub">${escapeHtml(model.description || `OpenRouter • ${PROFILE_LABELS[tier]}`)}</div>
      `;
      menu.appendChild(btn);
    }
  }
}

function renderProfileControl() {
  const cheapAlias = normalizeTierSelection('cheap', state.selectedModelByTier.cheap);
  const fastAlias = normalizeTierSelection('fast', state.selectedModelByTier.fast);
  const bestAlias = normalizeTierSelection('best', state.selectedModelByTier.best);

  state.selectedModelByTier.cheap = cheapAlias;
  state.selectedModelByTier.fast = fastAlias;
  state.selectedModelByTier.best = bestAlias;

  el.profileLabelCheap.textContent = getModelShortName(cheapAlias);
  el.profileLabelFast.textContent = getModelShortName(fastAlias);
  el.profileLabelBest.textContent = getModelShortName(bestAlias);

  el.profileControl.querySelector('.profile-trigger[data-profile="cheap"]').title = getModelDisplayName(cheapAlias);
  el.profileControl.querySelector('.profile-trigger[data-profile="fast"]').title = getModelDisplayName(fastAlias);
  el.profileControl.querySelector('.profile-trigger[data-profile="best"]').title = getModelDisplayName(bestAlias);

  if (state.lastAutoAlias) {
    const autoLabel = `Zuletzt genutzt: ${getModelShortName(state.lastAutoAlias)}`;
    el.profileLabelAuto.textContent = autoLabel;
    el.profileControl.querySelector('.profile-trigger[data-profile="auto"]').title = getModelDisplayName(state.lastAutoAlias);
  } else {
    el.profileLabelAuto.textContent = 'Dynamisch';
    el.profileControl.querySelector('.profile-trigger[data-profile="auto"]').title = 'Automatische Auswahl';
  }

  const profileItems = el.profileControl.querySelectorAll('.profile-item');
  for (const item of profileItems) {
    const profile = item.dataset.profile;
    item.classList.toggle('active', state.profile === profile);
    item.classList.toggle('open', state.profileMenuOpen === profile);
  }

  renderProfileMenus();
}

function resolveAutoTier(text, skill, outputMode) {
  if (outputMode === 'json') return 'best';

  if (skill?.preferredTier && skill.preferredTier !== 'auto') {
    return skill.preferredTier;
  }

  const message = String(text || '');
  const hasCodeBlock = /```[\s\S]*```/m.test(message);
  const hasCodeLike = /\b(function|class|SELECT\s|INSERT\s|UPDATE\s|const\s|let\s|=>)\b/m.test(message);
  const hasJsonLike = /\{[\s\S]*:[\s\S]*\}/m.test(message) || /\[[\s\S]*\{[\s\S]*\}/m.test(message);
  const isLong = message.length > 900 || message.split('\n').length > 12;

  if (isLong || hasCodeBlock || hasCodeLike || hasJsonLike) return 'best';

  const simpleShort = message.length < 220 && message.split('\n').length <= 2;
  if (simpleShort) return 'cheap';

  return 'fast';
}

function resolveModelAliasForMessage(text, skill, outputMode) {
  if (state.profile !== 'auto') {
    const tier = state.profile;
    return normalizeTierSelection(tier, state.selectedModelByTier[tier]);
  }

  const autoTier = resolveAutoTier(text, skill, outputMode);
  return normalizeTierSelection(autoTier, state.selectedModelByTier[autoTier]);
}

function renderSkillHintAndPlaceholder() {
  const skill = getSkillById(state.activeSkillId);

  if (skill) {
    el.skillHint.classList.remove('hidden');
    el.skillHint.textContent = `Skill aktiv: ${skill.name} - antworte einfach, ich frage nur fehlende Pflichtangaben in einem Block ab.`;
    el.chatInput.placeholder = 'Beschreibe kurz dein Anliegen ... (der Skill fragt nach, falls Infos fehlen)';
    return;
  }

  el.skillHint.classList.add('hidden');
  el.skillHint.textContent = '';
  el.chatInput.placeholder = 'Nachricht eingeben... (Enter = Senden, Shift+Enter = Zeilenumbruch)';
}

function renderComposerChips() {
  const chips = [];
  const skill = getSkillById(state.activeSkillId);

  if (skill) {
    chips.push(
      `<span class="chip">Skill: ${escapeHtml(skill.name)} <button type="button" data-clear-skill-chip="1">✕</button></span>`
    );

    if (shouldUseSlotProtocol(skill)) {
      const missing = missingRequiredSlots(skill, getSlotContextForSkill(skill.id));
      if (missing.length) {
        chips.push(`<span class="chip">Fehlen: ${missing.length}</span>`);
      }
    }
  }

  if (state.profile === 'auto') {
    const label = state.lastAutoAlias ? `Zuletzt genutzt: ${getModelDisplayName(state.lastAutoAlias)}` : 'Dynamisch';
    chips.push(`<span class="chip">Profil: Auto • ${escapeHtml(label)}</span>`);
  } else {
    const alias = normalizeTierSelection(state.profile, state.selectedModelByTier[state.profile]);
    chips.push(`<span class="chip">Profil: ${PROFILE_LABELS[state.profile]} • ${escapeHtml(getModelDisplayName(alias))}</span>`);
  }

  el.activeChips.innerHTML = chips.join('');
  renderSkillHintAndPlaceholder();
}

function addMessage(role, content, meta = {}) {
  state.messages.push({
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content: String(content || ''),
    outputMode: meta.outputMode || null,
    skillId: meta.skillId || null,
    internalType: meta.internalType || null
  });
}

function getConversationHistoryMessages() {
  return state.messages.map((msg) => ({
    role: msg.role,
    content: msg.content
  }));
}

function outputConstraintsForMode(outputMode) {
  if (outputMode === 'email') {
    return [
      'Output-Format strikt einhalten:',
      'BETREFF: <eine Zeile>',
      'TEXT:',
      '<Email-Text>',
      'Keine zusaetzlichen Erklaerungen.'
    ].join('\n');
  }

  if (outputMode === 'ticket') {
    return [
      'Output-Format fuer Ticket strikt einhalten:',
      'Title:',
      'Priority: Low|Med|High',
      'Steps to reproduce:',
      'Expected:',
      'Actual:',
      'Environment:',
      'Next steps:'
    ].join('\n');
  }

  if (outputMode === 'json') {
    return 'Antworte ausschliesslich mit validem JSON. Kein Markdown, kein Fliesstext.';
  }

  return 'Halte die Antwort knapp, klar und direkt nutzbar.';
}

function composeSystemMessage(skill, outputMode) {
  const parts = [GLOBAL_GUARDRAILS];

  if (skill) {
    parts.push(`Aktiver Skill: ${skill.name}`);

    if (skill.description) {
      parts.push(`Skill-Beschreibung: ${skill.description}`);
    }

    if (skill.systemPrompt) {
      parts.push(`Skill-Systemprompt:\n${skill.systemPrompt}`);
    }

    if (skill.rules?.length) {
      parts.push(`Skill-Regeln:\n${skill.rules.map((rule) => `- ${rule}`).join('\n')}`);
    }

    if (skill.examples?.length) {
      const sample = skill.examples[0];
      parts.push(`Skill-Beispiel:\nUser: ${sample.user}\nAssistant: ${sample.assistant}`);
    }
  }

  parts.push(outputConstraintsForMode(outputMode));
  return parts.filter(Boolean).join('\n\n').trim();
}

function slotMapForSkill(skill) {
  const map = new Map();
  for (const slot of getSkillSlots(skill)) {
    map.set(normalizeSlotKey(slot.key), slot.key);
    map.set(normalizeSlotKey(slot.label), slot.key);
  }
  return map;
}

function slotTypeByKey(skill) {
  const typeMap = new Map();
  for (const slot of getSkillSlots(skill)) {
    typeMap.set(slot.key, slot.type || 'text');
  }
  return typeMap;
}

function normalizeSlotValue(value, type = 'text') {
  if (value == null) return '';

  if (Array.isArray(value)) {
    const values = value.map((entry) => String(entry ?? '').trim()).filter(Boolean);
    return values.join('\n');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  const text = String(value).replace(/\r\n/g, '\n').trim();
  if (!text) return '';
  if (text === '-') return '-';

  if (type === 'list' && !text.includes('\n')) {
    const list = text
      .split(/\s*[;,]\s*/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    return list.length > 1 ? list.join('\n') : text;
  }

  return text;
}

function extractSlotsFromJsonObject(text, skill) {
  const trimmed = String(text || '').trim();
  if (!trimmed.startsWith('{')) return {};

  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const aliases = slotMapForSkill(skill);
    const typeMap = slotTypeByKey(skill);
    const extracted = {};

    for (const [rawKey, rawValue] of Object.entries(parsed)) {
      const slotKey = aliases.get(normalizeSlotKey(rawKey));
      if (!slotKey) continue;
      const value = normalizeSlotValue(rawValue, typeMap.get(slotKey));
      if (value) extracted[slotKey] = value;
      if (value === '-') extracted[slotKey] = '-';
    }

    return extracted;
  } catch {
    return {};
  }
}

function extractSlotsFromColonLines(text, skill) {
  const slots = getSkillSlots(skill);
  const aliases = slotMapForSkill(skill);
  const typeMap = slotTypeByKey(skill);
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n');
  const extracted = {};
  let currentSlotKey = null;

  for (const rawLine of lines) {
    const line = String(rawLine || '');
    const header = line.match(/^\s*([^:]{1,120})\s*:\s*(.*)$/);

    if (header) {
      const key = aliases.get(normalizeSlotKey(header[1]));
      if (!key) {
        currentSlotKey = null;
        continue;
      }

      currentSlotKey = key;
      const value = normalizeSlotValue(header[2], typeMap.get(key));
      if (value || value === '-') {
        extracted[key] = value;
      }
      continue;
    }

    if (!currentSlotKey) continue;
    if (!line.trim()) continue;

    const chunk = line.trim();
    extracted[currentSlotKey] = extracted[currentSlotKey]
      ? `${extracted[currentSlotKey]}\n${chunk}`
      : normalizeSlotValue(chunk, typeMap.get(currentSlotKey));
  }

  for (const slot of slots) {
    if (!Object.prototype.hasOwnProperty.call(extracted, slot.key)) continue;
    extracted[slot.key] = normalizeSlotValue(extracted[slot.key], slot.type);
  }

  return extracted;
}

function extractSlotsFromText(text, skill) {
  const slots = getSkillSlots(skill);
  if (!slots.length) return {};

  const fromJson = extractSlotsFromJsonObject(text, skill);
  const fromLines = extractSlotsFromColonLines(text, skill);
  const extracted = { ...fromJson, ...fromLines };

  if (!Object.keys(fromJson).length && !Object.keys(fromLines).length) {
    const inputTextSlot = slots.find((slot) => slot.key === 'input_text');
    if (inputTextSlot) {
      const value = normalizeSlotValue(text, inputTextSlot.type);
      if (value) extracted[inputTextSlot.key] = value;
    }
  }

  const emailMatch = String(text || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) {
    const emailSlot = slots.find((slot) => slot.type === 'email' && !String(extracted[slot.key] || '').trim());
    if (emailSlot) {
      extracted[emailSlot.key] = emailMatch[0];
    }
  }

  if (!Object.keys(extracted).length && slots.length === 1) {
    extracted[slots[0].key] = normalizeSlotValue(text, slots[0].type);
  }

  return extracted;
}

function mergeSlotContext(prev, extracted) {
  const merged = { ...(prev || {}) };
  for (const [key, rawValue] of Object.entries(extracted || {})) {
    const value = String(rawValue ?? '').trim();
    if (!value && value !== '-') continue;
    if (value === '-') {
      delete merged[key];
      continue;
    }
    merged[key] = rawValue;
  }
  return merged;
}

function missingRequiredSlots(skill, ctx) {
  return getSkillSlots(skill).filter((slot) => {
    if (!slot.required) return false;
    const value = String(ctx?.[slot.key] ?? '').trim();
    return !value;
  });
}

function shortSlotMeta(slot) {
  const hint = String(slot.hint || '').trim();
  const example = String(slot.example || '').trim();
  const source = hint || example;
  if (!source) return '';
  if (source.length > 34) return '';
  return source;
}

function formatCollectBlock(skill, missingSlots) {
  const lines = ['BENOETIGTE ANGABEN (bitte in EINER Nachricht ausfuellen):'];

  for (const slot of missingSlots) {
    const meta = shortSlotMeta(slot);
    lines.push(meta ? `${slot.label}: (${meta})` : `${slot.label}: `);
  }

  lines.push('Du kannst nur die fehlenden Zeilen ausfuellen.');
  return lines.join('\n');
}

function formatSlotContextForModel(skill, ctx) {
  const lines = ['SLOT_CONTEXT:'];
  for (const slot of getSkillSlots(skill)) {
    const value = String(ctx?.[slot.key] ?? '');
    if (!value.includes('\n')) {
      lines.push(`${slot.key}=${value}`);
      continue;
    }

    lines.push(`${slot.key}=|`);
    for (const part of value.split('\n')) {
      lines.push(`  ${part}`);
    }
  }
  return lines.join('\n');
}

function collectFallbackBlockForSkill(skill) {
  const required = getSkillSlots(skill).filter((slot) => slot.required);
  if (!required.length) return 'BENOETIGTE ANGABEN (bitte in EINER Nachricht ausfuellen):';
  return formatCollectBlock(skill, required);
}

function extractNotesFromText(text, skill) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  if (getSkillSlots(skill).length === 1 && !raw.includes(':') && !raw.startsWith('{')) return '';

  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return '';
    } catch {
      // keep processing
    }
  }

  const aliases = slotMapForSkill(skill);
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const slots = getSkillSlots(skill);
  const hasInputTextSlot = slots.some((slot) => slot.key === 'input_text');
  const hasRecognizedHeader = lines.some((line) => {
    const header = line.match(/^\s*([^:]{1,120})\s*:\s*(.*)$/);
    if (!header) return false;
    return Boolean(aliases.get(normalizeSlotKey(header[1])));
  });
  if (hasInputTextSlot && !hasRecognizedHeader) return '';

  const notes = [];
  let currentSlotKey = null;

  for (const line of lines) {
    const header = line.match(/^\s*([^:]{1,120})\s*:\s*(.*)$/);
    if (header) {
      const slotKey = aliases.get(normalizeSlotKey(header[1]));
      if (slotKey) {
        currentSlotKey = slotKey;
        continue;
      }
      currentSlotKey = null;
      if (line.trim()) notes.push(line.trim());
      continue;
    }

    if (currentSlotKey) {
      continue;
    }

    if (line.trim()) {
      notes.push(line.trim());
    }
  }

  return notes.join('\n').trim();
}

function composeSlotDeliverSystemMessage(skill, outputMode) {
  const parts = [SLOT_PROTOCOL_GUARDRAILS, `Rolle: ${skill?.name || 'Skill'}`];

  parts.push(
    [
      'Wenn erforderliche Slots fehlen, gib NUR folgenden Block aus:',
      collectFallbackBlockForSkill(skill),
      'Dann beenden.'
    ].join('\n')
  );
  parts.push(outputConstraintsForMode(outputMode));

  if (skill?.deliverSkeleton) {
    parts.push(`DELIVER_SKELETON:\n${String(skill.deliverSkeleton).trim()}`);
  }

  return parts.filter(Boolean).join('\n\n').trim();
}

function parseEmailResponse(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;

  const subjectMatch = raw.match(/BETREFF\s*:\s*(.+)/i);
  const textStart = raw.search(/(^|\n)\s*TEXT\s*:/i);

  if (!subjectMatch || textStart === -1) return null;

  const subject = subjectMatch[1].trim();
  const body = raw.slice(textStart).replace(/(^|\n)\s*TEXT\s*:\s*/i, '').trim();

  if (!subject && !body) return null;
  return { subject, body };
}

function normalizeTicketKey(rawKey) {
  const key = rawKey
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();

  const keyMap = new Map([
    ['title', 'title'],
    ['titel', 'title'],
    ['priority', 'priority'],
    ['prioritat', 'priority'],
    ['prioritaet', 'priority'],
    ['steps to reproduce', 'steps'],
    ['steps', 'steps'],
    ['schritte zur reproduktion', 'steps'],
    ['expected', 'expected'],
    ['erwartet', 'expected'],
    ['actual', 'actual'],
    ['ist', 'actual'],
    ['environment', 'environment'],
    ['umgebung', 'environment'],
    ['next steps', 'nextSteps'],
    ['next step', 'nextSteps'],
    ['nachste schritte', 'nextSteps'],
    ['naechste schritte', 'nextSteps']
  ]);

  return keyMap.get(key) || null;
}

function parseTicketResponse(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const data = {
    title: '',
    priority: '',
    steps: '',
    expected: '',
    actual: '',
    environment: '',
    nextSteps: ''
  };

  let currentKey = null;

  for (const line of lines) {
    const header = line.match(/^\s*([A-Za-zA-Za-z0-9\s\u00c4\u00d6\u00dc\u00e4\u00f6\u00fc\u00df]+)\s*:\s*(.*)$/);

    if (header) {
      const normalized = normalizeTicketKey(header[1]);
      if (normalized) {
        currentKey = normalized;
        data[currentKey] = header[2].trim();
        continue;
      }
    }

    if (!currentKey) continue;

    const nextChunk = line.trim();
    if (!nextChunk) continue;
    data[currentKey] = data[currentKey] ? `${data[currentKey]}\n${nextChunk}` : nextChunk;
  }

  const filledCount = Object.values(data).filter((value) => value.trim()).length;
  if (filledCount < 2) return null;

  return data;
}

function parseJsonResponse(text) {
  const raw = String(text || '').trim();
  if (!raw) return { valid: false, error: 'Leere JSON-Antwort', raw: '' };

  try {
    const parsed = JSON.parse(raw);
    return { valid: true, parsed, raw };
  } catch (error) {
    return {
      valid: false,
      error: error?.message || 'Ungueltiges JSON',
      raw
    };
  }
}

function makeCopyButton(label, value) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ghost message-copy';
  button.textContent = label;
  button.dataset.copyText = value;
  return button;
}

function createStructuredCard(title) {
  const card = document.createElement('section');
  card.className = 'structured-card';

  const heading = document.createElement('h4');
  heading.textContent = title;
  card.appendChild(heading);

  return card;
}

function appendCardRow(card, label, value) {
  const row = document.createElement('div');
  row.className = 'structured-row';

  const labelEl = document.createElement('strong');
  labelEl.textContent = label;

  const valueEl = document.createElement('pre');
  valueEl.className = 'structured-value';
  valueEl.textContent = value || '-';

  row.appendChild(labelEl);
  row.appendChild(valueEl);
  card.appendChild(row);
}

function renderAssistantBody(message) {
  const mode = message.outputMode || 'text';
  const wrapper = document.createElement('div');

  if (message.internalType === 'collect') {
    const card = createStructuredCard('Pflichtangaben');
    const pre = document.createElement('pre');
    pre.className = 'structured-value';
    pre.textContent = message.content;
    card.appendChild(pre);

    const actions = document.createElement('div');
    actions.className = 'structured-actions';
    actions.appendChild(makeCopyButton('Collect Block kopieren', message.content));
    card.appendChild(actions);

    wrapper.appendChild(card);
    return wrapper;
  }

  if (mode === 'email') {
    const parsed = parseEmailResponse(message.content);
    if (parsed) {
      const card = createStructuredCard('E-Mail');
      appendCardRow(card, 'Betreff', parsed.subject);
      appendCardRow(card, 'Text', parsed.body);

      const actions = document.createElement('div');
      actions.className = 'structured-actions';
      actions.appendChild(makeCopyButton('Betreff kopieren', parsed.subject));
      actions.appendChild(makeCopyButton('Text kopieren', parsed.body));
      card.appendChild(actions);

      wrapper.appendChild(card);
      return wrapper;
    }
  }

  if (mode === 'ticket') {
    const parsed = parseTicketResponse(message.content);
    if (parsed) {
      const card = createStructuredCard('Support Ticket');
      appendCardRow(card, 'Title', parsed.title);
      appendCardRow(card, 'Priority', parsed.priority);
      appendCardRow(card, 'Steps to reproduce', parsed.steps);
      appendCardRow(card, 'Expected', parsed.expected);
      appendCardRow(card, 'Actual', parsed.actual);
      appendCardRow(card, 'Environment', parsed.environment);
      appendCardRow(card, 'Next steps', parsed.nextSteps);

      const actions = document.createElement('div');
      actions.className = 'structured-actions';
      actions.appendChild(makeCopyButton('Ticket kopieren', message.content));
      card.appendChild(actions);

      wrapper.appendChild(card);
      return wrapper;
    }
  }

  if (mode === 'json') {
    const parsed = parseJsonResponse(message.content);
    const card = createStructuredCard('JSON');

    if (parsed.valid) {
      const pretty = JSON.stringify(parsed.parsed, null, 2);
      const pre = document.createElement('pre');
      pre.className = 'json-block';
      pre.textContent = pretty;
      card.appendChild(pre);

      const actions = document.createElement('div');
      actions.className = 'structured-actions';
      actions.appendChild(makeCopyButton('JSON kopieren', pretty));
      card.appendChild(actions);
    } else {
      const error = document.createElement('p');
      error.className = 'json-error';
      error.textContent = `Ungueltiges JSON: ${parsed.error}`;
      card.appendChild(error);

      const pre = document.createElement('pre');
      pre.className = 'json-block';
      pre.textContent = parsed.raw;
      card.appendChild(pre);

      const actions = document.createElement('div');
      actions.className = 'structured-actions';
      actions.appendChild(makeCopyButton('Rohantwort kopieren', parsed.raw));
      card.appendChild(actions);
    }

    wrapper.appendChild(card);
    return wrapper;
  }

  const plain = document.createElement('div');
  plain.textContent = message.content;
  wrapper.appendChild(plain);
  return wrapper;
}

function renderChat() {
  el.chatHistory.innerHTML = '';

  if (!state.messages.length && !state.typing) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Starte den Chat oder nutze + fuer einen Skill.';
    el.chatHistory.appendChild(empty);
    return;
  }

  for (const message of state.messages) {
    const wrapper = document.createElement('article');
    wrapper.className = `message ${message.role}`;

    const head = document.createElement('div');
    head.className = 'message-head';

    const role = document.createElement('span');
    role.className = 'message-role';
    role.textContent = message.role === 'assistant' ? 'Assistant' : 'User';
    head.appendChild(role);

    if (message.role === 'assistant') {
      head.appendChild(makeCopyButton('Copy', message.content));
    }

    wrapper.appendChild(head);

    if (message.role === 'assistant') {
      wrapper.appendChild(renderAssistantBody(message));
    } else {
      const text = document.createElement('div');
      text.textContent = message.content;
      wrapper.appendChild(text);
    }

    el.chatHistory.appendChild(wrapper);
  }

  if (state.typing) {
    const typing = document.createElement('article');
    typing.className = 'message assistant';
    typing.innerHTML = `
      <div class="message-head"><span class="message-role">Assistant</span></div>
      <div class="typing"><span></span><span></span><span></span></div>
    `;
    el.chatHistory.appendChild(typing);
  }

  scrollChatToBottom();
}

function previewFromPrompt(skill) {
  const source = String(skill.systemPrompt || '').replace(/\s+/g, ' ').trim();
  if (!source) return '';
  return source.length > 120 ? `${source.slice(0, 117)}...` : source;
}

function skillCategoriesForPicker() {
  const categories = Array.from(new Set(state.skills.map((skill) => skill.category || 'Allgemein'))).sort((a, b) =>
    a.localeCompare(b, 'de')
  );

  return ['all', ...categories];
}

function skillMatchesPickerFilter(skill) {
  const search = state.skillSearch.trim().toLowerCase();
  const categoryMatch = state.skillCategory === 'all' || skill.category === state.skillCategory;

  if (!search) return categoryMatch;

  const text = `${skill.name} ${skill.description} ${skill.category} ${skill.outputMode} ${skill.preferredTier}`.toLowerCase();
  return categoryMatch && text.includes(search);
}

function makeSkillCard(skill, activeId) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `template-card skill-card${skill.id === activeId ? ' active' : ''}`;
  button.dataset.skillId = skill.id;
  button.title = previewFromPrompt(skill);

  const preview = previewFromPrompt(skill);
  button.innerHTML = `
    <h3>${escapeHtml(skill.name)}</h3>
    <p>${escapeHtml(skill.description || '')}</p>
    <p class="skill-preview">${escapeHtml(preview)}</p>
    <div class="tag-row">
      <span class="tag">${escapeHtml(skill.category)}</span>
      <span class="tag">${escapeHtml(skill.outputMode)}</span>
      <span class="tag">${escapeHtml(skill.preferredTier)}</span>
    </div>
  `;

  return button;
}

function renderSkillCategoryChips() {
  el.skillCategories.innerHTML = '';

  for (const category of skillCategoriesForPicker()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `chip chip-button${state.skillCategory === category ? ' active' : ''}`;
    button.dataset.skillCategory = category;
    button.textContent = category === 'all' ? 'Alle' : category;
    el.skillCategories.appendChild(button);
  }
}

function renderSkillPicker() {
  renderSkillCategoryChips();

  const filtered = state.skills.filter(skillMatchesPickerFilter);
  el.skillList.innerHTML = '';

  if (!filtered.length) {
    el.skillList.innerHTML = '<p class="muted">Keine Skills gefunden.</p>';
    return;
  }

  for (const skill of filtered) {
    el.skillList.appendChild(makeSkillCard(skill, state.activeSkillId));
  }
}

function categoriesForManage() {
  const categories = Array.from(new Set(state.skills.map((skill) => skill.category || 'Allgemein'))).sort((a, b) =>
    a.localeCompare(b, 'de')
  );

  return ['all', ...categories];
}

function renderManageCategoryFilter() {
  el.manageCategoryFilter.innerHTML = '';

  for (const category of categoriesForManage()) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category === 'all' ? 'Alle Kategorien' : category;
    option.selected = category === state.manageCategory;
    el.manageCategoryFilter.appendChild(option);
  }
}

function manageSkillFilter(skill) {
  const search = state.manageSearch.trim().toLowerCase();
  const searchMatch =
    !search ||
    skill.name.toLowerCase().includes(search) ||
    skill.description.toLowerCase().includes(search) ||
    skill.category.toLowerCase().includes(search);

  const categoryMatch = state.manageCategory === 'all' || skill.category === state.manageCategory;
  const outputMatch = state.manageOutput === 'all' || skill.outputMode === state.manageOutput;

  return searchMatch && categoryMatch && outputMatch;
}

function fillSkillEditor(skill) {
  if (!skill) {
    el.skillId.value = '';
    el.skillIsBuiltin.value = 'false';
    el.skillName.value = '';
    el.skillDescription.value = '';
    el.skillCategory.value = 'Allgemein';
    el.skillOutputMode.value = 'text';
    el.skillPreferredTier.value = 'auto';
    el.skillSystemPrompt.value = '';
    el.skillRules.value = '';
    if (el.skillUseSlotProtocol) el.skillUseSlotProtocol.value = 'auto';
    if (el.skillSlotsJson) el.skillSlotsJson.value = '[]';
    if (el.skillDeliverSkeleton) el.skillDeliverSkeleton.value = '';
    return;
  }

  el.skillId.value = skill.id;
  el.skillIsBuiltin.value = String(Boolean(skill.isBuiltin));
  el.skillName.value = skill.name;
  el.skillDescription.value = skill.description;
  el.skillCategory.value = skill.category;
  el.skillOutputMode.value = skill.outputMode;
  el.skillPreferredTier.value = skill.preferredTier;
  el.skillSystemPrompt.value = skill.systemPrompt;
  el.skillRules.value = (skill.rules || []).join('\n');
  if (el.skillUseSlotProtocol) {
    el.skillUseSlotProtocol.value = typeof skill.useSlotProtocol === 'boolean' ? String(skill.useSlotProtocol) : 'auto';
  }
  if (el.skillSlotsJson) {
    el.skillSlotsJson.value = JSON.stringify(getSkillSlots(skill), null, 2);
  }
  if (el.skillDeliverSkeleton) {
    el.skillDeliverSkeleton.value = String(skill.deliverSkeleton || '');
  }
}

function renderManageView() {
  if (!ENABLE_SKILL_EDITOR) return;

  renderManageCategoryFilter();

  const filtered = state.skills.filter(manageSkillFilter);

  if (!state.manageSkillId || !getSkillById(state.manageSkillId)) {
    state.manageSkillId = filtered[0]?.id || state.skills[0]?.id || null;
  }

  el.manageList.innerHTML = '';
  for (const skill of filtered) {
    el.manageList.appendChild(makeSkillCard(skill, state.manageSkillId));
  }

  fillSkillEditor(getSkillById(state.manageSkillId));
}

function setActiveSkill(skillId) {
  state.activeSkillId = getSkillById(skillId)?.id || null;
  persistActiveSkill();
  renderComposerChips();
  renderSkillPicker();
}

function openModal(view = 'picker') {
  state.modalOpen = true;
  state.modalView = ENABLE_SKILL_EDITOR ? view : 'picker';

  el.modal.classList.remove('hidden');
  renderModalView();

  if (state.modalView === 'picker') {
    el.skillSearch.focus();
  }
}

function closeModal() {
  state.modalOpen = false;
  el.modal.classList.add('hidden');
}

function renderModalView() {
  const showManage = ENABLE_SKILL_EDITOR && state.modalView === 'manage';
  el.skillPickerView.classList.toggle('active', !showManage);
  el.skillManageView.classList.toggle('active', showManage);

  if (showManage) renderManageView();
  else renderSkillPicker();
}

function parseSlotsFromEditorInput(raw) {
  const text = String(raw || '').trim();
  if (!text) return [];

  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error('Slots JSON muss ein Array sein.');
  }

  return sanitizeSlots(parsed);
}

function saveSkillFromEditor() {
  const existing = getSkillById(el.skillId.value);
  let parsedSlots = [];

  try {
    parsedSlots = parseSlotsFromEditorInput(el.skillSlotsJson?.value || '');
  } catch (error) {
    showToast(`Slots JSON ungueltig: ${error.message || 'Parse-Fehler'}`);
    return;
  }

  const slotProtocolSelect = String(el.skillUseSlotProtocol?.value || 'auto');
  const useSlotProtocol =
    slotProtocolSelect === 'true'
      ? true
      : slotProtocolSelect === 'false'
        ? false
        : parsedSlots.filter((slot) => slot.required).length > 1;

  const skill = sanitizeSkill(
    {
      id: el.skillId.value || uid('skill'),
      name: el.skillName.value,
      description: el.skillDescription.value,
      category: el.skillCategory.value,
      outputMode: el.skillOutputMode.value,
      preferredTier: el.skillPreferredTier.value,
      systemPrompt: el.skillSystemPrompt.value,
      rules: el.skillRules.value,
      slots: parsedSlots,
      deliverSkeleton: el.skillDeliverSkeleton?.value || '',
      useSlotProtocol,
      isBuiltin: existing?.isBuiltin || el.skillIsBuiltin.value === 'true',
      updatedAt: Date.now()
    },
    el.skillId.value || uid('skill')
  );

  if (!skill.name || !skill.systemPrompt) {
    showToast('Name und System Prompt sind erforderlich.');
    return;
  }

  if (existing) {
    state.skills = state.skills.map((entry) => (entry.id === skill.id ? skill : entry));
  } else {
    state.skills.unshift({ ...skill, isBuiltin: false });
  }

  state.manageSkillId = skill.id;
  saveSkills();
  renderSkillPicker();
  renderManageView();
}

function duplicateSkill() {
  const source = getSkillById(state.manageSkillId);
  if (!source) {
    showToast('Kein Skill ausgewaehlt.');
    return;
  }

  const copy = sanitizeSkill(
    {
      ...source,
      id: uid('skill'),
      name: `${source.name} (Kopie)`,
      isBuiltin: false,
      updatedAt: Date.now()
    },
    uid('skill')
  );

  state.skills.unshift(copy);
  state.manageSkillId = copy.id;
  saveSkills();
  renderSkillPicker();
  renderManageView();
}

function deleteSkill() {
  const id = state.manageSkillId;
  if (!id) {
    showToast('Kein Skill ausgewaehlt.');
    return;
  }

  const existing = getSkillById(id);
  if (!existing) return;

  if (existing.isBuiltin) {
    if (!confirm('Built-in Skill auf Standard zuruecksetzen?')) return;

    const fallback = getBuiltinSkillList().find((skill) => skill.id === id);
    if (!fallback) return;

    state.skills = state.skills.map((skill) => (skill.id === id ? fallback : skill));
    state.manageSkillId = id;
    saveSkills();
    renderComposerChips();
    renderSkillPicker();
    renderManageView();
    return;
  }

  if (!confirm('Skill wirklich loeschen?')) return;

  state.skills = state.skills.filter((skill) => skill.id !== id);
  clearSlotContextForSkill(id);

  if (!state.skills.length) {
    state.skills = getBuiltinSkillList();
  }

  if (state.activeSkillId === id) {
    state.activeSkillId = null;
    persistActiveSkill();
  }

  state.manageSkillId = state.skills[0]?.id || null;
  pruneSlotContextByKnownSkills();
  saveSkills();
  renderComposerChips();
  renderSkillPicker();
  renderManageView();
}

function resetBuiltinSkills() {
  if (!confirm('Built-in Skills auf Standard zuruecksetzen?')) return;

  const defaults = getBuiltinSkillList();
  const defaultIds = new Set(defaults.map((skill) => skill.id));
  const custom = state.skills.filter((skill) => !defaultIds.has(skill.id)).map((skill) => ({ ...skill, isBuiltin: false }));

  state.skills = [...defaults, ...custom];
  pruneSlotContextByKnownSkills();
  saveSkills();

  if (state.activeSkillId && !getSkillById(state.activeSkillId)) {
    state.activeSkillId = null;
    persistActiveSkill();
  }

  renderComposerChips();
  renderSkillPicker();
  renderManageView();
}

function exportSkills() {
  const payload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    skills: state.skills
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'openlunaris-skills.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function parseImportedSkillList(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.skills)) return parsed.skills;
  if (Array.isArray(parsed?.templates)) {
    return parsed.templates.map((template) => templateToMigratedSkill(template));
  }
  return null;
}

async function importSkills(file) {
  const parsed = JSON.parse(await file.text());
  const list = parseImportedSkillList(parsed);
  if (!Array.isArray(list)) {
    throw new Error('skills-Array fehlt.');
  }

  const imported = sanitizeSkillList(list).map((skill) => {
    const builtin = getBuiltinSkillList().find((entry) => entry.id === skill.id);
    return builtin ? { ...skill, isBuiltin: true } : { ...skill, isBuiltin: Boolean(skill.isBuiltin) };
  });

  if (!imported.length) {
    throw new Error('Keine gueltigen Skills gefunden.');
  }

  const byId = new Map(state.skills.map((skill) => [skill.id, skill]));
  for (const skill of imported) {
    byId.set(skill.id, skill);
  }

  state.skills = mergeSkillsWithBuiltins(Array.from(byId.values()));
  pruneSlotContextByKnownSkills();
  state.manageSkillId = imported[0].id;
  saveSkills();

  if (state.activeSkillId && !getSkillById(state.activeSkillId)) {
    state.activeSkillId = null;
    persistActiveSkill();
  }

  renderComposerChips();
  renderSkillPicker();
  renderManageView();
}

function clearSkillWithConfirm() {
  if (!state.activeSkillId) {
    showToast('Kein Skill aktiv.');
    return;
  }

  if (!confirm('Aktiven Skill wirklich deaktivieren?')) return;

  setSlotContextForSkill(state.activeSkillId, {});
  delete state.lastCollectBlockBySkillId[state.activeSkillId];
  state.activeSkillId = null;
  persistActiveSkill();
  renderComposerChips();
  renderSkillPicker();
}

function clearChatWithConfirm() {
  if (state.messages.length && !confirm('Chat wirklich leeren?')) return;

  if (state.activeSkillId) {
    setSlotContextForSkill(state.activeSkillId, {});
    delete state.lastCollectBlockBySkillId[state.activeSkillId];
  }

  state.messages = [];
  state.typing = false;
  state.draft = '';
  el.chatInput.value = '';
  autoGrowInput();
  renderComposerChips();
  renderChat();
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value || '');
    showToast('Kopiert.');
  } catch {
    showToast('Kopieren fehlgeschlagen.');
  }
}

async function sendMessage() {
  const content = state.draft.trim();
  if (!content || state.typing) return;

  const skill = getSkillById(state.activeSkillId);
  const outputMode = skill?.outputMode || 'text';
  const skillId = skill?.id || null;
  const slotProtocolActive = shouldUseSlotProtocol(skill);
  let slotContext = skillId ? getSlotContextForSkill(skillId) : {};
  let outgoingMessages = [];

  addMessage('user', content, { skillId });
  state.draft = '';
  el.chatInput.value = '';
  autoGrowInput();
  renderChat();
  renderComposerChips();

  if (slotProtocolActive && skillId) {
    const extracted = extractSlotsFromText(content, skill);
    slotContext = mergeSlotContext(slotContext, extracted);
    setSlotContextForSkill(skillId, slotContext);

    const missing = missingRequiredSlots(skill, slotContext);
    if (missing.length > 0 && requiredSlotCount(skill) > 1) {
      const collectBlock = formatCollectBlock(skill, missing);
      state.lastCollectBlockBySkillId[skillId] = collectBlock;
      addMessage('assistant', collectBlock, {
        outputMode: 'text',
        skillId,
        internalType: 'collect'
      });
      renderChat();
      renderComposerChips();
      return;
    }
  }

  const alias = resolveModelAliasForMessage(content, skill, outputMode);

  if (slotProtocolActive && skill) {
    const notes = extractNotesFromText(content, skill);
    const slotUserMessage = [formatSlotContextForModel(skill, slotContext), `NOTES:\n${notes || '-'}`].join('\n\n');
    outgoingMessages = [
      { role: 'system', content: composeSlotDeliverSystemMessage(skill, outputMode) },
      { role: 'user', content: slotUserMessage }
    ];
  } else {
    const systemMessage = composeSystemMessage(skill, outputMode);
    const historyWithoutCurrentUser = getConversationHistoryMessages().slice(0, -1);
    outgoingMessages = [
      { role: 'system', content: systemMessage },
      ...historyWithoutCurrentUser,
      { role: 'user', content }
    ];
  }

  state.typing = true;
  renderChat();
  renderComposerChips();

  const payload = {
    messages: outgoingMessages,
    model: alias,
    skillId,
    outputMode,
    text: content,
    webhookUrl: state.webhookUrl
  };

  try {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`Webhook failed (${response.status}): ${responseText || response.statusText}`);
    }

    if (state.profile === 'auto') {
      state.lastAutoAlias = alias;
    }

    const assistantText = responseText.trim() || '(Leere Antwort)';
    const isCollectFallback = slotProtocolActive && /^BEN(OE|O\u0308|O)TIGTE ANGABEN/i.test(assistantText.normalize('NFD'));
    if (isCollectFallback && skillId) {
      state.lastCollectBlockBySkillId[skillId] = assistantText;
    }

    addMessage('assistant', assistantText, {
      outputMode,
      skillId,
      internalType: isCollectFallback ? 'collect' : null
    });
  } catch (error) {
    const message = error?.message || 'Webhook-Fehler';
    showToast(message);
    addMessage('assistant', `Fehler: ${message}`, { outputMode: 'text', skillId: null });
  } finally {
    state.typing = false;
    renderProfileControl();
    renderChat();
    renderComposerChips();
  }
}

function bindEvents() {
  el.brandHome?.addEventListener('click', (event) => {
    event.preventDefault();
    clearChatWithConfirm();
  });

  el.themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    persistTheme();
  });

  el.menuToggle.addEventListener('click', () => {
    el.menuPanel.classList.toggle('hidden');
  });

  el.webhookUrl.addEventListener('change', () => {
    saveWebhookUrl(el.webhookUrl.value.trim());
  });

  el.clearChat.addEventListener('click', () => {
    clearChatWithConfirm();
    el.menuPanel.classList.add('hidden');
  });

  el.clearSkill.addEventListener('click', () => {
    clearSkillWithConfirm();
    el.menuPanel.classList.add('hidden');
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.menu-wrap')) {
      el.menuPanel.classList.add('hidden');
    }

    if (!event.target.closest('.profile-item')) {
      state.profileMenuOpen = null;
      renderProfileControl();
    }
  });

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openModal('picker');
      return;
    }

    if (event.key === 'Escape' && state.modalOpen) {
      closeModal();
    }
  });

  el.profileControl.addEventListener('click', (event) => {
    const option = event.target.closest('.profile-option');
    if (option) {
      const tier = option.dataset.profile;
      const alias = option.dataset.alias;
      state.selectedModelByTier[tier] = normalizeTierSelection(tier, alias);
      state.profile = tier;
      state.profileMenuOpen = null;
      persistSelectedModelByTier();
      renderProfileControl();
      renderComposerChips();
      return;
    }

    const trigger = event.target.closest('.profile-trigger');
    if (!trigger) return;

    const profile = trigger.dataset.profile;
    state.profile = profile;
    if (profile === 'auto') {
      state.profileMenuOpen = null;
    } else {
      state.profileMenuOpen = state.profileMenuOpen === profile ? null : profile;
    }

    renderProfileControl();
    renderComposerChips();
  });

  for (const item of el.profileControl.querySelectorAll(
    '.profile-item[data-profile="cheap"], .profile-item[data-profile="fast"], .profile-item[data-profile="best"]'
  )) {
    item.addEventListener('mouseenter', () => {
      if (window.matchMedia('(hover: hover)').matches) {
        state.profileMenuOpen = item.dataset.profile;
        renderProfileControl();
      }
    });
  }

  el.chatInput.addEventListener('input', () => {
    state.draft = el.chatInput.value;
    autoGrowInput();
  });

  el.chatInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  el.sendBtn.addEventListener('click', sendMessage);

  el.activeChips.addEventListener('click', (event) => {
    if (event.target.matches('[data-clear-skill-chip]')) {
      setActiveSkill(null);
    }
  });

  el.chatHistory.addEventListener('click', (event) => {
    const button = event.target.closest('[data-copy-text]');
    if (!button) return;
    copyText(button.dataset.copyText || '');
  });

  el.openSkills.addEventListener('click', () => {
    openModal('picker');
  });

  el.closeModal.addEventListener('click', closeModal);
  el.modal.addEventListener('click', (event) => {
    if (event.target === el.modal) closeModal();
  });

  el.skillSearch.addEventListener('input', () => {
    state.skillSearch = el.skillSearch.value;
    renderSkillPicker();
  });

  el.skillCategories.addEventListener('click', (event) => {
    const button = event.target.closest('[data-skill-category]');
    if (!button) return;
    state.skillCategory = button.dataset.skillCategory;
    renderSkillPicker();
  });

  el.skillList.addEventListener('click', (event) => {
    const card = event.target.closest('[data-skill-id]');
    if (!card) return;

    setActiveSkill(card.dataset.skillId);
    closeModal();
  });

  el.importSkillsPicker.addEventListener('click', () => {
    state.importSource = 'picker';
    el.importFile.click();
  });

  if (ENABLE_SKILL_EDITOR) {
    el.manageSkillsLink.classList.remove('hidden');

    el.manageSkillsLink.addEventListener('click', () => {
      state.modalView = 'manage';
      renderModalView();
    });

    el.backToPicker.addEventListener('click', () => {
      state.modalView = 'picker';
      renderModalView();
    });

    el.manageSearch.addEventListener('input', () => {
      state.manageSearch = el.manageSearch.value;
      renderManageView();
    });

    el.manageCategoryFilter.addEventListener('change', () => {
      state.manageCategory = el.manageCategoryFilter.value;
      renderManageView();
    });

    el.manageOutputFilter.addEventListener('change', () => {
      state.manageOutput = el.manageOutputFilter.value;
      renderManageView();
    });

    el.manageList.addEventListener('click', (event) => {
      const card = event.target.closest('[data-skill-id]');
      if (!card) return;
      state.manageSkillId = card.dataset.skillId;
      renderManageView();
    });

    el.newSkill.addEventListener('click', () => {
      state.manageSkillId = null;
      fillSkillEditor(null);
    });

    el.duplicateSkill.addEventListener('click', duplicateSkill);
    el.deleteSkill.addEventListener('click', deleteSkill);
    el.resetBuiltins.addEventListener('click', resetBuiltinSkills);
    el.exportSkills.addEventListener('click', exportSkills);

    el.importSkills.addEventListener('click', () => {
      state.importSource = 'manage';
      el.importFile.click();
    });

    el.validateSkillSlots?.addEventListener('click', () => {
      try {
        const slots = parseSlotsFromEditorInput(el.skillSlotsJson?.value || '');
        showToast(`Slots JSON ist gueltig (${slots.length}).`);
      } catch (error) {
        showToast(`Slots JSON ungueltig: ${error.message || 'Parse-Fehler'}`);
      }
    });

    el.skillForm.addEventListener('submit', (event) => {
      event.preventDefault();
      saveSkillFromEditor();
      showToast('Skill gespeichert.');
    });
  }

  el.importFile.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await importSkills(file);
      showToast('Skills importiert.');
    } catch (error) {
      showToast(`Import fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`);
    } finally {
      if (ENABLE_SKILL_EDITOR && state.importSource === 'manage') {
        state.modalView = 'manage';
        renderModalView();
      } else {
        state.modalView = 'picker';
        renderModalView();
      }

      event.target.value = '';
    }
  });
}

function init() {
  loadSkills();
  loadSlotContextBySkillId();
  pruneSlotContextByKnownSkills();
  loadActiveSkill();

  loadTheme();
  applyTheme();

  loadWebhookUrl();
  loadSelectedModelByTier();

  state.manageSkillId = state.skills[0]?.id || null;

  bindEvents();
  renderProfileControl();
  renderComposerChips();
  renderChat();
  renderSkillPicker();
  renderManageView();
  autoGrowInput();
}

init();
