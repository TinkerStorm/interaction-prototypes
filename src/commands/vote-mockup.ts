import { Client } from 'eris';
import { CommandContext, ComponentSelectOption, ComponentType, SlashCommand, SlashCreator } from 'slash-create';
import { wait } from '../util/common';
import { determineResult } from '../functions/ballot';
import { games } from '../util/game';

export default class VoteMockupCommand extends SlashCommand<Client> {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'vote-mockup',
      description: 'Vote mockup'
    });
  }

  async run(ctx: CommandContext) {
    if (!games.has(ctx.channelID)) {
      return 'No game found.';
    }

    const game = games.get(ctx.channelID);

    await ctx.send({
      content: `Vote mockup (0 / ${game.players.length})`,
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.SELECT,
              max_values: 1,
              custom_id: 'vote',
              placeholder: 'Select a player to put on trial',
              options: game.players
                .map<ComponentSelectOption>((player) => {
                  return {
                    label: player.nick || player.user.username,
                    value: player.id
                  };
                })
                .concat({
                  description: 'Abstain from voting',
                  label: 'None',
                  value: 'none'
                })
            }
          ]
        }
      ]
    });

    await ctx.fetch();

    const ballot = new Map<string, string>();

    ctx.registerComponent('vote', async (selectCtx) => {
      selectCtx.defer(true);
      console.log(selectCtx.values);
      if (selectCtx.values[0] === 'none') {
        if (ballot.has(selectCtx.user.id)) {
          ballot.delete(selectCtx.user.id);
          return selectCtx.send('Abstained from voting.', { ephemeral: true });
        } else {
          return selectCtx.send('You have not voted yet.', { ephemeral: true });
        }
      }

      if (game.players.findIndex((p) => p.id === selectCtx.user.id) === -1) {
        selectCtx.send('You are not in this game.', { ephemeral: true });
      }

      const currentVote = ballot.get(selectCtx.user.id);
      const newVote = selectCtx.values[0];

      if (currentVote === newVote) {
        await selectCtx.send('Unchanged.', { ephemeral: true });
        return;
      }

      ballot.set(selectCtx.user.id, newVote);
      await selectCtx.send(`You have voted for <@${newVote}>.`, { ephemeral: true });

      await selectCtx.editParent({
        content: `Vote mockup (${ballot.size} / ${game.players.length})`
      });
    });

    await wait(1000 * 20); // 20 seconds
    ctx.unregisterComponent('vote');

    // determine group of players who voted the same
    const [voteResult, voteCounts] = determineResult(ballot);
    let content: string;

    // known problem: if no votes are cast, an error is thrown when trying to send the resulting message
    // current solution: omit the embed if no votes are cast

    if (voteResult === null) {
      content = 'The vote was inconclusive.';
    } else if (Array.isArray(voteResult)) {
      const outcome = joinListTail(voteResult, {
        connector: ', ',
        tail: ' and ',
        injector: (user) => `<@${user}>`
      });

      content = `It was a split vote between ${outcome}.`;
    } else {
      content = `It was a unanimous vote for <@${voteResult}>.`;
    }

    await ctx.editOriginal({
      content,
      embeds:
        voteCounts.size === 0
          ? []
          : [
              {
                title: 'Vote Totals',
                fields: [
                  {
                    name: 'Player',
                    value: [...voteCounts.keys()].map((id) => `<@${id}>`).join('\n'),
                    inline: true
                  },
                  {
                    name: 'Votes',
                    value: [...voteCounts.values()].join('\n'),
                    inline: true
                  }
                ]
              }
            ],
      components: []
    });

    game.log.push({
      type: 'vote:result',
      context: {
        id: ctx.messageID,
        ballot: Object.fromEntries(ballot)
      }
    });
  }
}
