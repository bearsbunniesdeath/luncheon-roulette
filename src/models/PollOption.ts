import { Vote } from "./Vote";
import { Type } from "class-transformer";
import { SectionBlock, Block, ContextBlock } from "@slack/types";
import uuid = require("uuid");

export class PollOption {

    readonly placeId: string;
    readonly name: string;
    readonly description: string;

    @Type(() => Vote)
    readonly votes: Array<Vote> = new Array<Vote>();

    constructor(placeId: string, name: string, description: string) {
        this.placeId = placeId;
        this.name = name;
        this.description = description;
    }

    addVote(name: string, image: string) {
        this.votes.push(new Vote(name, image));
    }

    renderAdd(): Array<Block> {
        const restaurantBlock : SectionBlock = {
            type: "section",
            block_id: uuid(),
            text: {
                type: "mrkdwn",
                text: `*${this.name}*\n${this.description}.`
            },
            accessory: {
                type: "button",                   
                text: {
                    type: "plain_text",
                    emoji: true,
                    text: 'Add'
                },
                action_id: 'add_button',
                value: this.placeId
            }
        }

        return [restaurantBlock];
    }

    renderVote() : Array<Block> {       
        const restaurantBlock : SectionBlock = {
            type: "section",
            block_id: uuid(),
            text: {
                type: "mrkdwn",
                text: `*${this.name}*\n${this.description}.`
            },
            accessory: {
                type: "button",                   
                text: {
                    type: "plain_text",
                    emoji: true,
                    text: "Vote"
                },
                action_id: "vote_button"
            }
        }

        if (this.votes.length > 0) {
            const votesBlock : ContextBlock = {
                type: "context",
                elements: []
            }

            this.votes.forEach((vote) => {
                votesBlock.elements.push({
                    type: 'image',
                    image_url: vote.image,
                    alt_text: vote.name
                })
            });

            return [restaurantBlock, votesBlock];
        }

        return [restaurantBlock];    
    }

}

