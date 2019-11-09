import { PollSession } from "../models/PollSession";
import * as faker from "faker";
import { PollOption } from "../models/PollOption";
import { GoogleMapsClient } from "@google/maps";
import { PollOptionFactory } from "./PollOptionFactory";


export class MockPollSessionFactory implements PollSessionFactory {

    build(message: string, numberOfOptions: number = 3) : Promise<PollSession> {
        const session: PollSession = new PollSession();
        session.message = message;    

        for (let index = 0; index < numberOfOptions; index++) {
            const optionplaceId = faker.random.uuid();
            const optionName = faker.company.companyName();
            const optionDesc = faker.company.bs();

            const option = new PollOption(optionplaceId, optionName, optionDesc);
            session.options.push(option); 
        }

        return new Promise(() => session);
    }

}

export class LivePollSessionFactory implements PollSessionFactory {
    
    private optionFactory: PollOptionFactory;

    constructor(optionsFactory: PollOptionFactory) {
        this.optionFactory = optionsFactory;
    }
    
    async build(message: string, numberOfOptions: number = 3) : Promise<PollSession> {
        const session: PollSession = new PollSession();
        session.message = message;    

        const options = await this.optionFactory.build(numberOfOptions);

        session.options.push(...options);

        return session;
    }
}

export interface PollSessionFactory {

    build(message: string, numberOfOptions?: number) : Promise<PollSession>

}