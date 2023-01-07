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

    const start = Date.now();
    const duration = 1000 * 20;
    const ballot = new Map<string, string>();

    const getRemainingTime = () => `<t:${Math.round((start + duration) / 1000)}:R>`;

    const getBallotEmbed = () => ({
      title: `Vote for ${game.title}`,
      description: `Ballot closes ${getRemainingTime()}`,
      color: game.color,
      // stretch option?: scale the color based on the number of votes? or just use game color as is?
      footer: {
        text: `${ballot.size} of ${game.players.length} players have voted`
      }
    });

    await ctx.send({
      embeds: [getBallotEmbed()],
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
        timestamp: Date.now(),
        requestedBy: ctx.user.id
      }
    });

    ctx.registerComponent('vote', async (selectCtx) => {
      console.log(`Received vote with ${start + duration - Date.now()}ms remaining`);

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
              timestamp: Date.now(),
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

      const content = oldVote
        ? `You have changed your vote from <@${oldVote}> to <@${newVote}>.`
        : `You have voted for <@${newVote}>`;

      ballot.set(selectCtx.user.id, newVote);

      game.log.push({
        type: `vote:${oldVote ? 'change' : 'add'}`,
        context: {
          id: ctx.messageID,
          timestamp: Date.now(),
          user: ctx.user.id,
          newVote,
          ...(oldVote && { oldVote: oldVote })
        }
      });

      await selectCtx.send({ content, ephemeral: true });

      game.log.push({
        type: 'vote-success',
        context: {
          origin: selectCtx.user.id,
          oldVote: currentVote,
          newVote
        }
      });

      await selectCtx.editParent({
        embeds: [getBallotEmbed()]
      });
    });

    await wait(duration - 1000); // 20 seconds minus 1 second for the wait - idk why
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
            color: game.color,
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
        timestamp: Date.now(),
        ballot: Object.fromEntries(ballot)
      }
    });
  }
}
