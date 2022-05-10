import { Client as ErisClient } from 'eris';
import { ButtonStyle, ComponentContext, ComponentType, Permissions } from 'slash-create';

import { games, lobbyChannels, buildPost } from '../util/game';

export default async (ctx: ComponentContext, client: ErisClient) => {
  const game = games.get(ctx.channelID);
  const { channelID, gamePromptID } = lobbyChannels.get(ctx.guildID);

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
  game.players.push(member);

  await client.editMessage(channelID, game.postID, buildPost(game) as any);
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

  // send message to user
  await client.getDMChannel(member.id).then((channel) => {
    return [
      channel.createMessage({
        embeds: [
          {
            title: 'Game Request Accepted',
            description: `Your request to join <#${game.id}> has been accepted.`,
            color: game.color
          }
        ]
      }),
      client.editChannelPermission(game.id, member.id, Permissions.FLAGS.VIEW_CHANNEL, 0, 1)
    ];
  });

  await client.createMessage(game.id, {
    embeds: [
      {
        title: `${member.nick || member.user.username} has joined the game.`,
        image: {
          url: member.avatarURL
        },
        color: game.color
      }
    ]
  });

  await ctx.delete(ctx.message.id);
};
