import { CategoryChannel, Client as ErisClient } from 'eris';
import {
  ComponentContext,
  Permissions,
  ComponentType,
  ModalOptions,
  TextInputStyle,
  ButtonStyle,
  MessageOptions
} from 'slash-create';

import { pickPhonetic } from '../util/fakerExtended';
import { buildPost, createGame, games, IGame, lobbyChannels } from '../util/game';
import { managerPermissions, observerPermissions } from '../util/permissions';

const createModalOptions = (): ModalOptions => ({
  title: 'New Game',
  components: [
    {
      type: ComponentType.ACTION_ROW,
      components: [
        {
          type: ComponentType.TEXT_INPUT,
          label: 'Lobby Name',
          custom_id: 'lobby_name',
          placeholder: 'Enter a lobby name',
          style: TextInputStyle.SHORT,
          max_length: 100,
          value: `${pickPhonetic()} ${pickPhonetic()}`
        }
      ]
    }
  ]
});

export default async (ctx: ComponentContext, client: ErisClient) => {
  const { channelID: lobbyChannelID, gamePromptID, categoryID } = lobbyChannels.get(ctx.guildID);

  if (ctx.channelID !== lobbyChannelID) {
    ctx.send('Unknown interaction origin.', { ephemeral: true });
    return;
  }

  ctx.sendModal(createModalOptions(), async (modalCtx) => {
    modalCtx.defer(true);

    let game: IGame;
    try {
      game = createGame(ctx.member, modalCtx.values.lobby_name || `${pickPhonetic()} ${pickPhonetic()}`);
    } catch (e) {
      modalCtx.send(e.message, { ephemeral: true });
      return;
    }

    const categoryChannel = client.getChannel(categoryID) as CategoryChannel;

    const channel = await client.createChannel(ctx.guildID, game.title, 0, {
      parentID: categoryID,
      permissionOverwrites: [
        ...categoryChannel.permissionOverwrites.map(({ id, type }) => ({
          id,
          type,
          allow: observerPermissions.bitfield,
          deny: 0n
        })),
        { type: 1, id: client.user.id, allow: managerPermissions.bitfield, deny: 0 },
        { type: 1, id: ctx.member.id, allow: Permissions.FLAGS.VIEW_CHANNEL, deny: 0 },
        { type: 0, id: ctx.guildID, allow: 0, deny: Permissions.FLAGS.VIEW_CHANNEL }
      ]
    });

    game.id = channel.id;
    game.postID = gamePromptID;

    games.set(game.id, game);

    const post = buildPost<MessageOptions>(game);

    await ctx.edit(game.postID, post);

    await modalCtx.send(`Created game <#${channel.id}>`, { ephemeral: true });

    await client.createMessage(channel.id, {
      embeds: [
        {
          title: 'Delete this game?',
          color: game.color
        }
      ],
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.BUTTON,
              label: 'Delete',
              custom_id: ComponentKeys.DELETE,
              style: ButtonStyle.SECONDARY,
              emoji: {
                name: '🗑'
              }
            },
            {
              type: ComponentType.BUTTON,
              label: 'Set to Public',
              custom_id: ComponentKeys.TOGGLE_ACCESS,
              style: ButtonStyle.SUCCESS,
              emoji: {
                name: '🔓'
              }
              // game is certain to be public upon initial creation
            }
          ]
        }
      ]
    });

    const message = await client.createMessage(ctx.channelID, {
      embeds: [
        {
          title: 'Begin a new game',
          color: Math.round(0xffffff * Math.random())
        }
      ],
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

    lobbyChannels.set(modalCtx.guildID, {
      ...lobbyChannels.get(modalCtx.guildID),
      gamePromptID: message.id
    });

    // game.log.push({
    //  type: 'game:create',
    //  context: {
    //    channelID: channel.id,
    //    postID: message.id,
    //    hostID: ctx.member.id,
    //    createdAt: channel.createdAt,
    //    title: game.title
    //  }
    // });

    ctx.creator.emit('debug', `Created new game '${game.title} (${game.id})', new message ${message.id}`);
  });
};
