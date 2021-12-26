import { Client as ErisClient } from 'eris';
import { ButtonStyle, ComponentType, Member, MessageEmbedOptions, MessageOptions, Permissions, SlashCreator } from 'slash-create';

export interface IGame {
  title: string;
  id: string;
  players: Member[];
  readonly host: Member;
  color: number;
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

const games = new Map<string, IGame>();

export function createGame(host: Member): IGame {
  // ensure 'host' is not part of any other game
  games.forEach(game => {
    if (game.host.id === host.id) {
      game.players.forEach(player => {
        if (player.id === host.id) {
          throw new Error('Host is already in a game');
        }
      });
    }
  });

  const game: IGame = {
    id: null,
    title: randomName(),
    color: Math.floor(Math.random() * 0xffffff),
    players: [host],
    get host() {
      return this.players[0];
    }
  };

  games.set(host.id, game);

  return game;
}

export function buildPost(game: IGame) {
  const embed: MessageEmbedOptions = {
    title: game.title,
    footer: {
      text: game.id
    },
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

  const components = [
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
  } as MessageOptions;
}

export function registerComponents(client: ErisClient, creator: SlashCreator) {
  let newGameMessage: string = null;

  client.on('messageCreate', async msg => {
    if (msg.content.startsWith('$msg-id')) {
      client.createMessage(msg.channel.id, newGameMessage);
    }

    if (msg.content === '!game-prompt') {
      if (newGameMessage) {
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

      newGameMessage = message.id;
    }
  })

  creator.registerGlobalComponent('new-game', async (ctx) => {
    console.log('new game', newGameMessage);

    let game;
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

    games[game.id] = game;

    const post = buildPost(game);

    ctx.edit(newGameMessage, post);

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

    newGameMessage = message.id;

    creator.emit('debug', `Created new game ${game.id}, new message ${newGameMessage}`);
  });

  creator.registerGlobalComponent('join', async (ctx) => {
    const game = games[ctx.message.embeds[0].footer.text];

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

    if (game.players.length >= 15) {
      return reply('The game is full.');
    }

    try {
      await client.editChannelPermission(game.id, ctx.member.id, Permissions.FLAGS.VIEW_CHANNEL, 0, 1);
    } catch (e) {
      return reply('Fatal error caught, called editChannelPermission\n```js\n' + e.stack + '\n```');
    }

    game.players.push(ctx.member);

    if (game.players.length > 1) {
      await client.editMessage(ctx.channelID, newGameMessage, {
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
    }

    await ctx.edit(ctx.message.id, buildPost(game));
  });

  creator.registerGlobalComponent('leave', async (ctx) => {
    await ctx.acknowledge();

    const reply = (options: MessageOptions | string) => {
      if (typeof options === 'string') {
        options = { content: options };
      }

      ctx.send({ ...options, ephemeral: true });
    };

    const game = games[ctx.message.embeds[0].footer.text];

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

    if (game.players.length < 1) {
      await client.editMessage(ctx.channelID, newGameMessage, {
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
    }
  });
}