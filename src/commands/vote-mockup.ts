import { Client } from 'eris';
import { CommandContext, ComponentSelectOption, ComponentType, SlashCommand, SlashCreator } from 'slash-create';
import { joinListTail, wait } from '../util/common';
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
              min_values: 0,
              max_values: 1,
              custom_id: 'vote',
              placeholder: 'Select a player to put on trial',
              options: game.players.map<ComponentSelectOption>((player) => ({
                label: player.nick || player.user.username,
                value: player.id
              }))
            }
          ]
        }
      ]
    });

    await ctx.fetch();

    game.log.push({
      type: 'vote:begin',
      context: {
        id: ctx.messageID,
        requestedBy: ctx.user.id
      }
    });

    const ballot = new Map<string, string>();

    ctx.registerComponent('vote', async (selectCtx) => {
      const { user, values } = selectCtx;

      if (game.players.findIndex((p) => p.id === user.id) === -1) {
        await selectCtx.send('You are not in this game.', { ephemeral: true });
        return;
      }

      const oldVote = ballot.get(user.id);
      const [newVote] = values;

      if (!newVote) {
        if (oldVote) {
          ballot.delete(selectCtx.user.id);
          game.log.push({
            type: 'vote:withdraw',
            context: {
              id: ctx.messageID,
              user: user.id,
              oldVote
            }
          });
        }

        const content = !oldVote ? 'Abstained from voting.' : 'You have not voted yet.';
        await selectCtx.send({ content, ephemeral: true });

        return;
      }

      if (oldVote === newVote) {
        await selectCtx.send('Unchanged.', { ephemeral: true });
        return;
      }

      ballot.set(selectCtx.user.id, newVote);

      game.log.push({
        type: `vote:${oldVote ? 'change' : 'add'}`,
        context: {
          id: ctx.messageID,
          user: ctx.user.id,
          newVote,
          ...(oldVote && { oldVote: oldVote })
        }
      });

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
      components: [],
      ...(voteCounts.size === 0 && {
        embeds: [
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
        ]
      })
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
