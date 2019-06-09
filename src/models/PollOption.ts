import { Vote } from "./Vote";
import { Type } from "class-transformer";

export class PollOption {

    readonly name: string;
    readonly description: string;

    @Type(() => Vote)
    readonly votes: Array<Vote> = new Array<Vote>();

    constructor(name: string, description: string) {
        this.name = name;
        this.description = description;
    }

    addVote(name: string, image: string) {
        this.votes.push(new Vote(name, image));
    }

}

