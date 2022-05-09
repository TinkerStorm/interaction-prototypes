import { AdvancedMessageContent, Client as ErisClient } from 'eris';
import { ComponentContext, ComponentType, ButtonStyle } from 'slash-create';
import { keyFilter } from '../util/common';

import { games, IGame, lobbyChannels } from '../util/game';
import { FileAttachment } from '../util/types';

const createFileEmbed = (game: IGame): AdvancedMessageContent => ({
  embeds: [
    {
      title: `Message log upload for ${game.title} (${game.id})`,
      color: game.color
    }
  ]
});

const serializeGameLog = (game: IGame): FileAttachment => ({
  name: `${game.title}-${game.id}.json`,
  file: Buffer.from(JSON.stringify(game.log, keyFilter, 2))
});

export default async (ctx: ComponentContext, client: ErisClient) => {
  const game = games.get(ctx.channelID);
  const { channelID, gamePromptID } = lobbyChannels.get(ctx.guildID);

  if (!game) {
    ctx.send('You are not in a game', { ephemeral: true });
    return;
  }

  if (game.host.id !== ctx.member.id) {
    ctx.send('You are not the host of this game', { ephemeral: true });
    // game.log.push({ type: "interaction: delete-game", context: clone(ctx) });
    return;
  }

  await client.deleteMessage(channelID, game.postID);
  await client.deleteChannel(ctx.channelID);

  // await client.createMessage(
  //  channelID,
  //  createFileEmbed(game),
  //  serializeGameLog(game)
  // );

  if (gamePromptID) {
    await client.editMessage(channelID, gamePromptID, {
      content: '',
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
  }

  games.delete(ctx.channelID);
};
