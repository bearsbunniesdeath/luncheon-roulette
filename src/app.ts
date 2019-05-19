'use strict';
import * as SlackBolt from '@slack/bolt';

const app = new SlackBolt.App(
    {
        token: process.env.LUNCH_BOT_TOKEN,
        signingSecret: process.env.LUNCHEON_ROULETTE_SIGNING_SECRET
    }
);

(async () => {
    // Start your app
    await app.start(process.env.PORT || 3000);

    console.log('⚡️ Bolt app is running!');
})();