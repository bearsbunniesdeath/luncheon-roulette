import { RespondArguments, onlyOptions } from "@slack/bolt";
import { SectionBlock, DividerBlock, Block, ContextBlock } from "@slack/types";
import { PollOption } from "./PollOption";
import { Type } from "class-transformer";

export class PollSession {

    message : string;

    @Type(() => PollOption)
    options: Array<PollOption> = new Array<PollOption>();

    getOption(name: string) : PollOption {
        return this.options.find(o => o.name === name);
    }

    render(): Array<Block> {   
        const blocks : Array<Block> = [];

        blocks.push(this.buildMessageBlock());
        blocks.push(this.buildDividerBlock());
        blocks.push(...this.buildOptionsBlocks());

        return blocks;
    }

    private buildMessageBlock() : SectionBlock {
        return {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": this.message
            }
        } as SectionBlock;
    }

    private buildDividerBlock() : DividerBlock {
        return {
            "type": "divider"
        } as DividerBlock;
    }

    private buildOptionsBlocks() : Array<Block> {
        const blocks : Array<Block> = [];

        this.options.forEach(option => {
            const newBlocks: Array<Block> = this.buildOptionBlocks(option);
            blocks.push(...newBlocks);
        });

        return blocks;
    }

    private buildOptionBlocks(option: PollOption) : Array<Block> {       
        const restaurantBlock : SectionBlock = {
            "type": "section",
            "block_id": option.name,
            "text": {
                "type": "mrkdwn",
                "text": `*${option.name}*\n${option.description}.`
            },
            "accessory": {
                "type": "button",                   
                "text": {
                    "type": "plain_text",
                    "emoji": true,
                    "text": "Vote"
                },
                "action_id": "vote_button"
            }
        }

        if (option.votes.length > 0) {
            const votesBlock : ContextBlock = {
                type: "context",
                elements: []
            }

            option.votes.forEach((vote) => {
                votesBlock.elements.push({
                    type: 'image',
                    image_url: vote.image,
                    alt_text: vote.name
                })
            });

            return [restaurantBlock, votesBlock];
        }

        return [restaurantBlock];    

        // {
        //     "type": "image",
        //     "image_url": "https://api.slack.com/img/blocks/bkb_template_images/profile_1.png",
        //     "alt_text": "Michael Scott"
        // },
        // {
        //     "type": "image",
        //     "image_url": "https://api.slack.com/img/blocks/bkb_template_images/profile_2.png",
        //     "alt_text": "Dwight Schrute"
        // },
        // {
        //     "type": "image",
        //     "image_url": "https://api.slack.com/img/blocks/bkb_template_images/profile_3.png",
        //     "alt_text": "Pam Beasely"
        // },
        // {
        //     "type": "plain_text",
        //     "emoji": true,
        //     "text": "3 votes"
        // }
    }
}