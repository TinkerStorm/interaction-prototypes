import { Client as ErisClient } from "eris";
import { ApplicationCommandType, ButtonStyle, CommandContext, ComponentType, MessageInteractionContext, MessageOptions, SlashCommand, SlashCreator } from "slash-create";

import { buildPost, games, IGame, lobbyChannels } from "../util/game";

export default class GameConfig extends SlashCommand<ErisClient> {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: "game-config",
      description: "Configure a game",
      type: ApplicationCommandType.CHAT_INPUT
    });
  }

  async run(ctx: CommandContext) {
    const game = games.get(ctx.channelID);

    if (!game) {
      return "This command can only be used in a game channel.";
    }

    if (game.host.id !== ctx.member.id) {
      return "Only the host can configure a game.";
    }

    // game.isPrivate
    // game.
    await ctx.defer(true);
    await ctx.send(this.buildConfigView(ctx, game), { ephemeral: true });

    ctx.registerComponent("toggle-private", ctx => {
      game.isPrivate = !game.isPrivate;
      ctx.edit(ctx.message.id, this.buildConfigView(ctx, game));

      ctx.sendFollowUp("Game is now " + (game.isPrivate ? "Private" : "Public"), { ephemeral: true });

      const { channelID } = lobbyChannels.get(ctx.guildID);
      this.client.editMessage(channelID, game.postID, buildPost(game));
    });
  }

  buildConfigView(ctx: MessageInteractionContext, game: IGame): MessageOptions {
    return {
      components: [{
        type: ComponentType.ACTION_ROW,
        components: [{
          type: ComponentType.BUTTON,
          label: "Set to " + (game.isPrivate ? "Public" : "Private"),
          custom_id: "toggle-private",
          style: ButtonStyle.SECONDARY,
          emoji: {
            name: game.isPrivate ? "🔓" : "🔒"
          }
        }]
      }],
      embeds: [{
        title: "Game Configuration for " + game.title,
        fields: [
          {
            name: "Private Game",
            value: game.isPrivate ? "Yes" : "No",
            inline: true
          },
          {
            name: "Requests",
            value: game.requests.length.toString(),
            inline: true
          },
          {
            name: "Players",
            value: game.players.length.toString(),
            inline: true
          },
          {
            name: "Host",
            value: game.host.nick || game.host.user.username,
            inline: true
          }
        ]
      }]
    };
  }
}