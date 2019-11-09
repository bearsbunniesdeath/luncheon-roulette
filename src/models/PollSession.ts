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

        blocks.push(this.renderMessageBlock());
        blocks.push(this.renderDividerBlock());
        blocks.push(...this.renderOptionsBlocks());

        return blocks;
    }

    private renderMessageBlock() : SectionBlock {
        return {
            type: "section",
            text: {
                type: "mrkdwn",
                text: this.message
            }
        } as SectionBlock;
    }

    private renderDividerBlock() : DividerBlock {
        return {
            type: "divider"
        } as DividerBlock;
    }

    private renderOptionsBlocks() : Array<Block> {
        const blocks : Array<Block> = [];

        this.options.forEach(option => {
            const newBlocks: Array<Block> = option.renderVote();
            blocks.push(...newBlocks);
        });

        return blocks;
    }
}