# Projektbericht: openLunaris – Skill-basierter LLM Hub mit Kosten-/Routing-Kontrolle und optionaler Automatisierung

## 1. Kurzüberblick
Im Projekt **openLunaris** wurde ein Chat-first Web-Interface entwickelt, das mehrere große Sprachmodelle über eine einheitliche Schnittstelle bündelt und dabei gezielt Kosten reduziert. Nutzer wählen je nach Aufgabe ein Profil (Cheap/Fast/Best/Auto) und optional einen “Skill” (z. B. E-Mail, Lead-Anfrage, Ticket), wodurch das Modell kontextstabil und strukturiert antwortet. Als Ausführungs-/Integrationsschicht kann **n8n** angebunden werden, um Ergebnisse automatisiert in Systeme wie **Slack** oder **Microsoft Teams** zu posten.

Die Modell-Anbindung und Kostenkontrolle erfolgen über **LiteLLM** als OpenAI-kompatibles Gateway, das Anfragen an **OpenRouter** weiterleitet (mehrere Modelle über eine einheitliche API) und dabei Logging/Caching unterstützt.

<img width="1295" height="1234" alt="grafik" src="https://github.com/user-attachments/assets/359976d0-fc2a-4428-bc5a-7d1dbd0fbc17" />


This repo contains Step 1 infra for:
- LiteLLM proxy (`http://localhost:4000`)
- Redis cache
- Postgres (for LiteLLM UI/keys)
- n8n (`http://localhost:5678`)

## Structure

```text
infra/
  docker-compose.yml
  litellm/
    config.yaml
    .env.example
n8n/
  workflows/
```

## Quick Start

1. Copy env file:

```bash
cp infra/litellm/.env.example infra/.env
```

2. Edit `infra/.env` and set `OPENROUTER_API_KEY` (required).

3. Start services:

```bash
cd infra
docker compose up -d
```

---

## 2. Problemstellung und Motivation
Viele Anwender wechseln für unterschiedliche Aufgaben zwischen mehreren LLM-UIs (verschiedene Provider, unterschiedliche Modellstärken, separate Abrechnungen). Gleichzeitig entstehen in der Praxis zwei typische Pain Points:

1) **Kosten/Token-Verbrauch**: unnötig lange Prompt-Dialoge, Wiederholungen ohne Cache, falsche Modellwahl (zu stark für triviale Aufgaben).  
2) **Produktivität/Standardisierung**: wiederkehrende Aufgaben (E-Mails, Lead-Anfragen, Tickets) werden inkonsistent gelöst; Outputs sind nicht zuverlässig strukturiert.

Ziel war daher ein zentraler LLM-Hub, der (a) einfache Nutzung ermöglicht, (b) Output-Qualität über Skills stabilisiert und (c) Kosten durch Routing, Caching und “Ask-Once” reduziert.

---

## 3. Ziele (Requirements)
### Funktional
- Chat-UI als primäre Interaktion (wie ein Messenger).
- Modellprofile: Cheap/Fast/Best/Auto, inkl. Anzeige des tatsächlich genutzten Modells.
- Skills (statt klassischer Prompt-Templates) für wiederkehrende Aufgaben.
- Strukturierte Ausgabe für bestimmte Skills (E-Mail-Karte mit Betreff/Text, JSON strikt validiert).
- Optional: Integration in Automationen (z. B. Slack/Teams Posting) über n8n.

### Nicht-funktional
- Token-Effizienz (minimierte System-/History-Tokens).
- Robustheit (keine “leeren Antworten”, klare Fehlerfälle).
- Self-hostbar (Docker Compose), perspektivisch auch als SaaS betreibbar.
- Trennung von Nutzer-UX und Admin-/Power-Features (Skill-Editor nicht im Weg).

---

## 4. Systemarchitektur
### 4.1 Komponenten
- **Web-UI (openLunaris)**: Chat, Skill-Picker, Profil-Auswahl, Dark Mode, Ergebnis-Cards.
- **Gateway / LLM-Proxy**: LiteLLM als OpenAI-kompatible API.
- **Provider-Aggregator**: OpenRouter für Zugriff auf verschiedene Modelle (z. B. günstige OSS-Modelle und starke Premium-Modelle).
- **Persistenz / Infrastruktur**: Redis (Caching), Postgres (Keys/Logs), Docker Compose.
- **Optionaler Orchestrator**: n8n für externe Aktionen (Slack/Teams/etc.).

<img width="2541" height="1230" alt="grafik" src="https://github.com/user-attachments/assets/c20187a8-f0d3-4be1-a16f-11e35c256c23" />

### 4.2 Datenfluss (ohne n8n)
UI → LiteLLM (OpenAI-API) → OpenRouter → Modell → Antwort → UI

### 4.3 Datenfluss (mit n8n als Action-Layer)
UI → n8n Webhook → LiteLLM → OpenRouter → Antwort → n8n (Mapping/Action) → Slack/Teams/… (+ optional Rückmeldung zur UI)

> Hinweis: n8n ist **optional**. Im Kernprodukt ist openLunaris auch ohne Workflows nutzbar; n8n erweitert es um “Do-it”-Automationen.

---

## 5. Kernfeatures im Detail
### 5.1 Modellprofile: Cheap / Fast / Best / Auto
- **Cheap**: ultrakostengünstige Modelle für einfache Aufgaben (z. B. kurze Texte, einfache Umformulierung).
- **Fast**: schnelle, gute Modelle für Standardaufgaben.
- **Best**: hochwertige Modelle für komplexe Texte/Analysen/JSON-Strenge.
- **Auto**: heuristische/regelbasierte Auswahl (z. B. JSON → Best; Kurzaufgabe → Cheap; sonst Fast; optional später echte Router-Logik).

