import { Client as ErisClient, Message, TextChannel } from 'eris';
import { ButtonStyle, ComponentButton, ComponentType, Member, MessageEmbedOptions, MessageOptions, Permissions, SlashCreator } from 'slash-create';

export interface IGame {
  title: string;
  id: string;
  players: Member[];
  readonly host: Member;
  requests: Member[];
  postID: string;
  color: number;
  isPrivate: boolean;
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
export const lobbyChannels = new Map<string, {
  channelID: string; // lobby channel
  gamePromptID: string; // new game message
}>();

export function createGame(host: Member): IGame {
  // ensure 'host' is not part of any other game
  for (const [, game] of games) {
    if (game.host.id === host.id) {
      for (const player of game.players) {
        if (player.id === host.id) {
          throw new Error('Host is already in a game.');
        }
      }
    }
  }

  const game: IGame = {
    id: null,
    postID: null,
    title: `${randomName()} ${randomName()}`,
    isPrivate: true,
    color: Math.floor(Math.random() * 0xffffff),
    requests: [],
    players: [host],
    get host() {
      return this.players[0];
    }
  };

  return game;
}

export function buildPost(game: IGame): MessageOptions {
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
    }, {
      type: ComponentType.BUTTON,
      label: 'Leave',
      custom_id: 'leave',
      disabled: players.length <= 1,
      style: ButtonStyle.DESTRUCTIVE,
      emoji: {
        name: '📤'
      }
    },
  ]

  return {
    content: ':satellite: **| A new game is starting!**',
    embeds: [embed],
    components: [
      {
        type: ComponentType.ACTION_ROW,
        components,
      }
    ]
  };
}

