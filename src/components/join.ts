import { Client as ErisClient } from 'eris';
import { ButtonStyle, ComponentContext, ComponentType, MessageOptions, Permissions } from 'slash-create';
import { lobbyChannels, games, buildPost } from '../util/game';

export default async (ctx: ComponentContext, client: ErisClient) => {
  const { channelID, gamePromptID } = lobbyChannels.get(ctx.guildID);

  const reply = (options: MessageOptions | string) => {
    if (typeof options === 'string') {
      options = { content: options };
    }

    ctx.send({ ...options, ephemeral: true });
  };

  // ensure interaction is from the lobby channel
  if (ctx.channelID !== channelID) {
    reply('Unknown interaction origin.');
    return;
  }

  const game = games.get(ctx.message.embeds[0].footer.text);

  if (!game) {
    return reply('I do not recognize this channel as a lobby channel.');
  }

  if (game.players.some((p) => p.id === ctx.member.id)) {
    return reply('You are already in the game lobby.');
  }

  if (game.requests.some((r) => r.id === ctx.member.id)) {
    return reply('You have already requested to join this game.');
  }

  if (game.players.length >= 15) {
    return reply('The game is full.');
  }

  // try {
  //  await client.editChannelPermission(game.id, ctx.member.id, Permissions.FLAGS.VIEW_CHANNEL, 0, 1);
  // } catch (e) {
  //  return reply('Fatal error caught, called editChannelPermission\n```js\n' + e.stack + '\n```');
  // }
  if (game.isPrivate) {
    game.requests.push(ctx.member);

    client.createMessage(game.id, {
      content: `<@${game.host.id}>`,
      embeds: [
        {
          title: 'Game Request',
          description: `${ctx.member.mention} has requested to join the game.`,
          footer: {
            text: ctx.member.id
          },
          color: game.color
        }
      ],
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.BUTTON,
              label: 'Accept',
              custom_id: 'accept',
              style: ButtonStyle.PRIMARY,
              emoji: {
                name: '✅'
              }
            },
            {
              type: ComponentType.BUTTON,
              label: 'Decline',
              custom_id: 'decline',
              style: ButtonStyle.SECONDARY,
              emoji: {
                name: '❌'
              }
            }
          ]
        }
      ]
    });

    return reply('Your request has been sent.');
  } else {
    game.players.push(ctx.member);

    await client.editChannelPermission(game.id, ctx.member.id, Permissions.FLAGS.VIEW_CHANNEL, 0, 1);
    await ctx.edit(ctx.message.id, buildPost<MessageOptions>(game));

    await client.editMessage(channelID, gamePromptID, {
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.BUTTON,
              label: 'New Game',
              custom_id: 'new-game',
              style: ButtonStyle.PRIMARY,
              emoji: {
                name: '🎮'
              },
              disabled: false
            }
          ]
        }
      ]
    });

    await client.createMessage(game.id, {
      embeds: [
        {
          title: `${ctx.member.mention} has joined the game.`,
          thumbnail: {
            url: ctx.member.avatarURL
          },
          color: game.color
        }
      ]
    });
  }
};
