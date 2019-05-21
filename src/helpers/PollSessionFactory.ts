import { PollSession } from "../models/PollSession";
import * as faker from "faker";
import { PollOption } from "../models/PollOption";


export class MockPollSessionFactory implements PollSessionFactory {

    build(id: string, message: string, numberOfOptions: number = 3) : PollSession {
        const session: PollSession = new PollSession(id);
        session.message = message;    

        for (let index = 0; index < numberOfOptions; index++) {
            const optionName = faker.company.companyName();
            const optionDesc = faker.company.bs();

            const option = new PollOption(optionName, optionDesc);
            session.options.push(option); 
        }

        return session;
    }

}

export interface PollSessionFactory {

    build(id: string, message: string, numberOfOptions?: number) : PollSession

}