export function registerComponents(client: ErisClient, creator: SlashCreator) {
  client.on('messageCreate', async (msg: Message<TextChannel>) => {
    if (msg.content === '!game-prompt') {
      if (lobbyChannels.has(msg.channel.guild.id)) {
        return;
      }

      const message = await client.createMessage(msg.channel.id, {
        embeds: [{
          title: "Begin a new game",
          color: Math.round(0xffffff * Math.random()),
        }],
        components: [{
          type: ComponentType.ACTION_ROW,
          components: [{
            type: ComponentType.BUTTON,
            label: 'New Game',
            custom_id: 'new-game',
            style: ButtonStyle.PRIMARY,
            emoji: {
              name: '🎮'
            },
            disabled: false
          }]
        }]
      });

      lobbyChannels.set(msg.channel.guild.id, {
        channelID: msg.channel.id,
        gamePromptID: message.id
      });
    }
  })

  creator.registerGlobalComponent('new-game', async (ctx) => {
    const { channelID: lobbyChannelID, gamePromptID } = lobbyChannels.get(ctx.guildID);

    // ensure interaction is from the lobby channel
    if (ctx.channelID !== lobbyChannelID) {
      ctx.send('Unknown interaction origin...');
      return;
    }

    let game: IGame;
    try {
      game = createGame(ctx.member);
    } catch (e) {
      ctx.send(e.message, { ephemeral: true });
      return;
    }

    const channel = await client.createChannel(ctx.guildID, game.title, 0, {
      parentID: '924737174933495900',
      permissionOverwrites: [
        { type: 1, id: client.user.id, allow: 292058164304, deny: 0 },
        { type: 1, id: ctx.member.id, allow: Permissions.FLAGS.VIEW_CHANNEL, deny: 0 },
        { type: 0, id: ctx.guildID, allow: 0, deny: Permissions.FLAGS.VIEW_CHANNEL }
      ]
    });

    game.id = channel.id;
    game.postID = gamePromptID;

    games.set(game.id, game);

    const post = buildPost(game);

    ctx.edit(game.postID, post);

    await client.createMessage(channel.id, {
      embeds: [{
        title: "Delete this game?",
        color: game.color
      }],
      components: [{
        type: ComponentType.ACTION_ROW,
        components: [{
          type: ComponentType.BUTTON,
          label: 'Delete',
          custom_id: 'delete',
          style: ButtonStyle.DESTRUCTIVE,
          emoji: {
            name: '🗑'
          }
        }]
      }]
    })

    const message = await client.createMessage(ctx.channelID, {
      embeds: [{
        title: "Begin a new game",
        color: Math.round(0xffffff * Math.random()),
      }],
      components: [{
        type: ComponentType.ACTION_ROW,
        components: [{
          type: ComponentType.BUTTON,
          label: 'New Game',
          custom_id: 'new-game',
          style: ButtonStyle.PRIMARY,
          emoji: {
            name: '🎮'
          },
          disabled: true
        }]
      }]
    });

    lobbyChannels.set(ctx.guildID, {
      ...lobbyChannels.get(ctx.guildID),
      gamePromptID: message.id
    });

    creator.emit('debug', `Created new game '${game.title} (${game.id})', new message ${message.id}`);
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

    const channel = await client.getChannel(ctx.channelID);

    if (!channel) {
      ctx.send('Unknown interaction origin...');
      return;
    }

    game.isPrivate = !game.isPrivate;

    await client.editMessage(lobbyChannelID, game.postID, buildPost(game));

    await ctx.send(`Game is now ${game.isPrivate ? 'private' : 'public'}`, { ephemeral: true });
  });

  creator.registerGlobalComponent('delete', async ctx => {
    const game = games.get(ctx.channelID);
    const {channelID, gamePromptID} = lobbyChannels.get(ctx.guildID);

    if (!game) {
      ctx.send('You are not in a game', { ephemeral: true });
      return;
    }

    if (game.host.id !== ctx.member.id) {
      ctx.send('You are not the host of this game', { ephemeral: true });
      return;
    }

    await client.deleteMessage(channelID, game.postID);
    await client.deleteChannel(ctx.channelID);

    if (gamePromptID) {
      await client.editMessage(channelID, gamePromptID, {
        content: "",
        embeds: [],
        components: [{
          type: ComponentType.ACTION_ROW,
          components: [{
            type: ComponentType.BUTTON,
            label: 'New Game',
            custom_id: 'new-game',
            style: ButtonStyle.PRIMARY,
            emoji: {
              name: '🎮'
            },
            disabled: false
          }]
        }]
      })
    }

    games.delete(ctx.channelID);
  });

  creator.registerGlobalComponent('join', async (ctx) => {
    const {channelID, gamePromptID} = lobbyChannels.get(ctx.guildID);

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
    }

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

    //try {
    //  await client.editChannelPermission(game.id, ctx.member.id, Permissions.FLAGS.VIEW_CHANNEL, 0, 1);
    //} catch (e) {
    //  return reply('Fatal error caught, called editChannelPermission\n```js\n' + e.stack + '\n```');
    //}
    if (game.isPrivate) {
      game.requests.push(ctx.member);
      
      client.createMessage(game.id, {
        content: `<@${game.host.id}>`,
        embeds: [{
          title: 'Game Request',
          description: `${ctx.member.mention} has requested to join the game.`,
          footer: {
            text: ctx.member.id
          },
          color: game.color,
        }],
        components: [{
          type: ComponentType.ACTION_ROW,
          components: [{
            type: ComponentType.BUTTON,
            label: 'Accept',
            custom_id: 'accept',
            style: ButtonStyle.PRIMARY,
            emoji: {
              name: '✅'
            }
          }, {
            type: ComponentType.BUTTON,
            label: 'Decline',
            custom_id: 'decline',
            style: ButtonStyle.SECONDARY,
            emoji: {
              name: '❌'
            }
          }]
        }]
      });
    } else {
      game.players.push(ctx.member);

      ctx.edit(ctx.message.id, buildPost(game));
      client.editChannelPermission(game.id, ctx.member.id, Permissions.FLAGS.VIEW_CHANNEL, 0, 1)

      await client.editMessage(channelID, gamePromptID, {
        components: [{
          type: ComponentType.ACTION_ROW,
          components: [{
            type: ComponentType.BUTTON,
            label: 'New Game',
            custom_id: 'new-game',
            style: ButtonStyle.PRIMARY,
            emoji: {
              name: '🎮'
            },
            disabled: false
          }]
        }]
      });

      await client.createMessage(game.id, {
        embeds: [{
          title: `${ctx.member.nick || ctx.user.username} has joined the game.`,
          thumbnail: {
            url: ctx.member.avatarURL
          },
          color: game.color
        }]
      });
    }
  });

  creator.registerGlobalComponent('accept', async ctx => {
    const game = games.get(ctx.channelID);
    const {channelID, gamePromptID} = lobbyChannels.get(ctx.guildID);

    if (!game) {
      ctx.send('You are not in a game', { ephemeral: true });
      return;
    }

    if (game.host.id !== ctx.member.id) {
      ctx.send('You are not the host of this game', { ephemeral: true });
      return;
    }

    const index = game.requests.findIndex(p => p.id === ctx.message.embeds[0].footer.text);
    const [member] = game.requests.splice(index, 1);
    game.players.push(member);

    await client.editMessage(channelID, game.postID, buildPost(game));
    await client.editMessage(channelID, gamePromptID, {
      components: [{
        type: ComponentType.ACTION_ROW,
        components: [{
          type: ComponentType.BUTTON,
          label: 'New Game',
          custom_id: 'new-game',
          style: ButtonStyle.PRIMARY,
          emoji: {
            name: '🎮'
          },
          disabled: false
        }]
      }]
    });

    creator.emit('debug', `Accepted request for ${ctx.message.embeds[0].footer.text}`);

    // send message to user
    await client.getDMChannel(member.id).then(channel => {
      return [
        channel.createMessage({
          embeds: [{
            title: 'Game Request Accepted',
            description: `Your request to join <#${game.id}> has been accepted.`,
            color: game.color
          }]
        }),
        client.editChannelPermission(game.id, member.id, Permissions.FLAGS.VIEW_CHANNEL, 0, 1)
      ]
    });

    await client.createMessage(game.id, {
      embeds: [{
        title: `${member.nick || member.user.username} has joined the game.`,
        image: {
          url: member.avatarURL
        },
        color: game.color
      }]
    });
    await ctx.delete(ctx.message.id);
  });

  creator.registerGlobalComponent('decline', async ctx => {
    const game = games.get(ctx.channelID);

    if (!game) {
      ctx.send('You are not in a game', { ephemeral: true });
      return;
    }

    if (game.host.id !== ctx.member.id) {
      ctx.send('You are not the host of this game', { ephemeral: true });
      return;
    }

    const index = game.requests.findIndex(p => p.id === ctx.message.embeds[0].footer.text);
    const [member] = game.requests.splice(index, 1);

    // send message to user
    await client.getDMChannel(member.id).then(channel => {
      return channel.createMessage({
        embeds: [{
          title: 'Game Request Declined',
          description: `Your request to join the game '${game.title} (\`${game.id}\`)' has been declined.`,
          color: game.color
        }]
      });
    });

    await ctx.delete(ctx.message.id);
  })

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

    await client.deleteChannelPermission(game.id, ctx.member.id, "Leaving game lobby");

    await client.createMessage(game.id, {
      embeds: [{
        title: `${ctx.member.nick || ctx.user.username} has left the game.`,
        thumbnail: {
          url: ctx.member.avatarURL
        },
        color: game.color
      }]
    });

    if (game.players.length <= 1) {
      await client.editMessage(ctx.channelID, gamePromptID, {
        components: [{
          type: ComponentType.ACTION_ROW,
          components: [{
            type: ComponentType.BUTTON,
            label: 'New Game',
            custom_id: 'new-game',
            style: ButtonStyle.PRIMARY,
            emoji: {
              name: '🎮'
            },
            disabled: true
          }]
        }]
      });
    }
  });
}