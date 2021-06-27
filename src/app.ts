import "reflect-metadata";

import { App } from '@slack/bolt';
import { BlockButtonAction, ButtonAction, AppMentionEvent, Context } from '@slack/bolt/dist/types'
import { PollSession } from './models/PollSession';
import { PollSessionFactory, LivePollSessionFactory } from './helpers/PollSessionFactory';
import { LivePollOptionFactory } from './helpers/PollOptionFactory';

import { Firestore } from '@google-cloud/firestore';

import { classToPlain, plainToClass } from 'class-transformer';

import stringArgv from 'string-argv';
import commandLineArgs = require('command-line-args');
import { KnownBlock, Block } from "@slack/types";
import { Client } from "@googlemaps/google-maps-services-js";

const db = new Firestore({
    projectId: 'luncheon-roulette'
});

const mapsClient = new Client({})

//TODO: Use DI
const sessionFactory : PollSessionFactory = new LivePollSessionFactory(new LivePollOptionFactory(mapsClient));

const app = new App(
    {
        clientId: process.env.SLACK_CLIENT_ID,
        clientSecret: process.env.SLACK_CLIENT_SECRET,
        token: process.env.SLACK_BOT_TOKEN,
        signingSecret: process.env.SLACK_SIGNING_SECRET,
        stateSecret: 'luncheon-bot-super-secret',
        scopes: ['app_mentions:read', 'chat:read', 'chat:write']
    }
);

app.event("app_mention", async ({payload, context}) => {  
    // Parse the verb first
    const text: string = payload.text.split(`<@${context.botUserId}>`).join('');
    let argv: string[] = stringArgv(text);
    const mainDefinitions: commandLineArgs.OptionDefinition[] = [
        {name: 'command', defaultOption: true}
    ];

    const mainOptions: commandLineArgs.CommandLineOptions = commandLineArgs(mainDefinitions, {argv, stopAtFirstUnknown: true});
    argv = mainOptions._unknown || [];

    if (!mainOptions.command) {
        postMessage('Beep boop, lunch bot is online!', payload.channel, context);
        return;
    }

    const verbDefinitions = optionMap.get(mainOptions.command);

    if (verbDefinitions === undefined) {
        postMessage(`Unknown command ${mainOptions.command}`, payload.channel, context);
        return;
    }

    //Parse the verb action
    const verbOptions = commandLineArgs(verbDefinitions, { argv });
    const verbAction = actionMap.get(mainOptions.command);

    await verbAction(verbOptions, payload, context);
});

app.action("vote_button", async ({ack, action, body, context}) => {
    await ack();

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

app.action("add_button", async ({ack, respond, action, body, context}) => {
    await ack();   
    const button: BlockButtonAction = body as BlockButtonAction;
    const buttonAction: ButtonAction = action as ButtonAction;
   
    const settingsRef = await db.collection('settings').doc(body.team.id);

    const placeToAdd = await db.runTransaction(async t => {   
        const settings = await t.get(settingsRef);

        if (!settings.exists) {
            return;
        }

        const settingsData = settings.data();

        settingsData.placesPool.push(buttonAction.value);

        t.update(settingsRef, settingsData); 
        
        return buttonAction.value
    });

    if (placeToAdd) {
        //Hacky way to delete the ephemeral message
        respond({
            text: undefined,
            delete_original: true        
        });
        
        //Post the added place to everybody
        const place = await mapsClient.placeDetails({
            params: {
                place_id: placeToAdd,
                key: process.env.MAPS_API_KEY
            }
        }); 
        postMessage(`Added ${place.data.result.name} to the pool.`, button.channel.id, context);        
    }
});

async function postMessage(message: string, channel: string, context: Context, blocks?: (KnownBlock | Block)[]): Promise<any> {
    const messageResult: any = await app.client.chat.postMessage(
        {
            token: context.botToken,
            channel,
            text: message,
            as_user: true,
            blocks: blocks
        }
    );

    return messageResult;
}

async function postEphemeral(user: string, message: string, channel: string, context: Context, blocks?: (KnownBlock | Block)[]): Promise<any> {
    const messageResult: any = await app.client.chat.postEphemeral(
        {
            user: user,
            token: context.botToken,
            channel,
            text: message,
            as_user: true,
            blocks: blocks
        }
    );

    return messageResult;
}

const optionMap: Map<string, commandLineArgs.OptionDefinition[]> = new Map([
    ['spin', []],
    ['add', [{name: 'location', defaultOption: true}]]
]);

const actionMap: Map<string, (args: commandLineArgs.CommandLineOptions, payload: AppMentionEvent, context: Context) => Promise<void>> = new Map([
    ['spin', handleSpin],
    ['add', handleAdd]
]);

async function handleSpin(args: commandLineArgs.CommandLineOptions, payload: AppMentionEvent, context: Context) {
    const session : PollSession = await sessionFactory.build("The wheel has been spun!\n*Where should we go for lunch?*", 4);   
    
    const messageResult: any = await postMessage('The wheel has been spun!', payload.channel, context, session.render());  

    if (messageResult.ok){
        const docRef = db.collection('pollsessions').doc(messageResult.ts);
        docRef.set(classToPlain(session));
    }
}

async function handleAdd(args: commandLineArgs.CommandLineOptions, payload: AppMentionEvent, context: Context) {
    const optionFactory = new LivePollOptionFactory(mapsClient);
    const options = await optionFactory.build(3, args.location);

    const blocks: Block[] = [].concat.apply([], options.map(o => {
        return o.renderAdd()
    }));

    postEphemeral(payload.user, 'Select a location to add', payload.channel, context, blocks);
}

(async () => {
    // Start your app 
    await app.start(Number(process.env.PORT) || 3000);
    console.log('⚡️ Bolt app is running!');
})();