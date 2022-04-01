import { channel } from 'diagnostics_channel';
import {
  CategoryChannel,
  Client as ErisClient,
  CommandInteraction,
  ComponentInteraction,
  GuildTextableChannel,
  Message,
  PingInteraction,
  TextChannel
} from 'eris';
import {
  AutocompleteContext,
  ButtonStyle,
  ComponentButton,
  ComponentType,
  InteractionType,
  Member,
  MessageEmbedOptions,
  MessageOptions,
  Permissions,
  SlashCreator,
  TextInputStyle
} from 'slash-create';
import { clone } from './common';

export interface IGame {
  title: string;
  id: string;
  players: Member[];
  readonly host: Member;
  requests: Member[];
  postID: string;
  color: number;
  isPrivate: boolean;
  log: Array<{ type: string; context: object }>;
}

const names = [
  'Alpha',
  'Bravo',
  'Charlie',
  'Delta',
  'Echo',
  'Foxtrot',
  'Golf',
  'Hotel',
  'India',
  'Juliet',
  'Kilo',
  'Lima',
  'Mike',
  'November',
  'Oscar',
  'Papa',
  'Quebec',
  'Romeo',
  'Sierra',
  'Tango',
  'Uniform',
  'Victor',
  'Whiskey',
  'X-ray',
  'Yankee',
  'Zulu'
];

export function randomName() {
  return names[Math.floor(Math.random() * names.length)];
}

export const games = new Map<string, IGame>();
// guildID -> channelID
export const lobbyChannels = new Map<
  string,
  {
    channelID: string; // lobby channel
    gamePromptID: string; // new game message
  }
>();

export function createGame(host: Member, lobbyName?: string): IGame {
  // ensure 'host' is not part of any other game
  for (const [, game] of games) {
    if (game.host.id === host.id) {
      for (const player of game.players) {
        if (player.id === host.id) {
          throw new Error(`You are already in a game (<#${game.id}>).`);
        }
      }
    }
  }

  const game: IGame = {
    id: null,
    postID: null,
    title: lobbyName || `${randomName()} ${randomName()}`,
    isPrivate: true,
    color: Math.floor(Math.random() * 0xffffff),
    requests: [],
    players: [host],
    log: [],
    get host() {
      return this.players[0];
    }
  };

  return game;
}

export function buildPost<T extends any>(game: IGame): T {
  const embed: MessageEmbedOptions = {
    title: game.title,
    footer: {
      text: game.id
    },
    description: `Game is **${game.isPrivate ? 'private' : 'public'}**.`,
    author: {
      name: game.host.nick || game.host.user.username,
      icon_url: game.host.avatarURL
    },
    color: game.color,
    fields: Array.from({ length: 3 }, () => {
      return { name: '\u200b', value: '\u200b', inline: true };
    })
  };

  const players = game.players.slice();

  embed.fields = players.reduce((fields, player, index) => {
    if (index === 0) {
      fields[0].name = `Roster (${players.length} / 15)`;
    }

    const fieldIndex = Math.floor(index / 3);
    fields[fieldIndex].value += `[\`${(index + 1).toString().padStart(2, '0')}\`] ${player.mention}\n`;

    return fields;
  }, embed.fields);

  const components: ComponentButton[] = [
    {
      type: ComponentType.BUTTON,
      label: 'Join',
      custom_id: 'join',
      disabled: players.length >= 15,
      style: ButtonStyle.PRIMARY,
      emoji: {
        name: '📥'
      }
    },
    {
      type: ComponentType.BUTTON,
      label: 'Leave',
      custom_id: 'leave',
      disabled: players.length <= 1,
      style: ButtonStyle.DESTRUCTIVE,
      emoji: {
        name: '📤'
      }
    }
  ];

  return {
    content: ':satellite: **| A new game is starting!**',
    embeds: [embed],
    components: [
      {
        type: ComponentType.ACTION_ROW,
        components
      }
    ]
  } as T;
}

