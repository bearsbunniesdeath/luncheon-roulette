import { App, AuthorizeResult } from '@slack/bolt';
import { BlockButtonAction, ButtonAction } from '@slack/bolt/dist/types'
import { PollSession } from './models/PollSession';
import { PollSessionFactory, MockPollSessionFactory, LivePollSessionFactory } from './helpers/PollSessionFactory';
import { LivePollOptionFactory } from './helpers/PollOptionFactory';

import { Firestore } from '@google-cloud/firestore';
import { createClient } from '@google/maps'

const db = new Firestore({
    projectId: 'luncheon-roulette'
});

const mapClient = createClient({
    key: process.env.MAPS_API_KEY,
    Promise: Promise
})

const sessions : Map<string, PollSession> = new Map<string, PollSession>();

//TODO: Use DI
const sessionFactory : PollSessionFactory = new LivePollSessionFactory(new LivePollOptionFactory(mapClient));

const authorizeFn = async({teamId}) : Promise<AuthorizeResult> => {
    const teams = await db.collection('slackauth').get();

    for (let i = 0; i < teams.size; i++) {
        const teamData = teams.docs[0].data();
        if (teamData.teamId = teamId) {
            return {
                botId: teamData.botId,
                botUserId: teamData.botUserId,
                botToken: teamData.botToken,
                userToken: teamData.userToken
            } as AuthorizeResult
        }
    };
    
    throw new Error('No matching authorization');
}

const app = new App(
    {
        authorize: authorizeFn,
        signingSecret: process.env.LUNCHEON_ROULETTE_SIGNING_SECRET
    }
);

app.event("app_mention", async ({payload, body, context}) => {
    const id : string = body.team_id + payload.channel;  
    const session : PollSession = await sessionFactory.build(id, "The wheel has been spun!\n*Where should we go for lunch?*");   
    context;
    // Response types aren't strongly typed
    const messageResult: any = await app.client.chat.postMessage(
        {
            token: context.botToken,
            channel: payload.channel,
            text: "This text does not matter :/",
            as_user: true,
            blocks: session.render()
        }
    );

    if (messageResult.ok){
        sessions.set(messageResult.ts, session);
    }
});

app.action("vote_button", async ({ack, action, body, context}) => {
    ack();

    const button: BlockButtonAction = body as BlockButtonAction;
    const buttonAction: ButtonAction = action as ButtonAction;

    const session = sessions.get(button.message.ts);

    const profileResult: any = await app.client.users.profile.get({
        token: context.userToken,
        user: body.user.id  
    });

    if (profileResult.ok) {
        const profile = profileResult.profile;
        const option = session.getOption(buttonAction.block_id);

        option.addVote(profile.display_name, profile.image_24);

        app.client.chat.update(
            {
                token: context.botToken,
                channel: button.channel.id, 
                text: 'This text does not matter',
                ts: button.message.ts,          
                as_user: true,                         
                blocks: session.render()
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