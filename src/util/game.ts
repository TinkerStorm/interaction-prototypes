import { Client as ErisClient, Message, TextChannel } from 'eris';
import { ButtonStyle, ComponentButton, ComponentType, Member, MessageEmbedOptions, SlashCreator } from 'slash-create';

import { pickPhonetic } from './fakerExtended';
import { LobbyOptions } from './types';

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

export const games = new Map<string, IGame>();
export const lobbyChannels = new Map<string, LobbyOptions>();

export function createGame(host: Member, lobbyName?: string): IGame {
  // ensure 'host' is not part of any other game
  for (const { id, players } of games.values()) {
    if (players.some(({ id: playerID }) => playerID === host.id)) {
      throw new Error(`You are already in a game (<#${id}>).`);
    }
  }

  const game: IGame = {
    id: null,
    postID: null,
    title: lobbyName || `${pickPhonetic()} ${pickPhonetic()}`,
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
  });
}
