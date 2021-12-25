import {
  SlashCommand,
  SlashCreator,
  CommandContext,
  ComponentType,
  ButtonStyle,
  MessageOptions,
  ApplicationCommandType,
  Member
} from 'slash-create';

export default class HelloCommand extends SlashCommand {
  names = [
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

  randomName() {
    return this.names[Math.floor(Math.random() * this.names.length)];
  }

  buildPost(players: Member[], title: string): MessageOptions {
    // index 0 of players is assumed to be the host
    const host = players[0];

    return {
      content: ':satellite: **| A new game is starting!**',
      embeds: [
        {
          title,
          author: {
            name: host.nick || host.user.username,
            icon_url: host.avatarURL
          },
          fields: players.reduce((fields, player, index) => {
            if (index === 0) {
              fields[0].name = `Roster (${players.length} / 15)`;
            }

            const fieldIndex = Math.floor(index / 3);

            fields[fieldIndex].value += `[\`${(index + 1).toString().padStart(2, '0')}\`] ${player.mention}\n`;

            return fields;
          }, this.initialRoster)
        }
      ],
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
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
          ]
        }
      ]
    };
  }

  async run(ctx: CommandContext) {
    if (!ctx.guildID) {
      return 'This command can only be used in a server.';
    }

    const players = [ctx.member];

    const title = `${this.randomName()} ${this.randomName()}`;

    await ctx.send(this.buildPost(players, title));

    await ctx.fetch();

    ctx.registerComponentFrom(ctx.messageID, 'join', async (ctx) => {
      // check if the user is already in the game
      if (players.some((p) => p.id === ctx.member.id)) {
        return ctx.send('You are already in the game.', { ephemeral: true });
      }

      // check if the game is full
      if (players.length >= 15) {
        return ctx.send('The game is full.', { ephemeral: true });
      }

      // add the user to the game
      players.push(ctx.member);

      await ctx.send('You have joined the game.', {
        ephemeral: true
      });

      // update the game
      await ctx.edit(ctx.message.id, this.buildPost(players, title));
    });

    ctx.registerComponentFrom(ctx.messageID, 'leave', async (ctx) => {
      // check player is not the host
      if (players[0].id === ctx.member.id) {
        return ctx.send('You cannot leave the game as host.', { ephemeral: true });
      }

      // check if the user is already in the game
      if (!players.some((p) => p.id === ctx.member.id)) {
        return ctx.send('You are not in the game.', { ephemeral: true });
      }

      // remove the user from the game
      players.splice(players.indexOf(ctx.member), 1);

      await ctx.send('You have left the game.', {
        ephemeral: true
      });

      // update the game
      await ctx.edit(ctx.message.id, this.buildPost(players, title));
    });
  }
}
