import { CategoryChannel, Client, TextChannel } from 'eris';
import {
  ButtonStyle,
  ChannelType,
  CommandContext,
  CommandOptionType,
  ComponentContext,
  ComponentType,
  MessageOptions,
  ModalSendableContext,
  SlashCommand,
  SlashCreator
} from 'slash-create';

import { checkPermissions, undi } from '../util/common';
import { lobbyChannels } from '../util/game';
import { allChannelPermissions } from '../util/permissions';
import { LobbyOptions, SetupOptions } from '../util/types';

export default class SetupCommand extends SlashCommand<Client> {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'setup',
      description: 'Setup the game handler for the current guild.',
      dmPermission: false,
      requiredPermissions: ['MANAGE_GUILD', 'MANAGE_CHANNELS', 'MANAGE_ROLES'],
      options: [
        {
          name: 'lobby_channel',
          description: 'The channel to use for the lobby posts.',
          type: CommandOptionType.CHANNEL,
          required: true,
          channel_types: [ChannelType.GUILD_TEXT]
        },
        {
          name: 'lobby_category',
          description: 'The category to use for hosting game lobbies.',
          type: CommandOptionType.CHANNEL,
          required: true,
          channel_types: [ChannelType.GUILD_CATEGORY]
        },
        {
          name: 'skip_confirm',
          description: 'Skip the confirmation prompt.',
          type: CommandOptionType.BOOLEAN,
          required: false
        }
      ]
    });
  }

  getConfirmMessage(options: SetupOptions, previousOptions?: LobbyOptions): MessageOptions {
    const getChannelFormat = (newChannel: string, oldChannel: string) =>
      `${oldChannel ? `<#${oldChannel}> (${oldChannel})` : 'None'} → <#${newChannel}> (${newChannel})`;

    return {
      embeds: [
        {
          title: 'Setup Confirmation',
          description: 'Are you sure you want to setup the game handler for this guild?',
          color: 0x00ff00,
          fields: [
            {
              name: 'Lobby Channel',
              value: getChannelFormat(options.lobby_channel, previousOptions?.channelID)
            },
            {
              name: 'Lobby Category',
              value: getChannelFormat(options.lobby_category, previousOptions?.categoryID)
            }
          ]
        }
      ],
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.BUTTON,
              style: ButtonStyle.PRIMARY,
              label: 'Yes',
              custom_id: 'yes'
            },
            {
              type: ComponentType.BUTTON,
              style: ButtonStyle.SECONDARY,
              label: 'No',
              custom_id: 'no'
            }
          ]
        }
      ]
    };
  }

  async run(ctx: CommandContext) {
    const lobbyOptions = lobbyChannels.get(ctx.guildID);

    const response = (ctx.options.skip_confirm as boolean)
      ? { content: 'Setting up game handler...' }
      : this.getConfirmMessage(ctx.options as SetupOptions, lobbyOptions);

    await ctx.send({ ...response, ephemeral: true });

    await ctx.fetch();

    this.creator.emit('debug', `Sent response to ${ctx.user.id} on ${ctx.messageID}`);

    if (!ctx.options.skip_confirm as boolean) {
      const callback = async (bCtx: ComponentContext) => {
        ctx.unregisterWildcardComponent(ctx.messageID);
        if (bCtx.customID === 'yes') await this.setupLobbyHandler(bCtx, ctx.options as SetupOptions);
        else {
          // clear message content
          await bCtx.editParent({
            content: 'Cancelled setup.',
            components: [],
            embeds: []
          });
        }
      };

      const onExpired = () => {
        const { user, channelID, guildID } = ctx;
        this.creator.emit(
          'warn',
          `Confirm dialog timed out after 15 minutes for ${undi(user)}) in ${guildID}-${channelID}`
        );
      };

      ctx.registerWildcardComponent(ctx.messageID, callback, 15 * 1000 * 60, onExpired);
      this.creator.emit('debug', `Registered confirm dialog for ${ctx.messageID}`);
      return;
    }

    await this.setupLobbyHandler(ctx, ctx.options as SetupOptions);
  }

  async setupLobbyHandler(ctx: ModalSendableContext, options: SetupOptions) {
    this.creator.emit('debug', `Setting up lobby handler for ${ctx.guildID}`);
    // type assurance with options from the command
    const lobbyChannel = this.client.getChannel(options.lobby_channel) as TextChannel;
    const lobbyCategory = this.client.getChannel(options.lobby_category) as CategoryChannel;

    try {
      checkPermissions({
        channelEntity: lobbyChannel,
        targetID: this.client.user.id,
        permissions: allChannelPermissions,
        action: 'lobby channel'
      });

      checkPermissions({
        channelEntity: lobbyCategory,
        targetID: this.client.user.id,
        permissions: allChannelPermissions,
        action: 'lobby category'
      });
    } catch (err) {
      await ctx.send(err.message || JSON.stringify(err), { ephemeral: true });
      return;
    }

    const message = await lobbyChannel.createMessage({
      embeds: [
        {
          title: 'Begin a new game',
          color: Math.floor(Math.random() * 16777215)
        }
      ],
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

    lobbyChannels.set(ctx.guildID, {
      channelID: lobbyChannel.id,
      categoryID: lobbyCategory.id,
      gamePromptID: message.id
    });

    await ctx.editOriginal({
      embeds: [],
      components: [],
      content: [
        `**Game handler setup complete.**`,
        `> Lobby channel: ${lobbyChannel.mention}`,
        `> Lobby category: ${lobbyCategory.mention}`
      ].join('\n')
    });
  }
}
