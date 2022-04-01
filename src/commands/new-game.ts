import { Client } from 'eris';
import {
  SlashCommand,
  SlashCreator,
  CommandContext,
  ApplicationCommandType,
  Permissions,
  MessageOptions
} from 'slash-create';
import { IGame, randomName, buildPost } from '../util/game';

export default class NewGameCommand extends SlashCommand<Client> {
  get initialRoster() {
    return Array.from({ length: 3 }, () => ({
      name: '\u200b',
      value: '\u200b',
      inline: true
    })).slice();
  }

  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'new-game',
      description: 'Start a new game',
      type: ApplicationCommandType.CHAT_INPUT
    });
  }

  async run(ctx: CommandContext) {
    return 'This command has been forcefully disabled.\nPlease use the game roster instead.';
  }

  async _run(ctx: CommandContext) {
    if (!ctx.guildID) {
      return 'This command can only be used in a server.';
    }

    const game: IGame = {
      id: null,
      postID: null,
      requests: [],
      isPrivate: false,
      players: [ctx.member],
      color: Math.floor(Math.random() * 0xffffff),
      title: randomName(),
      log: [],
      // host: ctx.member, -- assumed from index 0
      get host() {
        return this.players[0];
      }
    };

    const channel = await this.client.createChannel(ctx.guildID, game.title, 0, {
      parentID: '924737174933495900',
      permissionOverwrites: [
        {
          type: 0,
          id: ctx.member.id,
          allow: Permissions.FLAGS.VIEW_CHANNEL | Permissions.FLAGS.SEND_MESSAGES,
          deny: 0
        }
      ]
    });

    game.id = channel.id;

    await ctx.send(buildPost<MessageOptions>(game));

    await ctx.fetch();

    ctx.registerComponentFrom(ctx.messageID, 'join', async (ctx) => {
      // check if the user is already in the game
      if (game.players.some((p) => p.id === ctx.member.id)) {
        return ctx.send('You are already in the game.', { ephemeral: true });
      }

      // check if the game is full
      if (game.players.length >= 15) {
        return ctx.send('The game is full.', { ephemeral: true });
      }

      // add the user to the game
      game.players.push(ctx.member);

      await ctx.send('You have joined the game.', {
        ephemeral: true
      });

      // update the game
      await ctx.edit(ctx.message.id, buildPost(game));
    });

    ctx.registerComponentFrom(ctx.messageID, 'leave', async (ctx) => {
      // check player is not the host
      if (game.players[0].id === ctx.member.id) {
        return ctx.send('You cannot leave the game as host.', { ephemeral: true });
      }

      // check if the user is already in the game
      if (!game.players.some((p) => p.id === ctx.member.id)) {
        return ctx.send('You are not in the game.', { ephemeral: true });
      }

      // remove the user from the game
      game.players.splice(game.players.indexOf(ctx.member), 1);

      await ctx.send('You have left the game.', {
        ephemeral: true
      });

      // update the game
      await ctx.edit(ctx.message.id, buildPost(game));
    });
  }
}
