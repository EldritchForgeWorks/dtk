# update-checker Specification

## Purpose
TBD - created by archiving change dtk-hub. Update Purpose after archive.
## Requirements
### Requirement: Update check runs on ready hook, GM only

The hub SHALL perform an update check once per session during the Foundry `ready` hook.
The check SHALL only run for the GM user — non-GM players SHALL NOT trigger a fetch or
see any update notification. The check is non-blocking; the rest of `ready` processing
continues regardless of the check's outcome.

#### Scenario: GM triggers update check on session start

- **WHEN** a GM user loads a world with the hub installed
- **THEN** the hub fetches the registry (or uses cache) and compares versions during the `ready` hook

#### Scenario: Non-GM does not trigger update check

- **WHEN** a non-GM player loads the world
- **THEN** no registry fetch is initiated and no update notification appears

---

### Requirement: Version comparison logic

The hub SHALL compare the installed version of each active DTK module
(`game.modules.get(id).version`) against `latestVersion` in the registry entry.
A module is considered outdated if its installed version is strictly less than the
registry's `latestVersion` (semver comparison). The `dtk` hub module itself is
included in this comparison.

#### Scenario: Outdated module detected

- **WHEN** dtk-systema v0.2.0 is installed and the registry lists v0.3.1
- **THEN** dtk-systema is included in the outdated modules list

#### Scenario: Up-to-date module not flagged

- **WHEN** dtk-alea v1.0.0 is installed and the registry lists v1.0.0
- **THEN** dtk-alea is not included in the outdated modules list

#### Scenario: Module in registry but not installed is ignored

- **WHEN** the registry lists dtk-lex but dtk-lex is not an active Foundry module
- **THEN** dtk-lex is not flagged (not installed, not outdated)

---

### Requirement: Single consolidated notification

If one or more installed DTK modules are outdated, the hub SHALL display exactly one
Foundry UI notification per session using `ui.notifications.info(...)`. The
notification SHALL read: "DTK updates available for: {module names} — open the
installer to update." The notification SHALL include a clickable link or button that
opens the installer window.

If no modules are outdated, no notification is shown. The hub SHALL never show more
than one update notification per session regardless of how many modules are outdated.

#### Scenario: Single notification for multiple outdated modules

- **WHEN** dtk-systema and dtk-alea are both outdated
- **THEN** one notification lists both names — not two separate notifications

#### Scenario: No notification when all modules up to date

- **WHEN** all installed DTK modules match their registry versions
- **THEN** no update notification is displayed

#### Scenario: Notification links to installer window

- **WHEN** the GM clicks the update notification
- **THEN** the installer window opens

---

### Requirement: Update check respects registry cache

The update checker SHALL use the cached registry document if the remote fetch fails,
rather than silently skipping the check. If neither a fresh fetch nor a cache is
available, the update check is skipped entirely with a console debug log (no user-facing
message).

#### Scenario: Cached registry used on fetch failure

- **WHEN** the remote registry is unreachable and a cache exists
- **THEN** the update check proceeds using cached data and shows a notification if updates are available

#### Scenario: No check when no registry data available

- **WHEN** no cache exists and the remote fetch fails
- **THEN** no update notification is shown and no error is displayed to the user

