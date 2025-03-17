# Privacy Practices

This document explains the permissions used by the AC Typing Extension and how they relate to your privacy.

## No Remote Code Usage

The AC Typing Extension does not use any remote code. All functionality is contained within the extension package itself. No code is downloaded from external sources during operation, ensuring complete transparency about the code running on your device.

## Permissions Explained

### Host Permissions (`<all_urls>`)

**Justification**: The extension needs host permissions to play typing sounds on any website you visit. This permission allows the sound effects to work across all websites consistently. Without this permission, the extension would not be able to detect your typing and play sounds on most websites.

**Privacy Note**: While this permission allows the extension to run on all websites, the extension does NOT:
- Track which websites you visit
- Collect any browsing history
- Record or transmit any data from websites

### ActiveTab Permission

**Justification**: The activeTab permission is required to inject the sound effect script only into the current tab you're actively using. This is a more privacy-friendly approach than requesting full access to all tabs. This permission only activates when you're interacting with the extension.

**Privacy Note**: The extension only uses this permission to enable sound effects in your current tab. It doesn't:
- Read content from your tabs
- Collect information about your browsing activity
- Access tab content for any purpose other than playing sounds when you type

### Scripting Permission

**Justification**: The scripting permission allows the extension to inject the necessary JavaScript code that listens for keyboard events and plays the appropriate sounds. Without this permission, the extension couldn't create the audio context needed to play sounds in response to your typing.

**Privacy Note**: The scripts injected by the extension only:
- Detect keyboard presses to trigger sounds
- Create an audio context to play the sound files
- They do NOT:
  - Record what you type
  - Send your keystrokes anywhere

### Storage Permission

**Justification**: The storage permission allows the extension to remember your preferences (like volume level and whether the sounds are enabled or disabled). Without this permission, your settings would reset every time you close the browser.

**Privacy Note**: The only data stored by the extension is:
- Your volume preference (a number between 0-100)
- Whether the extension is enabled (true/false)
- No personal information is ever stored

## Data Collection Policy

The AC Typing Extension does not collect, transmit, or share any user data whatsoever. All functionality is handled locally on your device, and no information is sent to external servers.

## Questions or Concerns

If you have any questions about these permissions or privacy practices, please open an issue in the GitHub repository.