export function registerComponents(client: ErisClient, creator: SlashCreator) {
  // creator.on('commandRun', async (_, promise, ctx) => {
  //  await promise;
  //  if (games.has(ctx.channelID)) {
  //    const game = games.get(ctx.channelID);
  //    game.log.push({
  //      type: 'interaction',
  //      context: ctx
  //    });
  //  }
  // });

  // client.on('interactionCreate', (interaction) => {
  //  if (interaction instanceof PingInteraction || interaction instanceof AutocompleteContext) {
  //    return;
  //  }

  //  interaction = interaction as CommandInteraction | ComponentInteraction;

  //  if (games.has(interaction.channel.id)) {
  //    const game = games.get(interaction.channel.id);
  //    game.log.push({
  //      type: 'interaction:' + InteractionType[interaction.type],
  //      context: clone(interaction)
  //    });
  //  }
  // })

  // creator.on('componentInteraction', (ctx) => {
  //  if (games.has(ctx.channelID)) {
  //    const game = games.get(ctx.channelID);
  //    game.log.push({
  //      type: 'interaction',
  //      context: clone(ctx)
  //    });
  //  }
  // });

  // client.on('messageDelete', msg => {
  //  creator.emit('debug', `Message deleted: ${msg.id}`);
  //  if (games.has(msg.channel.id)) {
  //    const game = games.get(msg.channel.id);
  //    game.log.push({
  //      type: 'messageDelete',
  //      context: new Message<TextChannel>(msg as BaseData, client).toJSON()
  //    });
  //  }
  // });

  // client.on('messageUpdate', (newMsg) => {
  //  if (games.has(newMsg.channel.id)) {
  //    const game = games.get(newMsg.channel.id);
  //    game.log.push({
  //      type: 'messageUpdate',
  //      context: newMsg
  //    });
  //  }
  // })

  client.on('messageCreate', async (msg: Message<TextChannel>) => {
    // add the message to the game log
    if (games.has(msg.channel.id)) {
      const game = games.get(msg.channel.id);
      game.log.push({ type: 'messageCreate', context: msg });
      creator.emit('debug', `Pushed messageCreate for ${msg.id} to game ${game.id}`);
    }

    if (msg.content === '!game-prompt') {
      client.deleteMessage(msg.channel.id, msg.id);

      if (lobbyChannels.has(msg.channel.guild.id)) {
        return;
      }

      const message = await client.createMessage(msg.channel.id, {
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

      lobbyChannels.set(msg.channel.guild.id, {
        channelID: msg.channel.id,
        gamePromptID: message.id
      });
    }
  });

  creator.registerGlobalComponent('new-game', async (ctx) => {
    const { channelID: lobbyChannelID, gamePromptID } = lobbyChannels.get(ctx.guildID);

    // ensure interaction is from the lobby channel
    if (ctx.channelID !== lobbyChannelID) {
      ctx.send('Unknown interaction origin...');
      return;
    }

    ctx.sendModal(
      {
        title: 'New Game',
        components: [
          {
            type: ComponentType.ACTION_ROW,
            components: [
              {
                type: ComponentType.TEXT_INPUT,
                label: 'Lobby Name',
                custom_id: 'lobby_name',
                placeholder: `Lobby Channel Name`,
                style: TextInputStyle.SHORT,
                max_length: 100,
                value: `${randomName()} ${randomName()}`
              }
            ]
          }
        ]
      },
      async (modalCtx) => {
        modalCtx.defer(true);

        let game: IGame;
        try {
          game = createGame(ctx.member, modalCtx.values.lobby_name || `${randomName()} ${randomName()}`);
        } catch (e) {
          modalCtx.send(e.message, { ephemeral: true });
          return;
        }

        // const parentPermissions = (client.getChannel('924737174933495900') as CategoryChannel).permissionOverwrites.values();

        const channel = await client.createChannel(ctx.guildID, game.title, 0, {
          parentID: '924737174933495900',
          permissionOverwrites: [
            // ...parentPermissions,
            { type: 1, id: client.user.id, allow: 292058164304, deny: 0 },
            { type: 1, id: ctx.member.id, allow: Permissions.FLAGS.VIEW_CHANNEL, deny: 0 },
            { type: 0, id: ctx.guildID, allow: 0, deny: Permissions.FLAGS.VIEW_CHANNEL }
          ]
        });

        game.id = channel.id;
        game.postID = gamePromptID;

        games.set(game.id, game);

        const post = buildPost(game);

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
                  custom_id: 'delete',
                  style: ButtonStyle.SECONDARY,
                  emoji: {
                    name: '🗑'
                  }
                },
                {
                  type: ComponentType.BUTTON,
                  label: 'Set to Public',
                  custom_id: 'toggle-access',
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
                  custom_id: 'new-game',
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

        game.log.push({
          type: 'game:create',
          context: {
            channelID: channel.id,
            postID: message.id,
            hostID: ctx.member.id,
            createdAt: channel.createdAt,
            title: game.title
          }
        });

        creator.emit('debug', `Created new game '${game.title} (${game.id})', new message ${message.id}`);
      }
    );
  });

  creator.registerGlobalComponent('toggle-access', async (ctx) => {
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

    await client.editMessage(lobbyChannelID, game.postID, buildPost(game) as any);

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
  });

  creator.registerGlobalComponent('delete', async (ctx) => {
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

    const serializedLog = JSON.stringify(game.log, null, 2);

    client.createMessage(
      channelID,
      {
        embeds: [
          {
            title: `Message log upload for ${game.title} (${game.id})`,
            color: game.color
          }
        ]
      },
      {
        file: Buffer.from(serializedLog),
        name: `${game.title}.json`
      }
    );

    games.delete(ctx.channelID);

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
  });

  creator.registerGlobalComponent('join', async (ctx) => {
    const { channelID, gamePromptID } = lobbyChannels.get(ctx.guildID);

    // ensure interaction is from the lobby channel
    if (ctx.channelID !== channelID) {
      ctx.send('Unknown interaction origin...');
      return;
    }

    const game = games.get(ctx.message.embeds[0].footer.text);

    const reply = (options: MessageOptions | string) => {
      if (typeof options === 'string') {
        options = { content: options };
      }

      ctx.send({ ...options, ephemeral: true });
    };

    if (!game) {
      return reply('There is no game in progress.');
    }

    if (game.players.some((p) => p.id === ctx.member.id)) {
      return reply('You are already in the game.');
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
    } else {
      game.players.push(ctx.member);

      await client.editChannelPermission(game.id, ctx.member.id, Permissions.FLAGS.VIEW_CHANNEL, 0, 1);
      await ctx.edit(ctx.message.id, buildPost(game));

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
            title: `${ctx.member.nick || ctx.user.username} has joined the game.`,
            thumbnail: {
              url: ctx.member.avatarURL
            },
            color: game.color
          }
        ]
      });
    }
  });

  creator.registerGlobalComponent('accept', async (ctx) => {
    const game = games.get(ctx.channelID);
    const { channelID, gamePromptID } = lobbyChannels.get(ctx.guildID);

    if (!game) {
      ctx.send('You are not in a game', { ephemeral: true });
      return;
    }

    if (game.host.id !== ctx.member.id) {
      ctx.send('You are not the host of this game', { ephemeral: true });
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

    creator.emit('debug', `Accepted request for ${ctx.message.embeds[0].footer.text}`);

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
  });

  creator.registerGlobalComponent('decline', async (ctx) => {
    const game = games.get(ctx.channelID);

    if (!game) {
      ctx.send('You are not in a game', { ephemeral: true });
      return;
    }

    if (game.host.id !== ctx.member.id) {
      ctx.send('You are not the host of this game', { ephemeral: true });
      return;
    }

    const index = game.requests.findIndex((p) => p.id === ctx.message.embeds[0].footer.text);
    const [member] = game.requests.splice(index, 1);

    // send message to user
    await client.getDMChannel(member.id).then((channel) => {
      return channel.createMessage({
        embeds: [
          {
            title: 'Game Request Declined',
            description: `Your request to join the game '${game.title} (\`${game.id}\`)' has been declined.`,
            color: game.color
          }
        ]
      });
    });

    await ctx.delete(ctx.message.id);
  });

  creator.registerGlobalComponent('leave', async (ctx) => {
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

    await ctx.edit(ctx.message.id, buildPost(game));

    reply('You have left the game.');

    await client.deleteChannelPermission(game.id, ctx.member.id, 'Leaving game lobby');

    await client.createMessage(game.id, {
      embeds: [
        {
          title: `${ctx.member.nick || ctx.user.username} has left the game.`,
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
                custom_id: 'new-game',
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
  });
}
