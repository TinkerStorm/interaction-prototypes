import { AdvancedMessageContent, Client as ErisClient } from 'eris';
import { ComponentType, ButtonStyle, ComponentContext } from 'slash-create';

import { games, lobbyChannels, buildPost } from '../util/game';

export default async (ctx: ComponentContext, client: ErisClient) => {
  const game = games.get(ctx.channelID);
  const lobbyChannelID = lobbyChannels.get(ctx.guildID)?.channelID;

  if (!game) {
    ctx.send('Unknown interaction origin...');
    return;
  }

  if (game.host.id !== ctx.member.id) {
    ctx.send('You are not the host of this game...');
    return;
  }

  game.isPrivate = !game.isPrivate;

  await client.editMessage(lobbyChannelID, game.postID, buildPost<AdvancedMessageContent>(game));

  await ctx.editParent({
    components: [
      {
        type: ComponentType.ACTION_ROW,
        components: [
          {
            type: ComponentType.BUTTON,
            label: 'Delete',
            custom_id: 'delete',
            style: ButtonStyle.SECONDARY,
            emoji: {
              name: '🗑'
            }
          },
          {
            type: ComponentType.BUTTON,
            label: `Set to ${game.isPrivate ? 'Public' : 'Private'}`,
            custom_id: 'toggle-access',
            style: game.isPrivate ? ButtonStyle.SUCCESS : ButtonStyle.DESTRUCTIVE,
            emoji: {
              name: game.isPrivate ? '🔓' : '🔒'
            }
          }
        ]
      }
    ]
  });

  await ctx.send(`Game is now **${game.isPrivate ? 'private 🔒' : 'public 🔓'}**`, { ephemeral: true });
};
