import { App, directMention } from '@slack/bolt';
import { RespondArguments, Middleware, BlockButtonAction, BlockElementAction } from '@slack/bolt/dist/types'
import { SectionBlock } from '@slack/types';
import { PollSession } from './models/PollSession';
import { PollSessionFactory, MockPollSessionFactory } from './helpers/PollSessionFactory';
import { response } from 'express';

const sessions : Map<string, PollSession> = new Map<string, PollSession>();

//TODO: Use DI
const sessionFactory : PollSessionFactory = new MockPollSessionFactory();

const app = new App(
    {
        token: process.env.LUNCH_BOT_TOKEN,
        signingSecret: process.env.LUNCHEON_ROULETTE_SIGNING_SECRET,
        botId: "lunchbot",
        botUserId: "lunchbot"
    }
);

app.event("app_mention", async ({payload, event, message, body, say}) => {
    const id : string = body.team_id + payload.channel;  
    const session : PollSession = sessionFactory.build(id, "The wheel has been spun!");   

    // Response types aren't strongly typed
    const messageResult: any = await app.client.chat.postMessage(
        {
            "token": process.env.LUNCH_BOT_TOKEN,
            "channel": payload.channel,
            "text": "The wheel has been spun!",
            "as_user": true,
            "blocks": session.render()
        }
    );

    if (messageResult.ok){
        sessions.set(messageResult.ts, session);
    }
});

// app.action("vote_button", async ({ack, action, payload, respond, body, say, context}) => {
//     ack();
//     // let button: BlockButtonAction = body as BlockButtonAction
//     action;
//     payload;
//     context;
//     body;

//     const messageResult: any = await app.client.users.profile.get({
//         "token": process.env.LUNCH_USER_TOKEN,
//         "user": body.user.id  
//     })

//     if (messageResult.ok) {

//     }

    // let wheel: RespondArguments = sessions.get(body.team.id + body.channel.id);
    // wheel.blocks[0] =  
    //     {
    //         "type": "section",
    //         "text": {
    //             "type": "mrkdwn",
    //             "text": "The poll has been updated!"
    //         }
    //     }
    // wheel.replace_original = true;
    // await app.client.chat.update(
    //     {
    //         "token": process.env.LUNCH_BOT_TOKEN,
    //         "channel": button.channel.id, 
    //         "text": wheel.text,
    //         "ts": button.message.ts,          
    //         "as_user": true,                         
    //         "blocks": wheel.blocks
    //     }
    // )
// });

app.error((error) => {
    console.error(error);
});

(async () => {
    // Start your app
    try{
        await app.start(process.env.PORT || 3000);
    }
    catch (ex) {
        console.error(ex);
    }
    console.log('⚡️ Bolt app is running!');
})();