# Temporary Voice Channel Bot for Discord

A Discord bot that creates temporary voice channels (VCs) when users join a base VC, with text channel controls for locking, unlocking, and whitelisting users.
This bot was made exclusively for a private server but can be used and modified to fit necessities of other servers.

## Features

- **Automatic temporary voice channels**: When a user joins the base VC, a new temporary VC is created just for them.  
- **Text channel controls**: Sends a panel in the associated text channel with buttons to:
  - Lock the VC  
  - Unlock the VC  
  - Manage a whitelist of users who can join  
- **Whitelist management**: Only allowed users can join the VC.  
- **Automatic cleanup**: Temporary VCs and their associated text channels are deleted when empty.  

## Setup

1. **Clone the repository**:

```bash
git clone https://github.com/yourusername/discord-temp-vc-bot.git
cd discord-temp-vc-bot
```
Install dependencies:
```bash
npm install
```
Create a .env file with your bot token:

```env
BOT_TOKEN=your_discord_bot_token_here
```
Run the bot:

```bash
node index.js
```
Commands
/setupbase categoria:<category>
Creates the base VC where temporary channels will be generated.

Permissions
The bot needs the following permissions in the server:

Manage Channels

Move Members

Connect

View Channels

Send Messages (in text channels)

Optional: Administrator permission to simplify permission handling.

How it works
User joins the base VC.

Bot creates a temporary VC with the user's display name.

Bot sends a control panel in the text channel associated with the VC.

User can lock/unlock the VC or whitelist other users.

When the VC becomes empty, the bot deletes the VC and text channel.
