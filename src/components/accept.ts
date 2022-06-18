import { AdvancedMessageContentEdit, Client as ErisClient } from 'eris';
import { ButtonStyle, ComponentContext, ComponentType } from 'slash-create';

import { ComponentKeys } from './index';
import { undi } from '../util/common';
import { games, lobbyChannels, buildPost } from '../util/game';
import { playerPermissions } from '../util/permissions';

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

  await client.editMessage(channelID, game.postID, buildPost<AdvancedMessageContentEdit>(game));

  await client.editMessage(channelID, gamePromptID, {
    components: [
      {
        type: ComponentType.ACTION_ROW,
        components: [
          {
            type: ComponentType.BUTTON,
            label: 'New Game',
            custom_id: ComponentKeys.NEW_GAME,
            style: ButtonStyle.PRIMARY,
            emoji: { name: '🎮' },
            disabled: false
          }
        ]
      }
    ]
  });

  try {
    await client.getDMChannel(member.id).then((channel) =>
      channel.createMessage({
        embeds: [
          {
            title: 'Game Request Accepted',
            description: `Your request to join <#${game.id}> has been accepted.`,
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

  await client.editChannelPermission(game.id, member.id, playerPermissions.bitfield, 0, 1);

  await client.createMessage(game.id, {
    embeds: [
      {
        title: `${member.displayName} has joined the game.`,
        image: { url: member.avatarURL },
        color: game.color
      }
    ]
  });

  await ctx.delete(ctx.message.id);
};
