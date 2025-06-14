# If I'm Gone Browser Extension

A secure browser extension for password management that integrates with the If I'm Gone digital legacy system.

## Features

- 🔐 **Secure Password Storage**: All passwords are encrypted and stored in your personal vault
- 🚀 **Auto-fill**: Automatically fill login forms with saved credentials
- 🎲 **Password Generator**: Generate strong, unique passwords
- 💾 **Auto-save**: Capture and save new passwords as you create accounts
- 🔄 **Sync**: Seamless synchronization with your If I'm Gone dashboard
- 🛡️ **Zero-knowledge**: Your master password never leaves your device

## Installation

### Development Mode

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `browser-extension` directory from this project
5. The extension icon should appear in your browser toolbar

### Firefox

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from the `browser-extension` directory

## Usage

### First Time Setup

1. Click the extension icon in your browser toolbar
2. Enter your If I'm Gone master password
3. The extension will connect to your local vault

### Saving Passwords

- **Automatic**: When you log into a website, the extension will offer to save your password
- **Manual**: Click the extension icon and select "Save Password"
- **From Password Field**: Click the If I'm Gone icon in any password field and select "Save Password"

### Filling Passwords

- **Auto-fill**: Click the If I'm Gone icon in a password field and select "Fill Password"
- **Keyboard Shortcut**: Press `Ctrl+Shift+L` (or `Cmd+Shift+L` on Mac)
- **From Popup**: Click the extension icon and select a password to fill

### Generating Passwords

- **From Password Field**: Click the If I'm Gone icon and select "Generate Password"
- **From Popup**: Click "Generate Password" in the extension popup
- **Keyboard Shortcut**: Press `Ctrl+Shift+G` (or `Cmd+Shift+G` on Mac)

## Security

- Passwords are encrypted using your master password
- The extension communicates only with your local If I'm Gone instance
- No data is sent to external servers
- Auto-lock after 15 minutes of inactivity (configurable)

## Development

### Project Structure

```
browser-extension/
├── manifest.json          # Extension manifest (v3)
├── src/
│   ├── background/       # Service worker scripts
│   ├── content/          # Content scripts for web pages
│   ├── popup/            # Extension popup UI
│   └── common/           # Shared utilities
└── assets/
    └── icons/            # Extension icons
```

### Building for Production

1. Install dependencies:
   ```bash
   cd browser-extension
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. The built extension will be in the `dist` directory

### Testing

1. Load the extension in development mode
2. Visit a website with a login form
3. Test password detection, saving, and filling
4. Check the browser console for any errors

## Permissions

The extension requires the following permissions:

- **storage**: To save extension settings
- **tabs**: To detect the current website
- **activeTab**: To interact with password fields
- **contextMenus**: To add right-click menu options
- **notifications**: To show save/update notifications

## Troubleshooting

### Extension won't connect

1. Ensure the If I'm Gone app is running locally
2. Check that the app is accessible at `http://localhost:3001`
3. Try reloading the extension

### Passwords not filling

1. Some websites block auto-fill for security
2. Try using the keyboard shortcut instead
3. Check if the website URL matches the saved password

### Can't save passwords

1. Ensure you're logged into the extension
2. Check that the password field is detected (look for the icon)
3. Try saving manually from the popup

## Privacy

- All data stays on your device
- No analytics or tracking
- No external API calls
- Open source for transparency

## License

Part of the If I'm Gone project. See main project license.