In der UI wird beim Hover bzw. im Label der exakte Modellname angezeigt (“Zuletzt genutzt: …”), um Transparenz zu schaffen.

### 5.2 Skills statt Templates: “Agent-Modus”
Anstelle statischer Text-Templates wurde ein Skill-Modell etabliert.  
Ein Skill definiert **Rolle + Aufgabe + Output-Format + Regeln**, z. B.:

- “E-Mail: IT Support Termin” (Service Desk Agent, Betreff/Text, keine erfundenen Daten)
- “Lead-Anfrage generieren” (fragt notwendige Infos ab, erstellt Betreff/Body)
- “Support-Ticket” (Titel, Priorität, Steps, Expected/Actual, Environment, Next Steps)
- “JSON Extraktion” (strict JSON only)

Damit wird die Identität/Absicht des Modells wesentlich stabiler als bei freien Prompts.

<img width="1106" height="1231" alt="grafik" src="https://github.com/user-attachments/assets/3e535ce7-2874-4e3f-b59a-b9c55e1d5dd5" />

### 5.3 Skill Protocol v2: Slot-basiertes “Ask-Once”
Um Token-Ping-Pong zu vermeiden, wurde ein zweiphasiger Ablauf umgesetzt:

**COLLECT** (ohne LLM-Call oder mit minimalem LLM-Call – je nach Implementierung):  
- Wenn Pflichtinfos fehlen, wird **ein kompakter Block** ausgegeben, den der Nutzer in **einer** Nachricht ausfüllt.

**DELIVER** (einmaliger LLM-Call):  
- Sobald Slots vollständig sind, wird die Ausgabe in einem **strikten Skeleton** erzeugt.
- Regel: **Keine Erfindungen**; nur Slot-Daten verwenden.

Vorteile:
- deutlich weniger Tokens,
- weniger Halluzinationen,
- zuverlässig gleichförmiger Output (E-Mail sieht immer wie E-Mail aus).

### 5.4 Output-Rendering als “Cards”
Bestimmte Skills werden UI-seitig strukturiert dargestellt:
- **E-Mail-Card**: Betreff + Body + separate Copy-Buttons
- **Ticket-Card**: Sektionen + Copy
- **JSON-Mode**: JSON.parse-Validierung, Fehleranzeige bei invalidem JSON

Das steigert Nutzbarkeit und reduziert Copy/Paste-Fehler.

### 5.5 Caching / Kostenreduktion
Über LiteLLM/Redis wurde Caching aktiviert. In Logs zeigte sich der Unterschied:
- normaler Call: Kosten > 0
- **cache_hit=true**: Antwort aus Cache (Kosten nahe 0), deutlich schneller

Das ist besonders wertvoll bei wiederkehrenden Skills.

---

## 6. Betrieb & Deployment
- Container-Stack via Docker Compose:
  - LiteLLM Proxy (Port 4000)
  - Redis Cache
  - Postgres (Keys/Logs)
  - optional n8n (Port 5678)
- Konfiguration über `.env`:
  - OpenRouter API Key
  - LiteLLM Master Key / Salt
  - DB Credentials

Die Lösung ist damit als **Self-hosted** MVP lauffähig; perspektivisch lässt sich daraus eine SaaS machen (mit Auth, Mandantenfähigkeit, Abrechnung).

---

## 7. Sicherheit, Governance, Produktreife
### Aktuell gelöst
- API Keys serverseitig/infra-seitig, nicht im Client hardcoden.
- Zentrale Steuerung über Gateway (LiteLLM).

### Empfohlen als nächste Schritte
- Auth/Accounts + Workspaces (Mandantenfähigkeit).
- RBAC (wer darf Skills erstellen/ändern).
- Spending Caps / Rate Limits pro Workspace.
- Optional: “Content Logging” minimieren (Datenschutz) + Audit-Events ohne Prompt-Inhalte.

---

## 8. Ergebnisbewertung
Das MVP zeigt:
- Chat-UX funktioniert stabil, Skills verbessern Struktur.
- Slot-basiertes Ask-Once reduziert Nachfragen und Tokens.
- Modellprofile schaffen klare Nutzerführung (Billig vs. Schnell vs. Stark).
- Caching macht Wiederholungen praktisch kostenlos.
- n8n kann als Action-Layer externe Tools bedienen (Slack/Teams), ist aber nicht zwingend.

---

## 9. Roadmap (empfohlen)
1) **Direct Mode als Standard** (ohne n8n Pflicht): UI → Backend → LiteLLM → OpenRouter  
2) **Workspaces + Login** (SaaS-fähig)  
3) **Skill Packs** (Support, Sales, HR, IT)  
4) **Auto Router v2** (heuristisch + später lernbasiert)  
5) **Integrationen**: n8n/MCP/Webhooks als optionales “Connectors”-Modul  
6) **Billing/Quotas**: pro User/Team, plus Usage

---

## 10. Fazit
Mit openLunaris wurde ein funktionsfähiger Prototyp eines “LLM Workspace” entwickelt, der mehrere Modelle bündelt, Kosten durch Profil-Routing und Caching senkt und durch Skills/Slot-Protokolle konsistente Outputs erzeugt. n8n ist ein starker optionaler Baustein für Automationen (“Do-it”), aber das Kernprodukt funktioniert auch ohne Workflow-Engine und ist als Self-hosted oder SaaS grundsätzlich ausbaubar.
