import "reflect-metadata";

import { App, AuthorizeResult, ExpressReceiver } from '@slack/bolt';
import { BlockButtonAction, ButtonAction } from '@slack/bolt/dist/types'
import { PollSession } from './models/PollSession';
import { PollSessionFactory, MockPollSessionFactory, LivePollSessionFactory } from './helpers/PollSessionFactory';
import { LivePollOptionFactory } from './helpers/PollOptionFactory';

import { Firestore } from '@google-cloud/firestore';
import { createClient } from '@google/maps'

import { classToPlain, plainToClass } from 'class-transformer';

const db = new Firestore({
    projectId: 'luncheon-roulette'
});

const mapClient = createClient({
    key: process.env.MAPS_API_KEY,
    Promise: Promise
});

//TODO: Use DI
const sessionFactory : PollSessionFactory = new LivePollSessionFactory(new LivePollOptionFactory(mapClient));

const expressReceiver = new ExpressReceiver({
    signingSecret: process.env.LUNCHEON_ROULETTE_SIGNING_SECRET
});

const expressApp = expressReceiver.app;

const authorizeFn = async({teamId}) : Promise<AuthorizeResult> => {
    const team = await db.collection('slackauth').where('teamId', '==', teamId).limit(1).get();

    const teamData = team.docs[0].data();

    return {
            botId: 'thisneedstobesomethingsoitshappy',
            botUserId: teamData.botUserId,
            botToken: teamData.botToken,
            userToken: teamData.userToken
    } as AuthorizeResult
}

const app = new App(
    {
        authorize: authorizeFn,
        receiver: expressReceiver
    }
);

let handlingTs = new Set<string>();

app.event("app_mention", async ({payload, context}) => {  
    // Prevent handling an event more than once
    if (handlingTs.has(payload.event_ts)) {
        return;
    }

    handlingTs.add(payload.event_ts);

    const session : PollSession = await sessionFactory.build("The wheel has been spun!\n*Where should we go for lunch?*");   
    
    // Response types aren't strongly typed
    const messageResult: any = await app.client.chat.postMessage(
        {
            token: context.botToken,
            channel: payload.channel,
            text: "The wheel has been spun!",
            as_user: true,
            blocks: session.render()
        }
    );

    if (messageResult.ok){
        const docRef = db.collection('pollsessions').doc(messageResult.ts);
        docRef.set(classToPlain(session));

        handlingTs.delete(payload.event_ts);
    }
});

app.action("vote_button", async ({ack, action, body, context}) => {
    ack();

    const button: BlockButtonAction = body as BlockButtonAction;
    const buttonAction: ButtonAction = action as ButtonAction;

    //const session = sessions.get(button.message.ts);
    const sessionRef = db.collection('pollsessions').doc(button.message.ts);

    const pollsession = await db.runTransaction(async t => {
        // Make sure not to change app state in this method!!!
        // Return info that you need instead
        // Otherwise there will be concurrency issues

        const doc = await t.get(sessionRef);

        if (!doc.exists) {
            return;
        }

        const session: PollSession = plainToClass(PollSession, doc.data());
        
        const profileResult: any = await app.client.users.profile.get({
            token: context.userToken,
            user: body.user.id  
        });

        if (profileResult.ok) {
            const profile = profileResult.profile;
            const option = session.getOption(buttonAction.block_id);
    
            // For some reason not all users have display names
            const voterName = profile.display_name ? profile.display_name : profile.real_name

            option.addVote(voterName, profile.image_24);

            t.update(sessionRef, classToPlain(session));

            return session;
        }
    });

    // This is the only part of the code that prevents me from being able
    // to run multiple servers because of a race condition
    if (pollsession) {
        app.client.chat.update(
            {
                token: context.botToken,
                channel: button.channel.id, 
                text: 'This text does not matter',
                ts: button.message.ts,          
                as_user: true,                         
                blocks: pollsession.render()
            }
        );
    }

});

app.error((error) => {
    console.error(error);
});

// OAuth workflow to install the app //////////////////////////

expressApp.get('/', (req, res) => {
    res.send('<h1>Luncheon Roulette</h1><a href="https://slack.com/oauth/authorize?client_id=76198394647.628689207987&scope=bot,chat:write:bot,users.profile:read"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x"></a>');
});

expressApp.get('/slack/auth/result', (req, res) => {
    if (req.query.success === 'true') {
        res.send('<h1>Success! Thanks you for installing Luncheon Roulette!</h1>');
    } else {
        res.send('<h1>Failure! Something when wrong when trying to install Luncheon Roulette!</h1>');
    }
});

expressApp.get('/slack/auth/redirect', async (req, res) => {
    try {
        const result = await app.client.oauth.access({
            code: req.query.code,
            client_id: process.env.LUNCHEON_ROULETTE_CLIENT_ID,
            client_secret: process.env.LUNCHEON_ROULETTE_CLIENT_SECRET
        });
    
        if (result.ok) {
            await db.collection('slackauth').add({
                teamId: result.team_id,
                botUserId: (result as any).bot.bot_user_id,
                botToken: (result as any).bot.bot_access_token,
                userToken: result.access_token
            });
    
            return res.redirect('/slack/auth/result?&success=true');
        }
    } catch (error) {
        res.redirect('/slack/auth/result?&success=false');
    }
});

///////////////////////////////////////////////////////////////

(async () => {
    // Start your app 
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running!');
})();