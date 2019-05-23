import { Vote } from "./Vote";

export class PollOption {

    readonly name: string;
    readonly description: string;

    readonly votes: Array<Vote> = new Array<Vote>();

    constructor(name: string, description: string) {
        this.name = name;
        this.description = description;
    }

    addVote(name: string, image: string) {
        this.votes.push(new Vote(name, image));
    }

}

