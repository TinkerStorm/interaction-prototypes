import { Client as ErisClient } from 'eris';
import { ButtonStyle, ComponentContext, ComponentType, MessageOptions } from 'slash-create';

import { lobbyChannels, games, buildPost } from '../util/game';
import { ComponentKeys } from './index';

export default async (ctx: ComponentContext, client: ErisClient) => {
  const { channelID, gamePromptID } = lobbyChannels.get(ctx.guildID);

  // ensure interaction is from the lobby channel
  if (ctx.channelID !== channelID) {
    ctx.send('Unknown interaction origin...');
    return;
  }

  await ctx.acknowledge();

  const reply = (options: MessageOptions | string) => {
    if (typeof options === 'string') {
      options = { content: options };
    }

    ctx.send({ ...options, ephemeral: true });
  };

  const game = games.get(ctx.message.embeds[0].footer.text);

  if (!game) {
    return;
  }

  const index = game.players.findIndex((p) => p.id === ctx.member.id);

  if (index === 0) {
    return reply('You cannot leave the game as host.');
  }

  game.players.splice(index, 1);

  await ctx.edit(ctx.message.id, buildPost<MessageOptions>(game));

  reply('You have left the game.');

  await client.deleteChannelPermission(game.id, ctx.member.id, 'Leaving game lobby');

  await client.createMessage(game.id, {
    embeds: [
      {
        title: `${ctx.member.mention} has left the game.`,
        thumbnail: {
          url: ctx.member.avatarURL
        },
        color: game.color
      }
    ]
  });

  if (game.players.length <= 1) {
    await client.editMessage(ctx.channelID, gamePromptID, {
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.BUTTON,
              label: 'New Game',
              custom_id: ComponentKeys.NEW_GAME,
              style: ButtonStyle.PRIMARY,
              emoji: {
                name: '🎮'
              },
              disabled: true
            }
          ]
        }
      ]
    });
  }
};
