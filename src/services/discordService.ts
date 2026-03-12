export const sendDiscordMessage = async (webhookUrl: string, content: string, embeds?: any[]) => {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        embeds,
      }),
    });
  } catch (error) {
    console.error('Error sending discord message:', error);
  }
};

export const DISCORD_WEBHOOKS = {
  SCORES: import.meta.env.VITE_DISCORD_SCORES_WEBHOOK,
  REGISTRATION: import.meta.env.VITE_DISCORD_REGISTRATION_WEBHOOK,
  ACCOUNTS: import.meta.env.VITE_DISCORD_ACCOUNTS_WEBHOOK,
  STAFF: import.meta.env.VITE_DISCORD_STAFF_WEBHOOK,
};
