import { App } from '@slack/bolt';
import { BlockButtonAction, ButtonAction } from '@slack/bolt/dist/types'
import { PollSession } from './models/PollSession';
import { PollSessionFactory, MockPollSessionFactory, LivePollSessionFactory } from './helpers/PollSessionFactory';

import { createClient } from '@google/maps'
import { LivePollOptionFactory } from './helpers/PollOptionFactory';

const mapClient = createClient({
    key: process.env.MAPS_API_KEY,
    Promise: Promise
})

const sessions : Map<string, PollSession> = new Map<string, PollSession>();

//TODO: Use DI
const sessionFactory : PollSessionFactory = new LivePollSessionFactory(new LivePollOptionFactory(mapClient));

const app = new App(
    {
        token: process.env.LUNCH_BOT_TOKEN,
        signingSecret: process.env.LUNCHEON_ROULETTE_SIGNING_SECRET,
        botId: "lunchbot",
        botUserId: "lunchbot"
    }
);

app.event("app_mention", async ({payload, body}) => {
    const id : string = body.team_id + payload.channel;  
    const session : PollSession = await sessionFactory.build(id, "The wheel has been spun!\n*Where should we go for lunch?*");   

    // Response types aren't strongly typed
    const messageResult: any = await app.client.chat.postMessage(
        {
            "token": process.env.LUNCH_BOT_TOKEN,
            "channel": payload.channel,
            "text": "This text does not matter :/",
            "as_user": true,
            "blocks": session.render()
        }
    );

    if (messageResult.ok){
        sessions.set(messageResult.ts, session);
    }
});

app.action("vote_button", async ({ack, action, body}) => {
    ack();

    const button: BlockButtonAction = body as BlockButtonAction;
    const buttonAction: ButtonAction = action as ButtonAction;

    const session = sessions.get(button.message.ts);

    const profileResult: any = await app.client.users.profile.get({
        "token": process.env.LUNCH_USER_TOKEN,
        "user": body.user.id  
    });

    if (profileResult.ok) {
        const profile = profileResult.profile;
        const option = session.getOption(buttonAction.block_id);

        option.addVote(profile.display_name, profile.image_24);

        app.client.chat.update(
            {
                "token": process.env.LUNCH_BOT_TOKEN,
                "channel": button.channel.id, 
                "text": 'This text does not matter',
                "ts": button.message.ts,          
                "as_user": true,                         
                "blocks": session.render()
            }
        );
    }
});

app.error((error) => {
    console.error(error);
});

(async () => {
    // Start your app 
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running!');
})();