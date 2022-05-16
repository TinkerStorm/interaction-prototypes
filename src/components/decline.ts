import { Client as ErisClient } from 'eris';
import { ComponentContext } from 'slash-create';

import { undi } from '../util/common';
import { games } from '../util/game';

export default async (ctx: ComponentContext, client: ErisClient) => {
  const game = games.get(ctx.channelID);

  if (!game) {
    ctx.send('I do not recognize this channel as a lobby channel.', { ephemeral: true });
    return;
  }

  if (game.host.id !== ctx.member.id) {
    ctx.send('You are not the host of this game.', { ephemeral: true });
    return;
  }

  const index = game.requests.findIndex((p) => p.id === ctx.message.embeds[0].footer.text);
  const [member] = game.requests.splice(index, 1);

  // send message to user
  try {
    await client.getDMChannel(member.id).then((channel) =>
      channel.createMessage({
        embeds: [
          {
            title: 'Game Request Declined',
            description: `Your request to join the game '${game.title} (\`${game.id}\`)' has been declined.`,
            color: game.color
          }
        ]
      })
    );
  } catch (err) {
    ctx.creator.emit(
      'debug',
      `Could not send message to ${undi(member.user)} on ${ctx.guildID}, continuing anyway.\n\t` +
        (err as Error).message
    );
  }

  await ctx.delete(ctx.message.id);
};
