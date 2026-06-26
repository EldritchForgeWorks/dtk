# installer-ui Specification

## Purpose
TBD - created by archiving change dtk-hub. Update Purpose after archive.
## Requirements
### Requirement: Installer window opens from hub settings

The hub SHALL register a GM-only button in its module settings that opens the installer
window. The button SHALL be labelled "Manage DTK Modules". The window SHALL only be
openable by a user with the GM role; calling the open API as a non-GM player SHALL
silently no-op.

#### Scenario: GM opens installer from settings

- **WHEN** a GM clicks "Manage DTK Modules" in the module settings panel
- **THEN** the installer ApplicationV2 window opens

#### Scenario: Non-GM cannot open installer

- **WHEN** a non-GM user calls the hub's installer open method
- **THEN** the window does not open and no error is thrown

---

### Requirement: Module list with free/premium sections

The installer window SHALL display the registry module list in two sections: "Free
Modules" and "Premium Modules". Each entry SHALL show: module name, current installed
version (or "Not installed"), available version from the registry, a tier badge
(`FREE` or `PREMIUM`), and a one-line description.

#### Scenario: Free and premium modules display in separate sections

- **WHEN** the registry contains both free and premium entries
- **THEN** the installer window renders two labelled sections, one per tier

#### Scenario: Installed version shown alongside available version

- **WHEN** `dtk-systema` v0.2.0 is installed and registry lists v0.3.1
- **THEN** the entry shows "0.2.0 installed / 0.3.1 available"

#### Scenario: Not installed module shows correct label

- **WHEN** a registry entry has no corresponding active Foundry module
- **THEN** the entry shows "Not installed" in place of an installed version

---

### Requirement: Install / Update action per module

Each module entry SHALL provide an action button. The button label SHALL be "Install"
for uninstalled modules and "Update" for modules where installed version < available
version. For up-to-date modules the button SHALL be disabled and labelled "Up to date".

Clicking the action button SHALL attempt to invoke Foundry's native module installer
with the module's `manifestUrl`. If the native installer API is not available on the
current Foundry version, the hub SHALL copy the `manifestUrl` to the clipboard and
show a Foundry UI notification: "Manifest URL copied — paste it into Foundry's Module
Manager to install."

#### Scenario: Install button triggers native installer or clipboard fallback

- **WHEN** a GM clicks "Install" on an uninstalled module entry
- **THEN** Foundry's native installer opens with the manifest URL pre-filled,
  OR the manifest URL is copied to the clipboard with a notification

#### Scenario: Up-to-date module button is disabled

- **WHEN** installed version equals available version for a module
- **THEN** the action button is disabled and reads "Up to date"

#### Scenario: Premium module links to purchase page

- **WHEN** a GM clicks "Install" on a premium module that is not installed
- **THEN** the hub opens the module's `changelogUrl` (used as purchase page) in a new browser tab instead of invoking the installer

---

### Requirement: Registry refresh button

The installer window SHALL include a "Refresh" button that re-fetches the remote
registry and re-renders the module list. While fetching, the button SHALL be disabled
and show a spinner. On failure, the window SHALL display the cached data with a
"Could not reach registry — showing cached data from {fetchedAt}" notice.

#### Scenario: Refresh updates module list

- **WHEN** a GM clicks "Refresh" and the fetch succeeds
- **THEN** the module list re-renders with the newly fetched data

#### Scenario: Refresh failure shows cached data

- **WHEN** a GM clicks "Refresh" and the fetch fails
- **THEN** the module list shows cached data with a staleness notice

---

### Requirement: ApplicationV2 implementation

The installer window SHALL be implemented as an `ApplicationV2` class with
`HandlebarsApplicationMixin`. It SHALL use a Handlebars template at
`templates/installer.hbs`. It SHALL NOT use JQuery, legacy Application, or
`renderTemplate`. The window SHALL be closable via the standard ApplicationV2 close
button.

#### Scenario: Window renders without Foundry v11 API

- **WHEN** the installer window opens on Foundry v12–v14
- **THEN** it renders using only ApplicationV2 APIs with no JQuery dependency

